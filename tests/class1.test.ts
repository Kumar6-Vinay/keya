import { AnswerSet, check, choices, hint, mistakeFeedback, nextItem, prompt, Step } from "../src/engine/items";
import { genClass1, PIC, SENTENCES, CVC, RHYMES, COLOURS, THINGS } from "../src/engine/class1";
import { weeklyReport } from "../src/store";
import type { Child } from "../src/store";
import { makeRng } from "../src/engine/rng";
import { SKILLS } from "../src/engine/skills";
import { Session } from "../src/engine/session";
import { emptyLearner, rec } from "../src/engine/learner";
import type { Item } from "../src/engine/items";

const C1 = SKILLS.filter(s => s.cls === 1);

/** The correct answer for any Class 1 item, in the shape check() expects. */
function right(it: Item) {
  switch (it.kind) {
    case "count": return { value: it.n };
    case "bond": return { value: it.size - it.filled };
    case "arith1": return { value: it.op === "+" ? it.a + it.b : it.a - it.b };
    case "pick": return it.mode === "build_word" ? { word: it.answer } : { pick: it.answer };
    default: throw new Error("not class 1");
  }
}

describe("class 1 generators", () => {
  it("has 10 games and 28 skills, every one with a chapter", () => {
    expect(new Set(C1.map(s => s.game)).size).toBe(10);
    expect(C1).toHaveLength(28);
    expect(C1.every(s => s.chapter.length > 5)).toBe(true);
  });

  it("every skill at every step makes valid, checkable items in both languages (300 each)", () => {
    const rng = makeRng(11);
    for (const s of C1) for (const step of [1, 2, 3] as Step[]) for (let i = 0; i < 300; i++) {
      const it = nextItem(s.id, step, rng, new AnswerSet());
      expect(check(it, right(it) as never).ok).toBe(true);
      for (const lang of ["en", "hi"] as const) {
        expect(prompt(it, lang).length).toBeGreaterThan(3);
        for (const lv of [1, 2, 3, 4]) expect(hint(it, lv, lang)).toBeTruthy();
      }
      if (it.kind === "count") expect(it.n).toBeGreaterThan(0);
      if (it.kind === "count" && s.id === "count10") expect(it.n).toBeLessThanOrEqual(10);
      if (it.kind === "count" && s.id === "count20") { expect(it.n).toBeGreaterThan(10); expect(it.n).toBeLessThanOrEqual(20); }
      if (it.kind === "bond") { expect(it.filled).toBeGreaterThan(0); expect(it.filled).toBeLessThan(it.size); }
      if (it.kind === "arith1") {
        const r = it.op === "+" ? it.a + it.b : it.a - it.b;
        expect(r).toBeGreaterThanOrEqual(0);
        expect(r).toBeLessThanOrEqual(s.id === "addsub20" ? 20 : 10);
        expect(it.b).toBeGreaterThan(0);
      }
      if (it.kind === "pick") {
        expect(new Set(it.options).size).toBe(it.options.length);           // no duplicate choices
        expect(it.options).toContain(it.mode === "build_word" ? it.answer[0] : it.answer);
        if (["first_sound", "letter_sound", "read_word", "vocab"].includes(it.mode)) it.options.forEach(o => expect(PIC[o]).toBeTruthy());
        if (it.mode === "build_word") for (const ch of it.answer) expect(it.options).toContain(ch);
        if (it.mode === "pattern_fix") expect(it.seq!.length).toBeGreaterThan(4);
      }
    }
  });

  it("first-sound items have exactly one picture that starts with the target sound", () => {
    const rng = makeRng(12);
    const startsSame = (a: string, b: string) => a[0] === b[0] || ("ck".includes(a[0]) && "ck".includes(b[0]));
    for (let i = 0; i < 500; i++) {
      const it = genClass1("first_sound", 2, rng)!;
      if (it.kind !== "pick") throw 0;
      expect(it.options.filter(o => startsSame(o, it.target))).toHaveLength(1);
    }
  });

  it("letter-sound items: only the answer starts with the letter's sound", () => {
    const rng = makeRng(13);
    for (let i = 0; i < 500; i++) {
      const it = genClass1("letter_sound", 3, rng)!;
      if (it.kind !== "pick") throw 0;
      const L = it.target === "c" ? "ck" : it.target;
      expect(it.options.filter(o => L.includes(o[0]))).toEqual([it.answer]);
    }
  });

  it("pattern_fix: the marked tile is the only one that breaks the pattern", () => {
    const rng = makeRng(14);
    for (let i = 0; i < 300; i++) {
      const it = genClass1("pat_fix", (1 + (i % 3)) as Step, rng)!;
      if (it.kind !== "pick" || !it.seq) throw 0;
      const bad = Number(it.answer), fixed = it.seq.slice();
      const unitLen = new Set(it.seq.filter((_, k) => k !== bad)).size;
      fixed[bad] = fixed[bad - unitLen] ?? fixed[bad + unitLen];
      expect(fixed.every((t, k) => k < unitLen || t === fixed[k - unitLen])).toBe(true);
    }
  });

  it("all CVC words and sentence pictures exist", () => {
    CVC.forEach(w => { expect(w).toHaveLength(3); expect(PIC[w]).toBeTruthy(); });
    SENTENCES.forEach(s => expect(new Set([s.pic, ...s.near]).size).toBe(3));
  });
});

