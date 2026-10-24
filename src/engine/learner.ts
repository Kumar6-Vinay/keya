/** Learner model (design section 7): knowledge tracing per skill, five states,
 *  mastery only from fresh unaided items, secure only after spaced reviews. */
import type { Mistake } from "./items";
import { SKILLS } from "./skills";

export type State = "not_started" | "learning" | "practised" | "mastered" | "secure";
export type Kind = "practice" | "check" | "review";

export const P = {
  init: 0.15, learn: 0.15, guess: 0.2, slip: 0.1, forgetPerDay: 0.02,
  practised: 0.6, mastered: 0.85,
  reviewDays: [2, 7, 21, 60],
  misconceptionExpiryDays: 30,
};

export interface SkillRecord {
  state: State;
  p: number;                  // probability the skill is known
  lastDay: string | null;     // YYYY-MM-DD of the last update
  reviewStep: number;         // index into reviewDays; -1 = not scheduled
  nextReview: string | null;
  masteredOn: string | null;
  workedInRow: number;        // items in a row that needed a worked example
}

export interface Misconception { skill: string; mistake: Mistake; items: string[]; firstSeen: string; lastSeen: string }

export interface Learner {
  skills: Record<string, SkillRecord>;
  misconceptions: Record<string, Misconception>;
}

export interface Evidence {
  skill: string;
  item: string;               // a short key of the item, e.g. "52-27"
  correct: boolean;           // right first time
  hint: number;               // highest hint level used, 0 = none
  kind: Kind;
  choices?: number;           // >0 for multiple choice
}

export const emptyLearner = (): Learner => ({ skills: {}, misconceptions: {} });

const fresh = (): SkillRecord => ({ state: "not_started", p: P.init, lastDay: null, reviewStep: -1, nextReview: null, masteredOn: null, workedInRow: 0 });

export const rec = (l: Learner, skill: string): SkillRecord => (l.skills[skill] ??= fresh());

const daysBetween = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 864e5);
export const addDays = (day: string, n: number) => new Date(Date.parse(day) + n * 864e5).toISOString().slice(0, 10);

/** Today's date in the family's own time zone, not the server's. */
export function today(tz?: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

export function pKnown(r: SkillRecord, day: string): number {
  if (!r.lastDay) return r.p;
  return r.p * Math.pow(1 - P.forgetPerDay, Math.max(0, daysBetween(r.lastDay, day)));
}

export function isDue(r: SkillRecord, day: string): boolean {
  return (r.state === "mastered" || r.state === "secure") && !!r.nextReview && r.nextReview <= day;
}

export const dueReviews = (l: Learner, day: string) => Object.keys(l.skills).filter(k => isDue(l.skills[k], day));

/** Update the model with one answered item. Returns the new state. */
export function update(l: Learner, ev: Evidence, day: string): State {
  const r = rec(l, ev.skill);
  if (r.state === "not_started") r.state = "learning";

  // Knowledge tracing. Heavily helped answers (hint 2+) teach but are not evidence of knowing.
  if (ev.hint < 2) {
    const p = pKnown(r, day);
    let guess = P.guess;
    if (ev.choices && ev.choices > 0) guess = Math.max(guess, 1 / ev.choices);
    if (ev.hint === 1) guess = Math.max(guess, 0.4);
    const post = ev.correct ? (p * (1 - P.slip)) / (p * (1 - P.slip) + (1 - p) * guess)
                            : (p * P.slip) / (p * P.slip + (1 - p) * (1 - guess));
    r.p = post + (1 - post) * P.learn;
  }
  r.lastDay = day;

  r.workedInRow = ev.hint >= 3 ? r.workedInRow + 1 : 0;

  if (ev.kind === "review") {
    if (ev.correct && ev.hint === 0) {
      r.reviewStep = Math.min(r.reviewStep + 1, P.reviewDays.length - 1);
      r.nextReview = addDays(day, P.reviewDays[r.reviewStep]);
      if (r.state === "mastered" && r.masteredOn && daysBetween(r.masteredOn, day) >= 7 && r.reviewStep >= 2) r.state = "secure";
    } else {
      r.state = "practised";
      r.reviewStep = -1;
      r.nextReview = null;
    }
    return r.state;
  }

  if (r.state === "learning" && pKnown(r, day) >= P.practised) r.state = "practised";
  if ((r.state === "practised" || r.state === "learning") && r.workedInRow >= 2) r.state = "learning";
  if ((r.state === "mastered" || r.state === "secure") && r.workedInRow >= 2) {
    // Struggling again on a skill marked mastered: it goes back down, and the parent sees that.
    r.state = "practised"; r.reviewStep = -1; r.nextReview = null;
  }
  return r.state;
}

/** Mastery check: 3 fresh items, no help, all right, and probability at least 0.85. */
export function recordCheck(l: Learner, skill: string, results: { correct: boolean; hint: number }[], day: string): boolean {
  const r = rec(l, skill);
  const passed = results.length >= 3 && results.every(x => x.correct && x.hint === 0) && pKnown(r, day) >= P.mastered;
  if (passed && r.state !== "secure") {
    r.state = "mastered";
    r.masteredOn = day;
    r.reviewStep = 0;
    r.nextReview = addDays(day, P.reviewDays[0]);
  }
  return passed;
}

// ---------- misconceptions ----------

export function recordMistake(l: Learner, skill: string, mistake: Mistake, item: string, day: string) {
  if (mistake === "wrong_digit" || mistake === "miscount" || mistake === "wrong_pick") return;     // slips are not misconceptions
  const key = `${skill}:${mistake}`;
  const m = (l.misconceptions[key] ??= { skill, mistake, items: [], firstSeen: day, lastSeen: day });
  if (!m.items.includes(item)) m.items.push(item);
  m.lastSeen = day;
}

/** Seen on 2+ different items = likely real; seen once = maybe a slip. Expires after 30 days unseen. */
export function activeMisconceptions(l: Learner, day: string) {
  return Object.values(l.misconceptions)
    .filter(m => daysBetween(m.lastSeen, day) <= P.misconceptionExpiryDays)
    .map(m => ({ ...m, confirmed: m.items.length >= 2 }));
}

export function dismissMisconception(l: Learner, skill: string, mistake: string): boolean {
  const key = `${skill}:${mistake}`;
  if (!l.misconceptions[key]) return false;
  delete l.misconceptions[key];
  return true;
}

/** Skills whose prerequisites are mastered (or that have none): the levels a child may open. */
export function unlocked(l: Learner, skillId: string): boolean {
  const s = SKILLS.find(k => k.id === skillId);
  if (!s) return false;
  const ok = (id: string) => ["mastered", "secure"].includes(l.skills[id]?.state ?? "");
  // Within a game, levels open in order. Across games, prerequisites from another game don't block level 1.
  return s.prereq.every(p => ok(p) || SKILLS.find(k => k.id === p)?.game !== s.game);
}
