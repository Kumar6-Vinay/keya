import { newColumn, enter, trade, diagnoseWhole } from "../src/engine/column";
import { AnswerSet, check, nextItem, Step } from "../src/engine/items";
import { emptyLearner, recordCheck, update, rec, activeMisconceptions, recordMistake, dismissMisconception, addDays } from "../src/engine/learner";
import { Session } from "../src/engine/session";
import { makeRng } from "../src/engine/rng";
import { SKILLS } from "../src/engine/skills";

describe("column engine", () => {
  it("subtracts 3-digit with trading, step by step", () => {
    const s = newColumn(432, 167, "-");
    expect(trade(s).ok).toBe(true);
    expect(enter(s, 5).ok).toBe(true);           // 12 - 7
    expect(trade(s).ok).toBe(true);
    expect(enter(s, 6).ok).toBe(true);           // 12 - 6
    expect(enter(s, 2).done).toBe(true);         // 3 - 1
  });
  it("detects smaller-from-larger and forgotten decrement", () => {
    const s = newColumn(81, 37, "-");
    expect(enter(s, 6).bug).toBe("smaller_from_larger");
    expect(enter(s, 4).ok).toBe(true);           // mental trade accepted
    expect(enter(s, 5).bug).toBe("no_decrement");
  });
  it("flags 52-27 as ambiguous when the ones digit could come from either path", () => {
    const s = newColumn(52, 27, "-");
    expect(enter(s, 5).ok).toBe(true);
    expect(enter(s, 3).bug).toBe("ambiguous_trade");
  });
  it("addition carry and forgotten carry", () => {
    const s = newColumn(248, 135, "+");
    expect(enter(s, 3).ok).toBe(true);
    expect(enter(s, 7).bug).toBe("no_carry");
    expect(enter(s, 8).ok).toBe(true);
    expect(enter(s, 3).done).toBe(true);
  });
  it("rejects an unneeded trade", () => {
    expect(trade(newColumn(58, 31, "-")).bug).toBe("unneeded_trade");
  });
  it("diagnoses whole answers", () => {
    expect(diagnoseWhole(50, 27, "-", 23)).toBe(null);
    expect(diagnoseWhole(50, 27, "-", 37)).toBe("smaller_from_larger");
    expect(diagnoseWhole(50, 27, "-", 77)).toBe("wrong_op");
    expect(diagnoseWhole(38, 25, "+", 53)).toBe("no_carry");
  });
});

describe("items", () => {
  it("every generator makes valid items at every step, 200 times", () => {
    const rng = makeRng(1);
    for (const sk of SKILLS) for (const step of [1, 2, 3] as Step[]) for (let i = 0; i < 200; i++) {
      const it = nextItem(sk.id, step, rng, new AnswerSet());
      if (it.kind === "column") {
        expect(it.a).toBeLessThan(1000); expect(it.b).toBeLessThan(1000);
        if (it.op === "-") expect(it.a).toBeGreaterThan(it.b); else expect(it.a + it.b).toBeLessThan(1000);
        expect(() => newColumn(it.a, it.b, it.op)).not.toThrow();
      }
      if (it.kind === "money_change") expect(it.price).toBeLessThan(it.paid);
      if (it.kind === "money_add") { expect(it.prices[0] + it.prices[1]).toBeLessThanOrEqual(99); expect(it.prices.every(p => p >= 10)).toBe(true); }
      if (it.kind === "pv_build" || it.kind === "pv_read") { expect(it.n).toBeGreaterThanOrEqual(10); expect(it.n).toBeLessThanOrEqual(99); }
      if (it.kind === "pv_compare") expect(it.a).not.toBe(it.b);
      if (it.kind === "share") expect(it.total).toBeGreaterThan(it.plates);
    }
  });
  it("money_add has no carry and money_add_carry always carries", () => {
    const rng = makeRng(2);
    for (let i = 0; i < 300; i++) {
      const a = nextItem("money_add", 2, rng, new AnswerSet()); if (a.kind !== "money_add") throw 0;
      expect((a.prices[0] % 10) + (a.prices[1] % 10)).toBeLessThan(10);
      const b = nextItem("money_add_carry", 2, rng, new AnswerSet()); if (b.kind !== "money_add") throw 0;
      expect((b.prices[0] % 10) + (b.prices[1] % 10)).toBeGreaterThan(9);
    }
  });
  it("no answer repeats within a session", () => {
    const rng = makeRng(3), used = new AnswerSet(), seen = new Set<number>();
    for (let i = 0; i < 12; i++) {
      const it = nextItem("h_sub", 2, rng, used); if (it.kind !== "column") throw 0;
      const ans = it.a - it.b; expect(seen.has(ans)).toBe(false); seen.add(ans);
    }
  });
  it("checks answers and names mistakes", () => {
    expect(check({ kind: "pv_build", skill: "pv_build", n: 43 }, { tens: 3, ones: 4 })).toEqual({ ok: false, mistake: "reversed_digits" });
    expect(check({ kind: "pv_build", skill: "pv_build", n: 43 }, { tens: 3, ones: 13 }).mistake).toBe("ones_over_9");
    expect(check({ kind: "pv_compare", skill: "pv_compare", a: 52, b: 25 }, { pick: "b" }).mistake).toBe("compared_ones");
    expect(check({ kind: "share", skill: "share_left", total: 14, plates: 4, food: "laddoo" }, { plates: [3, 3, 3, 3], left: 2 }).ok).toBe(true);
    expect(check({ kind: "share", skill: "share_left", total: 14, plates: 4, food: "laddoo" }, { plates: [2, 2, 2, 2], left: 6 }).mistake).toBe("left_too_many");
    expect(check({ kind: "share", skill: "share_equal", total: 12, plates: 3, food: "laddoo" }, { plates: [5, 4, 3], left: 0 }).mistake).toBe("unequal_share");
  });
});

