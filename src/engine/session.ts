/** One play session in one game: warm-up reviews, adaptive practice, mastery check, stop at the time limit.
 *  Pure logic; the UI calls submit() / help() and renders what current() returns. */
import { AnswerSet, choices, Item, Mistake, nextItem, Step } from "./items";
import { dueReviews, Learner, rec, recordCheck, recordMistake, update, unlocked } from "./learner";
import { GameId, skill as skillOf, skillsFor } from "./skills";
import type { Rng } from "./rng";

export type Phase = "review" | "practice" | "check" | "done";

export const AUTO_HINT_MAX = 3;   // mistakes alone never reveal the answer
export const HINT_MAX = 4;        // level 4 (the answer for this step) only when the child asks
export const CHECK_ITEMS = 3;

export interface Turn {
  phase: Phase;
  skill: string;
  item: Item;
  hint: number;          // current hint level shown
  wrongs: number;        // wrong attempts on this item
  canHelp: boolean;      // no help during a mastery check
  no: number;            // item number in session
}

export interface Outcome {
  correct: boolean;
  mistake?: Mistake;
  moveOn: boolean;               // the item is finished
  grew?: string;                 // skill just mastered
  checkFailed?: boolean;
  stepChanged?: "easier" | "harder";
}

const itemKey = (it: Item) => JSON.stringify(it).replace(/[{}"]/g, "").slice(0, 60);

export class Session {
  turn!: Turn;
  readonly used = new AnswerSet();
  readonly started = Date.now();
  readonly log: { skill: string; item: string; correct: boolean; hint: number; phase: Phase; mistake?: Mistake }[] = [];
  grown: string[] = [];
  private reviews: string[];
  private step: Step = 1;
  private streak = 0;
  private misses = 0;
  private checkResults: { correct: boolean; hint: number }[] = [];
  private n = 0;
  private stopAfterItem = false;
  private inCheck = false;

  constructor(private learner: Learner, readonly game: GameId, private day: string, private rng: Rng,
              private limitMin = 12, startSkill?: string) {
    this.reviews = dueReviews(learner, day).slice(0, 2);
    this.target = startSkill ?? this.firstOpenSkill();
    const st = rec(learner, this.target).state;
    this.step = st === "practised" ? 2 : 1;
    this.advance();
  }

  target: string;

  private firstOpenSkill(): string {
    const list = skillsFor(this.game);
    const open = list.filter(s => unlocked(this.learner, s.id));
    const todo = open.find(s => !["mastered", "secure"].includes(rec(this.learner, s.id).state));
    return (todo ?? open[open.length - 1] ?? list[0]).id;
  }

  minutes() { return (Date.now() - this.started) / 60000; }

  /** Called by the UI when the time limit passes: finish the current item, then stop. */
  timeUp() { this.stopAfterItem = true; }

  private advance() {
    this.n++;
    if (this.stopAfterItem || (this.minutes() >= this.limitMin && !this.inCheck)) {
      this.turn = { ...this.turn, phase: "done" };
      return;
    }
    const phase: Phase = this.reviews.length ? "review" : this.inCheck ? "check" : "practice";
    const sk = phase === "review" ? this.reviews.shift()! : this.target;
    const step: Step = phase === "practice" ? this.step : phase === "check" ? (this.rng() < 0.5 ? 2 : 3) : 2;
    this.turn = { phase, skill: sk, item: nextItem(sk, step, this.rng, this.used),
                  hint: 0, wrongs: 0, canHelp: phase !== "check", no: this.n };
  }

  current(): Turn { return this.turn; }

  /** The child asks for help: one level more, up to showing the answer for this step. */
  help(): number {
    if (!this.turn.canHelp) return this.turn.hint;
    this.turn.hint = Math.min(HINT_MAX, this.turn.hint + 1);
    return this.turn.hint;
  }

  /** A wrong attempt on a multi-step item (columns) that does not end the item. */
  stepWrong(mistake?: Mistake): Outcome {
    this.turn.wrongs++;
    if (mistake) recordMistake(this.learner, this.turn.skill, mistake, itemKey(this.turn.item), this.day);
    if (this.turn.canHelp) this.turn.hint = Math.min(AUTO_HINT_MAX, Math.max(this.turn.hint, this.turn.wrongs));
    return { correct: false, mistake, moveOn: false };
  }

  /** Report an answer. A correct answer finishes the item; a wrong one raises the hint (practice) or ends it (check). */
  submit(correct: boolean, mistake?: Mistake): Outcome {
    const t = this.turn;
    if (!correct) {
      const o = this.stepWrong(mistake);
      if (t.phase === "check") return this.finish(false, mistake);
      if (t.wrongs >= 3) return this.finish(false, mistake);   // after 3 tries, show it and move on
      return o;
    }
    return this.finish(t.wrongs === 0, undefined);
  }

  private finish(firstTry: boolean, mistake?: Mistake): Outcome {
    const t = this.turn;
    const solvedAlone = firstTry && t.hint === 0;
    update(this.learner, { skill: t.skill, item: itemKey(t.item), correct: firstTry, hint: t.hint,
      kind: t.phase === "review" ? "review" : t.phase === "check" ? "check" : "practice", choices: choices(t.item) }, this.day);
    this.log.push({ skill: t.skill, item: itemKey(t.item), correct: firstTry, hint: t.hint, phase: t.phase, mistake });
    const out: Outcome = { correct: firstTry, mistake, moveOn: true };

    if (t.phase === "check") {
      this.checkResults.push({ correct: firstTry, hint: t.hint });
      if (!firstTry || this.checkResults.length >= CHECK_ITEMS) {
        const passed = recordCheck(this.learner, t.skill, this.checkResults, this.day);
        this.checkResults = [];
        this.inCheck = false;
        if (passed) {
          out.grew = t.skill;
          this.grown.push(t.skill);
          this.target = this.firstOpenSkill();
          this.step = 1;
        } else {
          out.checkFailed = true;
          this.step = 2;
        }
        this.streak = 0; this.misses = 0;
      }
    } else if (t.phase === "practice") {
      if (solvedAlone) { this.streak++; this.misses = 0; } else { this.streak = 0; if (!firstTry) this.misses++; }
      if (this.misses >= 2 && this.step > 1) { this.step = (this.step - 1) as Step; this.misses = 0; out.stepChanged = "easier"; }
      else if (this.streak >= 3 && this.step < 3) { this.step = (this.step + 1) as Step; this.streak = 0; out.stepChanged = "harder"; }
      else if (this.streak >= 2 && this.step === 3 && rec(this.learner, t.skill).p >= 0.85 && !["mastered", "secure"].includes(rec(this.learner, t.skill).state)) {
        // Ready: the next items are the mastery check.
        this.streak = 0;
        this.inCheck = true;
        this.checkResults = [];
      }
    }
    this.advance();
    return out;
  }

  /** Practice items the child got right first time with no help. */
  aloneCount() { return this.log.filter(x => x.phase !== "check" && x.correct && x.hint === 0).length; }

  skillName(id: string, lang: "en" | "hi") { return skillOf(id).name[lang]; }
}
