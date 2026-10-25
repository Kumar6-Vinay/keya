/** Local-first storage. Everything is kept on the phone; sync.ts can copy it to the family's
 *  own Supabase project when configured. Only what the design allows is stored (section 9). */
import { activeMisconceptions, emptyLearner, Learner, State } from "./engine/learner";
import type { Mistake } from "./engine/items";
import { Cls, GameId, Lang, skill as skillOf } from "./engine/skills";
import { HOME } from "./ui/i18n";

export interface Attempt { skill: string; correct: boolean; hint: number; mistake?: Mistake; phase: string }
export interface SessionSummary { id: string; date: string; game: GameId; minutes: number; items: number; alone: number; grown: string[]; attempts: Attempt[] }
export interface Child {
  id: string; nickname: string; cls: Cls; lang: Lang; avatar: string;
  openClasses: number[];          // classes whose games this child can play (parent can open more)
  learner: Learner; sessions: SessionSummary[]; createdAt: string;
}
export interface Family {
  version: 1;
  consentAt: string; consentNotice: string;
  pinHash: string;
  tz: string;
  limitMin: number;
  children: Child[];
  syncedAt?: string;
}

const KEY = "keya.family.v1";
const OLD_KEYS = ["numbernagar.family.v1"];   // the app was called Number Nagar before; its data moves over on first load
export const CONSENT_NOTICE_VERSION = "2026-10-25";
export const ATTEMPT_KEEP_DAYS = 90;
export const AVATARS = ["🦁", "🐘", "🦚", "🐯", "🐢", "🐒", "🦜", "🐄"];

const uid = () => (crypto?.randomUUID?.() ?? `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`);

export function load(): Family | null {
  try {
    let raw = localStorage.getItem(KEY);
    if (!raw) {
      for (const k of OLD_KEYS) {
        const old = localStorage.getItem(k);
        if (old) { localStorage.setItem(KEY, old); localStorage.removeItem(k); raw = old; break; }
      }
    }
    return raw ? migrate(JSON.parse(raw) as Family) : null;
  } catch { return null; }
}

/** Bring older saved data up to date (fields added after release). */
function migrate(f: Family): Family {
  for (const c of f.children) {
    c.openClasses ??= [c.cls];
    c.learner ??= emptyLearner();
    c.sessions ??= [];
  }
  return f;
}

export function save(f: Family) {
  try { localStorage.setItem(KEY, JSON.stringify(f)); } catch { /* storage full or blocked: keep playing in memory */ }
}

export function wipe() { try { localStorage.removeItem(KEY); } catch { /* ignore */ } }

export async function hashPin(pin: string): Promise<string> {
  try {
    // The salt keeps its old name so PINs set before the rename still work.
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`numbernagar:${pin}`));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
  } catch {
    let h = 0; for (const c of `numbernagar:${pin}`) h = (h * 31 + c.charCodeAt(0)) | 0; return `x${h}`;
  }
}

export function newFamily(pinHash: string, tz: string): Family {
  return { version: 1, consentAt: new Date().toISOString(), consentNotice: CONSENT_NOTICE_VERSION, pinHash, tz, limitMin: 12, children: [] };
}

export function addChild(f: Family, nickname: string, cls: Cls, lang: Lang, avatar: string): Child {
  const c: Child = { id: uid(), nickname: nickname.trim().slice(0, 16), cls, lang, avatar, openClasses: [cls], learner: emptyLearner(), sessions: [], createdAt: new Date().toISOString() };
  f.children.push(c);
  return c;
}

/** Save or update a session summary. Called after every item, so time and progress are kept even if the app is closed mid-game. */
export function upsertSession(c: Child, s: SessionSummary) {
  const i = c.sessions.findIndex(x => x.id === s.id);
  if (i >= 0) c.sessions[i] = s; else c.sessions.push(s);
}
export const newId = uid;

/** Drop per-item attempts older than 90 days; the session summaries stay. */
export function prune(f: Family, day: string) {
  const cutoff = new Date(Date.parse(day) - ATTEMPT_KEEP_DAYS * 864e5).toISOString().slice(0, 10);
  for (const c of f.children) for (const s of c.sessions) if (s.date < cutoff) s.attempts = [];
}

// ---------- weekly report ----------

