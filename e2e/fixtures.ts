import { expect, Page } from "@playwright/test";
import { SKILLS, skill as skillOf } from "../src/engine/skills";
import type { GameId, Lang } from "../src/engine/skills";
import { splitParts, speakable } from "../src/ui/voice";

export interface Utt { text: string; lang: string; voice: string | null; t: number; started: boolean; ended: boolean; error: string | null }
export interface FakeOptions {
  hindi?: boolean;                 // a Hindi voice is installed (default true)
  deny?: boolean;                  // every utterance fails with "not-allowed", as in a blocked embedded frame
  swallowFirst?: string;           // the first utterance containing this text is swallowed: engine busy, no events (a wedge)
}

/** Replaces speechSynthesis with a recording fake. `window.__utts` lists everything handed to speak(). */
export async function installFakeSpeech(page: Page, opts: FakeOptions = {}) {
  await page.addInitScript((o: FakeOptions) => {
    const w = window as unknown as Record<string, unknown>;
    const utts: Utt[] = []; w.__utts = utts;
    const voices = [{ name: "Fake English", lang: "en-IN", voiceURI: "en", localService: true, default: true }]
      .concat(o.hindi === false ? [] : [{ name: "Fake Hindi", lang: "hi-IN", voiceURI: "hi", localService: true, default: false }]);
    class FakeUtterance {
      text: string; lang = ""; voice: unknown = null; rate = 1; pitch = 1; volume = 1;
      onstart: (() => void) | null = null; onend: (() => void) | null = null; onerror: ((e: { error: string }) => void) | null = null;
      constructor(text: string) { this.text = text; }
    }
    let playing: { u: FakeUtterance; rec: Utt; timer: number } | null = null;
    const queue: FakeUtterance[] = [];
    let wedged = false, swallow = o.swallowFirst ?? "";
    const recOf = new Map<FakeUtterance, Utt>();
    const pump = () => {
      if (playing || wedged || !queue.length) return;
      const u = queue.shift()!, rec = recOf.get(u)!;
      const timer = window.setTimeout(() => {
        rec.started = true; u.onstart?.();
        playing = { u, rec, timer: window.setTimeout(() => { rec.ended = true; playing = null; u.onend?.(); pump(); }, 60 + u.text.length * 4) };
      }, 8);
      playing = { u, rec, timer };
    };
    const synth = {
      get speaking() { return wedged || !!playing; }, get pending() { return queue.length > 0; }, paused: false,
      getVoices: () => voices, addEventListener() {}, removeEventListener() {}, pause() {}, resume() {},
      speak(u: FakeUtterance) {
        const rec: Utt = { text: u.text, lang: u.lang, voice: (u.voice as { name: string } | null)?.name ?? null, t: Math.round(performance.now()), started: false, ended: false, error: null };
        utts.push(rec); recOf.set(u, rec);
        if (o.deny) { window.setTimeout(() => { rec.error = "not-allowed"; u.onerror?.({ error: "not-allowed" }); }, 2); return; }
        if (swallow && u.text.includes(swallow)) { swallow = ""; wedged = true; return; }
        queue.push(u); pump();
      },
      cancel() {
        if (wedged) wedged = false;
        const gone = [...(playing ? [playing.u] : []), ...queue];
        if (playing) clearTimeout(playing.timer);
        playing = null; queue.length = 0;
        for (const u of gone) window.setTimeout(() => { const r = recOf.get(u); if (r && !r.ended) r.error = "interrupted"; u.onerror?.({ error: "interrupted" }); }, 20);
      },
    };
    Object.defineProperty(window, "speechSynthesis", { value: synth, configurable: true });
    Object.defineProperty(window, "SpeechSynthesisUtterance", { value: FakeUtterance, configurable: true });
  }, opts);
}

export const utterances = (page: Page) => page.evaluate(() => (window as unknown as { __utts: Utt[] }).__utts);

/** What was sent to speech since index `from`, as one string per part. */
export async function spokenSince(page: Page, from: number) { return (await utterances(page)).slice(from); }

/** The speech parts that a line shown on screen must turn into. */
export const expectedParts = (line: string, lang: Lang) => splitParts(speakable(line, lang), lang).map(p => p.text);

// ---------- seeding ----------

const prereqClosure = (id: string, out = new Set<string>()): Set<string> => { for (const p of skillOf(id).prereq) { out.add(p); prereqClosure(p, out); } return out; };

/** A family with one child. If `target` is given, everything before it counts as mastered (reviews far in the future),
 *  so the first thing the child meets in that game is the target skill's demo. */
export function seedFamily(lang: Lang, target?: string) {
  const skills: Record<string, unknown> = {};
  if (target) {
    const before = new Set<string>(prereqClosure(target));
    for (const s of SKILLS) if (s.game === skillOf(target).game && s.level < skillOf(target).level) { before.add(s.id); prereqClosure(s.id).forEach(x => before.add(x)); }
    for (const id of before) skills[id] = { state: "mastered", p: 0.95, lastDay: "2026-01-01", reviewStep: 3, nextReview: "2999-01-01", masteredOn: "2026-01-01", workedInRow: 0 };
  }
  return {
    version: 1, consentAt: new Date().toISOString(), consentNotice: "2026-10-25", pinHash: "x", tz: "Asia/Kolkata", limitMin: 12,
    children: [{ id: "c1", nickname: "Riya", cls: 1, lang, avatar: "🦚", openClasses: [1, 2, 3], learner: { skills, misconceptions: {} }, sessions: [], createdAt: new Date().toISOString() }],
  };
}

export const DISTRICT_ICON: Record<GameId, string> = {
  sabzi: "🥕", laddoo: "🍬", cat: "🐱", rangoli: "🌺", sounds: "🌻", caps: "🧢", listen: "👂", beads: "📿", stall: "🎪", share: "🧺", hundreds: "🧱",
};

/** Open the app with a seeded family and start `game`. */
export async function startGame(page: Page, game: GameId, lang: Lang, target?: string) {
  await page.addInitScript(f => localStorage.setItem("keya.family.v1", JSON.stringify(f)), seedFamily(lang, target));
  await page.goto("/");
  await page.locator(".kid").click();
  await page.locator(`.district:has(.dicon:text-is("${DISTRICT_ICON[game]}"))`).click();
}

export { expect };
