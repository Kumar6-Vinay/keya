/** Optional cloud backup to the family's Supabase project, using its REST API directly (no extra library).
 *  Off unless VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set at build time. Tables: supabase/schema.sql. */
import type { Family } from "./store";

const URL_ = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const TOKEN_KEY = "keya.cloud.v1";

export const cloudConfigured = () => !!(URL_ && KEY);

interface Tok { access_token: string; refresh_token: string; expires_at: number; user_id: string; email: string }

const read = (): Tok | null => { try { return JSON.parse(localStorage.getItem(TOKEN_KEY) || "null"); } catch { return null; } };
const write = (t: Tok | null) => { try { t ? localStorage.setItem(TOKEN_KEY, JSON.stringify(t)) : localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ } };
export const cloudUser = () => read()?.email ?? null;
export const signOut = () => write(null);

async function call(path: string, init: RequestInit & { token?: string } = {}) {
  const r = await fetch(`${URL_}${path}`, {
    ...init,
    headers: { apikey: KEY!, "Content-Type": "application/json", ...(init.token ? { Authorization: `Bearer ${init.token}` } : {}), ...(init.headers || {}) },
  });
  if (!r.ok) throw new Error(`${r.status} ${await r.text().catch(() => "")}`.slice(0, 200));
  return r.status === 204 ? null : r.json().catch(() => null);
}

/** Step 1: email a one-time code to the parent. */
export const sendCode = (email: string) => call("/auth/v1/otp", { method: "POST", body: JSON.stringify({ email, create_user: true }) });

/** Step 2: exchange the code for a session. */
export async function verifyCode(email: string, token: string) {
  const s = await call("/auth/v1/verify", { method: "POST", body: JSON.stringify({ type: "email", email, token }) });
  write({ access_token: s.access_token, refresh_token: s.refresh_token, expires_at: Date.now() / 1000 + s.expires_in, user_id: s.user.id, email });
}

async function token(): Promise<Tok> {
  const t = read();
  if (!t) throw new Error("Not signed in");
  if (t.expires_at - 60 > Date.now() / 1000) return t;
  const s = await call("/auth/v1/token?grant_type=refresh_token", { method: "POST", body: JSON.stringify({ refresh_token: t.refresh_token }) });
  const n = { ...t, access_token: s.access_token, refresh_token: s.refresh_token, expires_at: Date.now() / 1000 + s.expires_in };
  write(n);
  return n;
}

const upsert = (tk: string, table: string, rows: object[], onConflict: string) =>
  rows.length ? call(`/rest/v1/${table}?on_conflict=${onConflict}`, { method: "POST", token: tk, headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify(rows) }) : null;

/** Copy everything on the phone to the cloud. Children deleted on the phone are deleted in the cloud too. */
export async function backup(f: Family) {
  const t = await token(), tk = t.access_token, fam = t.user_id;
  await upsert(tk, "families", [{ id: fam, consent_at: f.consentAt, consent_notice: f.consentNotice, tz: f.tz, limit_min: f.limitMin }], "id");
  const keep = f.children.map(c => c.id);
  await call(`/rest/v1/children?family_id=eq.${fam}${keep.length ? `&id=not.in.(${keep.join(",")})` : ""}`, { method: "DELETE", token: tk });
  await upsert(tk, "children", f.children.map(c => ({ id: c.id, family_id: fam, nickname: c.nickname, cls: c.cls, lang: c.lang, avatar: c.avatar, open_classes: c.openClasses })), "id");
  for (const c of f.children) {
    await upsert(tk, "skill_state", Object.entries(c.learner.skills).map(([skill_id, r]) => ({ child_id: c.id, skill_id, state: r.state, p_known: r.p, next_review: r.nextReview, review_step: r.reviewStep, mastered_on: r.masteredOn, updated_on: r.lastDay })), "child_id,skill_id");
    await call(`/rest/v1/misconceptions?child_id=eq.${c.id}`, { method: "DELETE", token: tk });
    await upsert(tk, "misconceptions", Object.values(c.learner.misconceptions).map(m => ({ child_id: c.id, skill_id: m.skill, mistake: m.mistake, items_seen: m.items.length, first_seen: m.firstSeen, last_seen: m.lastSeen })), "child_id,skill_id,mistake");
    await upsert(tk, "sessions", c.sessions.map(s => ({ id: s.id, child_id: c.id, day: s.date, game: s.game, minutes: s.minutes, items: s.items, alone: s.alone, grown: s.grown })), "id");
    await upsert(tk, "attempts", c.sessions.flatMap(s => s.attempts.map((a, i) => ({ session_id: s.id, n: i, child_id: c.id, skill_id: a.skill, correct: a.correct, hint: a.hint, mistake: a.mistake ?? null, phase: a.phase, day: s.date }))), "session_id,n");
  }
  f.syncedAt = new Date().toISOString();
}

/** Delete the family's cloud copy (children cascade to all learning data). */
export async function deleteCloud() {
  const t = await token();
  await call(`/rest/v1/families?id=eq.${t.user_id}`, { method: "DELETE", token: t.access_token });
}