export interface Report {
  from: string; to: string; minutes: number; sessions: number;
  learned: { id: string; name: string; canDo: string }[];
  practise: { id: string; name: string; state: State }[];
  aloneShare: number | null;
  noticed: { skill: string; mistake: Mistake; skillName: string; confirmed: boolean; items: number }[];
  home: GameId | null;
}

export function weeklyReport(c: Child, day: string, lang: Lang): Report {
  const from = new Date(Date.parse(day) - 6 * 864e5).toISOString().slice(0, 10);
  const week = c.sessions.filter(s => s.date >= from && s.date <= day);
  const learnedIds = [...new Set(week.flatMap(s => s.grown))];
  const played = new Set(week.flatMap(s => s.attempts.map(a => a.skill)));
  const practise = [...played].filter(id => !learnedIds.includes(id))
    .map(id => ({ id, name: skillOf(id).name[lang], state: c.learner.skills[id]?.state ?? "not_started" as State }))
    .filter(x => x.state !== "mastered" && x.state !== "secure");
  const items = week.reduce((n, s) => n + s.items, 0), alone = week.reduce((n, s) => n + s.alone, 0);
  const counts: Partial<Record<GameId, number>> = {};
  week.forEach(s => { counts[s.game] = (counts[s.game] ?? 0) + s.minutes; });
  const home = (Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] as GameId) ?? null;
  return {
    from, to: day,
    minutes: Math.round(week.reduce((n, s) => n + s.minutes, 0)),
    sessions: week.length,
    learned: learnedIds.map(id => ({ id, name: skillOf(id).name[lang], canDo: skillOf(id).canDo[lang] })),
    practise,
    aloneShare: items ? Math.round((alone / items) * 100) : null,
    noticed: activeMisconceptions(c.learner, day).map(m => ({ skill: m.skill, mistake: m.mistake, skillName: skillOf(m.skill).name[lang], confirmed: m.confirmed, items: m.items.length })),
    home,
  };
}

export function exportJson(f: Family): string {
  const { pinHash: _omit, ...rest } = f;
  void _omit;
  return JSON.stringify(rest, null, 2);
}

// ---------- grown-up PIN: slow down guessing ----------

const PIN_KEY = "keya.pin.v1";
export const PIN_FREE_TRIES = 3;
/** How long the PIN pad stays shut after this many wrong tries in a row: 30 s, then doubling, up to 15 minutes. */
export function lockMs(fails: number): number {
  return fails < PIN_FREE_TRIES ? 0 : Math.min(15 * 60_000, 30_000 * 2 ** (fails - PIN_FREE_TRIES));
}
const readPin = (): { fails: number; until: number } => {
  try { return { fails: 0, until: 0, ...JSON.parse(localStorage.getItem(PIN_KEY) ?? "{}") }; } catch { return { fails: 0, until: 0 }; }
};
const writePin = (v: { fails: number; until: number }) => { try { localStorage.setItem(PIN_KEY, JSON.stringify(v)); } catch { /* ignore */ } };
export const pinGate = {
  /** Milliseconds until the pad opens again; 0 when it is open. */
  remaining: (now = Date.now()) => Math.max(0, readPin().until - now),
  fail: (now = Date.now()) => { const fails = readPin().fails + 1; writePin({ fails, until: now + lockMs(fails) }); },
  ok: () => writePin({ fails: 0, until: 0 }),
};

/** The week as plain text a parent can send to a partner, grandparent or teacher. Nothing leaves the phone until they press Share. */
export function reportText(c: Child, r: Report): string {
  const lines = [`Keya: ${c.nickname}'s week (${r.from} to ${r.to})`];
  lines.push(r.sessions ? `Played ${r.minutes} min in ${r.sessions} game${r.sessions === 1 ? "" : "s"}${r.aloneShare === null ? "" : `, ${r.aloneShare}% done alone`}.` : "No games played this week.");
  if (r.learned.length) lines.push("", "New this week:", ...r.learned.map(x => `- ${x.name}: ${x.canDo}`));
  if (r.practise.length) lines.push("", "Needs more practice:", ...r.practise.map(x => `- ${x.name}`));
  if (r.home) lines.push("", "Try at home:", HOME[r.home].en, HOME[r.home].hi);
  return lines.join("\n");
}
