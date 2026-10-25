import { emptyLearner, rec } from "../src/engine/learner";
import { grantDailySticker, skillPath, STICKERS } from "../src/engine/stickers";
import { skillsFor } from "../src/engine/skills";
import type { Child } from "../src/store";

const child = (): Child => ({ id: "c", nickname: "Riya", cls: 1, lang: "en", avatar: "🦚", openClasses: [1], learner: emptyLearner(), sessions: [], stickers: [], createdAt: "2026-10-01" });

describe("daily sticker", () => {
  it("gives one a day, in order, and never twice on the same day", () => {
    const c = child();
    expect(grantDailySticker(c, "2026-10-25")?.id).toBe(STICKERS[0].id);
    expect(grantDailySticker(c, "2026-10-25")).toBeNull();
    expect(grantDailySticker(c, "2026-10-27")?.id).toBe(STICKERS[1].id);     // a missed day loses nothing
    expect(c.stickers).toHaveLength(2);
  });
  it("stops quietly when every sticker is collected, and keeps all of them", () => {
    const c = child();
    STICKERS.forEach((_, i) => grantDailySticker(c, `2026-11-${String(i + 1).padStart(2, "0")}`));
    expect(c.stickers).toHaveLength(STICKERS.length);
    expect(grantDailySticker(c, "2027-01-01")).toBeNull();
    expect(c.stickers).toHaveLength(STICKERS.length);
  });
  it("has unique ids and a name in both languages", () => {
    expect(new Set(STICKERS.map(s => s.id)).size).toBe(STICKERS.length);
    for (const s of STICKERS) { expect(s.name.en).toBeTruthy(); expect(s.name.hi).toBeTruthy(); }
  });
});

describe("skill path", () => {
  it("starts with level 1 as next and the rest shut; built levels move the next marker on", () => {
    const c = child();
    const levels = skillsFor("sabzi");
    let path = skillPath(c, "sabzi");
    expect(path.map(p => p.state)[0]).toBe("next");
    expect(path.filter(p => p.state === "next")).toHaveLength(1);
    rec(c.learner, levels[0].id).state = "mastered";
    path = skillPath(c, "sabzi");
    expect(path[0].state).toBe("built");
    expect(path.filter(p => p.state === "next")).toHaveLength(1);
    for (const l of levels) rec(c.learner, l.id).state = "secure";
    expect(skillPath(c, "sabzi").every(p => p.state === "built")).toBe(true);
  });
});
