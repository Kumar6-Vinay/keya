import { AnswerSet, check, choices, hint, nextItem, prompt, Step } from "../src/engine/items";
import { genClass1, PIC, SENTENCES, CVC } from "../src/engine/class1";
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
  it("has 7 games and 22 skills, every one with a chapter", () => {
    expect(new Set(C1.map(s => s.game)).size).toBe(7);
    expect(C1).toHaveLength(22);
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
