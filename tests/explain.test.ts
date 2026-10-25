import { AnswerSet, explain, nextItem, Step } from "../src/engine/items";
import { makeRng } from "../src/engine/rng";
import { SKILLS } from "../src/engine/skills";

describe("explain: why the answer is right", () => {
  it("gives a real sentence for every skill, step and language", () => {
    const rng = makeRng(5);
    for (const s of SKILLS) for (const step of [1, 2, 3] as Step[]) for (let i = 0; i < 40; i++) {
      const it = nextItem(s.id, step, rng, new AnswerSet());
      for (const lang of ["en", "hi"] as const) {
        const e = explain(it, lang);
        expect(e.length, `${s.id} ${lang}`).toBeGreaterThan(8);
        expect(e).not.toMatch(/undefined|NaN|\[object/);
      }
    }
  });
  it("states the sum for a column item and the pair for a number bond", () => {
    const col = { kind: "column", skill: "x", a: 52, b: 27, op: "-" } as const;
    expect(explain(col, "en")).toContain("52 − 27 = 25");
    const bond = { kind: "bond", skill: "bond10", size: 10, filled: 7, say: false } as const;
    expect(explain(bond, "en")).toContain("7 and 3 make 10");
  });
});