describe("class 1 checking names the mistake", () => {
  it("maths", () => {
    expect(check({ kind: "arith1", skill: "sub10", a: 8, b: 3, op: "-", thing: "o" }, { value: 11 } as never).mistake).toBe("wrong_op");
    expect(check({ kind: "bond", skill: "bond10", size: 10, filled: 6, say: true }, { value: 5 } as never).mistake).toBe("overfilled");
    expect(check({ kind: "count", skill: "count10", n: 7, veg: "x", bundle: false }, { value: 6 } as never).mistake).toBe("off_by_one");
    expect(check({ kind: "pick", skill: "more_less", mode: "more", target: "x", options: ["A", "B"], answer: "A" }, { pick: "B" }).mistake).toBe("chose_opposite");
  });
  it("english", () => {
    expect(check({ kind: "pick", skill: "build_cvc", mode: "build_word", target: "pig", options: [], answer: "pig" }, { word: "gip" }).mistake).toBe("letters_out_of_order");
    expect(check({ kind: "pick", skill: "build_cvc", mode: "build_word", target: "pig", options: [], answer: "pig" }, { word: "pug" }).mistake).toBe("vowel_swap");
    expect(check({ kind: "pick", skill: "letter_pick", mode: "letter_pick", target: "bat", options: ["b", "d", "p"], answer: "b" }, { pick: "d" }).mistake).toBe("letter_reversal");
    expect(choices({ kind: "pick", skill: "vocab", mode: "vocab", target: "cow", options: ["cow", "hen", "goat"], answer: "cow" })).toBe(3);
  });
});

describe("class 1 sessions", () => {
  it("a child who answers well masters the first level of every Class 1 game", () => {
    for (const g of [...new Set(C1.map(s => s.game))]) {
      const l = emptyLearner();
      const s = new Session(l, g, "2026-10-25", makeRng(21), 60);
      let grew: string | undefined;
      for (let i = 0; i < 40 && !grew; i++) grew = s.submit(true).grew;
      expect(grew, g).toBeTruthy();
      expect(rec(l, grew!).state).toBe("mastered");
    }
  });
});