describe("learner model", () => {
  const day = "2026-10-25";
  it("mastery needs a passed check with high probability", () => {
    const l = emptyLearner();
    for (let i = 0; i < 8; i++) update(l, { skill: "pv_build", item: `i${i}`, correct: true, hint: 0, kind: "practice" }, day);
    expect(rec(l, "pv_build").state).toBe("practised");
    expect(recordCheck(l, "pv_build", [{ correct: true, hint: 0 }, { correct: true, hint: 0 }], day)).toBe(false);
    expect(recordCheck(l, "pv_build", [{ correct: true, hint: 0 }, { correct: true, hint: 0 }, { correct: true, hint: 0 }], day)).toBe(true);
    expect(rec(l, "pv_build").state).toBe("mastered");
    expect(rec(l, "pv_build").nextReview).toBe(addDays(day, 2));
  });
  it("struggling again on a mastered skill moves it back down", () => {
    const l = emptyLearner();
    for (let i = 0; i < 8; i++) update(l, { skill: "pv_build", item: `i${i}`, correct: true, hint: 0, kind: "practice" }, day);
    recordCheck(l, "pv_build", [1, 2, 3].map(() => ({ correct: true, hint: 0 })), day);
    update(l, { skill: "pv_build", item: "x1", correct: false, hint: 3, kind: "practice" }, day);
    update(l, { skill: "pv_build", item: "x2", correct: false, hint: 4, kind: "practice" }, day);
    expect(rec(l, "pv_build").state).toBe("practised");
  });
  it("a failed review goes back to practised; spaced passes make it secure", () => {
    const l = emptyLearner();
    for (let i = 0; i < 8; i++) update(l, { skill: "share_equal", item: `i${i}`, correct: true, hint: 0, kind: "practice" }, day);
    recordCheck(l, "share_equal", [1, 2, 3].map(() => ({ correct: true, hint: 0 })), day);
    update(l, { skill: "share_equal", item: "r1", correct: true, hint: 0, kind: "review" }, addDays(day, 2));
    update(l, { skill: "share_equal", item: "r2", correct: true, hint: 0, kind: "review" }, addDays(day, 9));
    expect(rec(l, "share_equal").state).toBe("secure");
    update(l, { skill: "share_equal", item: "r3", correct: false, hint: 0, kind: "review" }, addDays(day, 30));
    expect(rec(l, "share_equal").state).toBe("practised");
  });
  it("misconceptions need two items, expire, and can be removed by a parent", () => {
    const l = emptyLearner();
    recordMistake(l, "h_sub", "smaller_from_larger", "a", day);
    expect(activeMisconceptions(l, day)[0].confirmed).toBe(false);
    recordMistake(l, "h_sub", "smaller_from_larger", "b", day);
    expect(activeMisconceptions(l, day)[0].confirmed).toBe(true);
    expect(activeMisconceptions(l, addDays(day, 31))).toHaveLength(0);
    expect(dismissMisconception(l, "h_sub", "smaller_from_larger")).toBe(true);
    recordMistake(l, "h_sub", "wrong_digit", "c", day);
    expect(activeMisconceptions(l, day)).toHaveLength(0);
  });
});

