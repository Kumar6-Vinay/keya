import { DAILY_GOAL, gamesToday, goalMet, pickGame } from "../src/engine/daily";
import { emptyLearner, rec } from "../src/engine/learner";
import { GAMES, skillsFor } from "../src/engine/skills";
import { lockMs, PIN_FREE_TRIES, reportText, weeklyReport } from "../src/store";
import type { Child } from "../src/store";

const DAY = "2026-10-25";
const child = (over: Partial<Child> = {}): Child => ({
  id: "c", nickname: "Riya", cls: 1, lang: "en", avatar: "🦚", openClasses: [1], learner: emptyLearner(), sessions: [], createdAt: DAY, ...over,
});
const session = (game: Child["sessions"][number]["game"], items = 5, date = DAY) => ({ id: `${game}${items}${date}`, date, game, minutes: 3, items, alone: items, grown: [], attempts: [] });
const master = (c: Child, game: Parameters<typeof skillsFor>[0]) => skillsFor(game).forEach(s => {
  Object.assign(rec(c.learner, s.id), { state: "mastered", p: 0.95, lastDay: DAY, nextReview: "2999-01-01" });
});

describe("daily goal", () => {
  it("counts only games with a few answers, and only today's", () => {
    const c = child({ sessions: [session("sabzi", 5), session("laddoo", 1), session("cat", 6, "2026-10-24")] });
    expect(gamesToday(c, DAY)).toBe(1);
    expect(goalMet(c, DAY)).toBe(false);
    c.sessions.push(session("rangoli", 4));
    expect(gamesToday(c, DAY)).toBe(DAILY_GOAL);
    expect(goalMet(c, DAY)).toBe(true);
  });
});

describe("pickGame", () => {
  it("starts a new child on the first game of their class", () => {
    expect(pickGame(child(), DAY)).toBe(GAMES.find(g => g.cls === 1)!.id);
  });
  it("sends a visitor to the game of a skill that is due for review", () => {
    const c = child();
    Object.assign(rec(c.learner, "bond10"), { state: "mastered", p: 0.9, nextReview: "2026-10-20" });
    expect(pickGame(c, DAY)).toBe("laddoo");
  });
  it("finishes a game already begun before opening a new one", () => {
    const c = child();
    rec(c.learner, "bond10").state = "learning";
    expect(pickGame(c, DAY)).toBe("laddoo");
  });
  it("skips games played today and alternates maths and English", () => {
    const c = child({ sessions: [session("sabzi")] });
    const g = pickGame(c, DAY);
    expect(g).not.toBe("sabzi");
    const c2 = child({ sessions: [session("sounds")] });
    expect(GAMES.find(x => x.id === pickGame(c2, DAY))!.subject).toBe("maths");
  });
  it("skips fully mastered games, never picks a closed class, and never fails when all are mastered", () => {
    const c = child();
    master(c, "sabzi");
    expect(pickGame(c, DAY)).not.toBe("sabzi");
    for (const g of GAMES) master(c, g.id);
    const g = pickGame(c, DAY);
    expect(GAMES.find(x => x.id === g)!.cls).toBe(1);
  });
});

describe("PIN lock", () => {
  it("is free for a few tries, then doubles from 30 s up to 15 minutes", () => {
    expect(lockMs(PIN_FREE_TRIES - 1)).toBe(0);
    expect(lockMs(PIN_FREE_TRIES)).toBe(30_000);
    expect(lockMs(PIN_FREE_TRIES + 1)).toBe(60_000);
    expect(lockMs(50)).toBe(15 * 60_000);
  });
});

describe("shareable report", () => {
  it("is plain text with the week's numbers, new skills and a home activity, and nothing about the PIN or other children", () => {
    const c = child({ sessions: [{ ...session("sabzi", 6), grown: ["count10"], minutes: 9, alone: 5 }] });
    rec(c.learner, "count10").state = "mastered";
    const r = weeklyReport(c, DAY, "en");
    const text = reportText(c, r);
    expect(text).toContain("Riya's week");
    expect(text).toContain("Played 9 min in 1 game, 83% done alone");
    expect(text).toContain("Counting to 10");
    expect(text).toContain("Try at home:");
    expect(text).not.toMatch(/pin/i);
  });
  it("says so when nothing was played", () => {
    expect(reportText(child(), weeklyReport(child(), DAY, "en"))).toContain("No games played this week.");
  });
});