describe("calm garden games", () => {
  const gen = (skill: string, step: Step, rng: ReturnType<typeof makeRng>) => {
    const it = genClass1(skill, step, rng)!;
    if (it.kind !== "pick") throw new Error("pick item expected");
    return it;
  };
  const familyOf = (w: string) => RHYMES.findIndex(f => f.includes(w));

  it("colours: the colour asked for is among the choices, once; step 3 has four", () => {
    const rng = makeRng(31);
    for (let i = 0; i < 300; i++) {
      const step = (1 + (i % 3)) as Step, it = gen("colour_pick", step, rng);
      expect(it.options).toHaveLength(step === 3 ? 4 : 3);
      expect(it.options.filter(o => o === it.target)).toHaveLength(1);
      expect(it.answer).toBe(it.target);
      expect(COLOURS as readonly string[]).toContain(it.answer);
      expect(THINGS as readonly string[]).toContain(it.seq![0]);
    }
  });

  it("sizes: the answer is the biggest or smallest one, as the prompt says", () => {
    const rng = makeRng(32);
    for (let i = 0; i < 300; i++) {
      const step = (1 + (i % 3)) as Step, it = gen("size_compare", step, rng);
      expect(it.options).toHaveLength(step === 1 ? 2 : 3);
      expect(it.answer).toBe(it.seq![0] === "big" ? "3" : "1");
      expect(prompt(it, "en")).toContain(it.seq![0]);
    }
  });

  it("counting and matching: 1 to 10, three different numbers, one of them right", () => {
    const rng = makeRng(33);
    for (let i = 0; i < 300; i++) {
      const it = gen("count_match", (1 + (i % 3)) as Step, rng);
      const n = Number(it.answer);
      expect(n).toBeGreaterThanOrEqual(1); expect(n).toBeLessThanOrEqual(10);
      expect(it.options.map(Number).every(x => x >= 1 && x <= 10)).toBe(true);
      expect(it.options).toHaveLength(3);
    }
  });

  it("which number comes next: three in a row, the answer is one more, and the choices do not repeat the ones shown", () => {
    const rng = makeRng(34);
    for (let i = 0; i < 300; i++) {
      const it = gen("num_next", (1 + (i % 3)) as Step, rng);
      const [a, b, c] = it.seq!.map(Number);
      expect([b - a, c - b]).toEqual([1, 1]);
      expect(Number(it.answer)).toBe(c + 1);
      expect(Number(it.answer)).toBeLessThanOrEqual(20);
      expect(it.options.filter(o => it.seq!.includes(o))).toHaveLength(0);
    }
  });

  it("rhymes: every word has a picture; the right word rhymes, the others do not", () => {
    RHYMES.flat().forEach(w => expect(PIC[w], w).toBeTruthy());
    const rng = makeRng(35);
    for (let i = 0; i < 400; i++) {
      const step = (1 + (i % 3)) as Step, it = gen("rhyme_pick", step, rng);
      expect(familyOf(it.answer)).toBe(familyOf(it.target));
      expect(it.answer).not.toBe(it.target);
      const wrong = it.options.filter(o => o !== it.answer);
      expect(wrong).toHaveLength(2);
      wrong.forEach(w => expect(familyOf(w)).not.toBe(familyOf(it.target)));
      if (step === 1) wrong.forEach(w => expect(w[0]).not.toBe(it.target[0]));
      it.options.forEach(o => expect(PIC[o]).toBeTruthy());
    }
  });

  it("rhyme odd one out: exactly two rhyme and the answer is the other", () => {
    const rng = makeRng(36);
    for (let i = 0; i < 400; i++) {
      const it = gen("rhyme_odd", (1 + (i % 3)) as Step, rng);
      const [a, b] = it.seq!;
      expect(familyOf(a)).toBe(familyOf(b));
      expect(familyOf(it.answer)).not.toBe(familyOf(a));
      expect(new Set(it.options)).toEqual(new Set([a, b, it.answer]));
    }
  });

  it("picking a word that starts the same gets a gentle, specific reply", () => {
    const item: Item = { kind: "pick", skill: "rhyme_pick", mode: "rhyme", target: "cat", options: ["hat", "cap", "dog"], answer: "hat" };
    const wrong = check(item, { pick: "cap" });
    expect(wrong).toEqual({ ok: false, mistake: "same_start" });
    expect(mistakeFeedback("same_start", "en")).toMatch(/end/);
    expect(mistakeFeedback("same_start", "hi").length).toBeGreaterThan(10);
  });

  it("an answer is not repeated within a session, even with few words", () => {
    const rng = makeRng(37), used = new AnswerSet();
    const keys = new Set<string>();
    for (let i = 0; i < 12; i++) { const it = nextItem("colour_pick", 1, rng, used); keys.add(JSON.stringify([it.skill, (it as { target: string }).target, (it as { seq: string[] }).seq])); }
    expect(keys.size).toBe(12);
  });
});

describe("saved data from before the new games", () => {
  /** A family saved by the previous version: only the older skills are known. */
  const old = (): Child => ({
    id: "c1", nickname: "Riya", cls: 1, lang: "hi", avatar: "🦚", openClasses: [1], createdAt: "2026-10-01T00:00:00Z",
    learner: { skills: { count10: { state: "mastered", p: 0.9, lastDay: "2026-10-20", reviewStep: 0, nextReview: "2026-10-22", masteredOn: "2026-10-20", workedInRow: 0 } }, misconceptions: {} },
    sessions: [{ id: "s1", date: "2026-10-20", game: "sabzi", minutes: 5, items: 6, alone: 4, grown: ["count10"], attempts: [{ skill: "count10", correct: true, hint: 0, phase: "practice" }] }],
  });

  it("every new game starts for a child with old data, and old progress is untouched", () => {
    for (const g of ["colours", "butterfly", "rhyme"] as const) {
      const child = old();
      const s = new Session(child.learner, g, "2026-10-25", makeRng(41), 60);
      let grew: string | undefined;
      for (let i = 0; i < 40 && !grew; i++) grew = s.submit(true).grew;      // the old due review comes first, as it should
      expect(grew, g).toBeTruthy();
      expect(SKILLS.find(k => k.id === grew)!.game).toBe(g);
      expect(child.learner.skills.count10.state).toBe("mastered");
    }
  });

  it("the weekly report still builds for old data, before and after playing a new game", () => {
    const child = old();
    expect(() => weeklyReport(child, "2026-10-25", "en")).not.toThrow();
    const s = new Session(child.learner, "rhyme", "2026-10-25", makeRng(42), 60);
    for (let i = 0; i < 6; i++) s.submit(true);
    expect(() => weeklyReport(child, "2026-10-25", "hi")).not.toThrow();
  });
});