describe("session", () => {
  const day = "2026-10-25";
  it("a child who answers well reaches a mastery check and grows the town", () => {
    const l = emptyLearner();
    const s = new Session(l, "share", day, makeRng(5), 60);
    let grew: string | undefined;
    for (let i = 0; i < 40 && !grew; i++) grew = s.submit(true).grew;
    expect(grew).toBe("share_equal");
    expect(rec(l, "share_equal").state).toBe("mastered");
    expect(s.current().skill).not.toBe("share_equal");
  });
  it("two misses step the difficulty down; help never goes past level 4", () => {
    const l = emptyLearner();
    const s = new Session(l, "stall", day, makeRng(6), 60);
    for (let i = 0; i < 6; i++) s.submit(true);   // reach step 2
    s.submit(false); s.submit(true);
    s.submit(false); const o = s.submit(true);
    expect(o.stepChanged).toBe("easier");
    for (let i = 0; i < 9; i++) s.help();
    expect(s.current().hint).toBe(4);
  });
  it("wrong answers alone raise the hint to 3 at most", () => {
    const s = new Session(emptyLearner(), "beads", day, makeRng(7), 60);
    s.submit(false); s.submit(false);
    expect(s.current().hint).toBe(2);
    expect(s.current().hint).toBeLessThanOrEqual(3);
  });
  it("starts with due reviews", () => {
    const l = emptyLearner();
    for (let i = 0; i < 8; i++) update(l, { skill: "pv_build", item: `i${i}`, correct: true, hint: 0, kind: "practice" }, day);
    recordCheck(l, "pv_build", [1, 2, 3].map(() => ({ correct: true, hint: 0 })), day);
    const s = new Session(l, "share", addDays(day, 3), makeRng(8), 60);
    expect(s.current().phase).toBe("review");
    expect(s.current().skill).toBe("pv_build");
  });
});

import { newFamily, addChild, upsertSession, weeklyReport, prune } from "../src/store";

describe("store and weekly report", () => {
  it("reports this week's minutes, learning and only first-try-alone as 'done alone'", () => {
    const f = newFamily("x", "Asia/Kolkata");
    const c = addChild(f, "  Riya  ", 2, "en", "🦁");
    expect(c.nickname).toBe("Riya");
    upsertSession(c, { id: "s1", date: "2026-10-24", game: "stall", minutes: 9, items: 10, alone: 6, grown: ["money_add"], attempts: [{ skill: "money_add_carry", correct: false, hint: 2, phase: "practice" }] });
    upsertSession(c, { id: "s1", date: "2026-10-24", game: "stall", minutes: 12, items: 12, alone: 7, grown: ["money_add"], attempts: [{ skill: "money_add_carry", correct: false, hint: 2, phase: "practice" }] });
    upsertSession(c, { id: "old", date: "2026-09-01", game: "beads", minutes: 5, items: 3, alone: 3, grown: [], attempts: [{ skill: "pv_build", correct: true, hint: 0, phase: "practice" }] });
    const r = weeklyReport(c, "2026-10-25", "en");
    expect(r.minutes).toBe(12);
    expect(r.sessions).toBe(1);
    expect(r.learned.map(x => x.id)).toEqual(["money_add"]);
    expect(r.practise.map(x => x.id)).toEqual(["money_add_carry"]);
    expect(r.aloneShare).toBe(58);
    expect(r.home).toBe("stall");
    prune(f, "2026-12-25");
    expect(c.sessions.find(s => s.id === "old")!.attempts).toHaveLength(0);
  });
});
