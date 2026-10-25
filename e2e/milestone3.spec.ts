import { test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { expect, installFakeSpeech, seedFamily, utterances } from "./fixtures";
import type { Page } from "@playwright/test";

const DAY = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
const seed = (page: Page, edit: (f: ReturnType<typeof seedFamily>) => void, lang: "en" | "hi" = "en") => {
  const f = seedFamily(lang); edit(f);
  return page.addInitScript(x => { if (!localStorage.getItem("keya.family.v1")) localStorage.setItem("keya.family.v1", JSON.stringify(x)); }, f);   // only the first load, so a reload keeps what the app saved
};
const session = (game: string, n: number) => ({ id: `${game}${n}`, date: DAY, game, minutes: 3, items: 5, alone: 5, grown: [], attempts: [] });

test("finishing a game on a day the goal is met brings one sticker, once, and it is kept in Keya's home", async ({ page }) => {
  await installFakeSpeech(page);
  // Two games already played today and a 1-second limit: the item on screen is the last one.
  await seed(page, f => { f.limitMin = 0.02; (f.children[0] as { sessions: unknown[] }).sessions = [session("sabzi", 1), session("laddoo", 2)]; });
  const playOne = async () => {
    await page.locator(".kid").click();
    await page.locator('.district:has(.dicon:text-is("🌺"))').click();
    await page.locator("[data-act=next], .controls").first().waitFor();
    await page.waitForTimeout(300);                                      // the screen opens in play mode, then switches to the demo for a new skill
    if (await page.locator("[data-act=next]").count()) { await page.locator("[data-act=next]").click(); await page.locator("[data-act=next]").click(); await page.locator("[data-act=turn]").click(); }
    await page.waitForTimeout(1500);
    const ans = await page.evaluate(() => (window as unknown as { __turn: { item: { answer: string } } }).__turn.item.answer);
    await page.locator(".choices3 .choice:enabled", { hasText: ans }).first().click();
    await page.locator(".controls .primary").click();                     // Next: the time is up, so the game ends
  };
  await page.goto("/");
  await playOne();
  await expect(page.locator(".screen.goodbye")).toBeVisible();
  await expect(page.locator(".newsticker")).toBeVisible();
  await page.locator(".screen.goodbye .primary").click();
  await playOne();
  await expect(page.locator(".screen.goodbye")).toBeVisible();
  await expect(page.locator(".newsticker")).toHaveCount(0);               // the same day: no second sticker
  await page.locator(".navbtn[aria-label=home]").click();
  await page.locator("button", { hasText: "Keya's home" }).click();
  await expect(page.locator(".sticker.got")).toHaveCount(1);
});

test("the sticker wall shows collected stickers and says their names", async ({ page }) => {
  await installFakeSpeech(page);
  await seed(page, f => { (f.children[0] as unknown as { stickers: unknown[] }).stickers = [{ id: "sun", day: "2026-10-01" }, { id: "kite", day: "2026-10-02" }]; });
  await page.goto("/");
  await page.locator(".kid").click();
  await page.locator("button", { hasText: "Keya's home" }).click();
  await expect(page.locator(".sticker.got")).toHaveCount(2);
  await expect(page.locator(".count")).toContainText("2 /");
  const n = (await utterances(page)).length;
  await page.locator(".sticker.got").first().click();
  await expect.poll(async () => (await utterances(page)).slice(n).some(u => u.text.includes("Sunshine"))).toBe(true);
});

test("skill path: built, next and shut levels; the next one starts the game", async ({ page }) => {
  await installFakeSpeech(page);
  await page.emulateMedia({ reducedMotion: "reduce" });                    // also proves the path works without animation
  await seed(page, f => { (f.children[0].learner.skills as Record<string, unknown>)["count10"] = { state: "mastered", p: .95, lastDay: "2026-10-01", reviewStep: 0, nextReview: "2999-01-01", masteredOn: "2026-10-01", workedInRow: 0 }; });
  await page.goto("/");
  await page.locator(".kid").click();
  await page.getByRole("button", { name: /skill book/i }).click();
  const row = page.locator(".pathrow").first();
  await expect(row.locator(".node.built")).toHaveCount(1);
  await expect(row.locator(".node.next")).toHaveCount(1);
  expect((await row.locator(".node").first().boundingBox())!.width).toBeGreaterThanOrEqual(48);
  await row.locator(".node.shut").first().click();
  await expect(page.locator(".pathnote")).toBeVisible();
  await row.locator(".node.next").click();
  await expect(page.locator(".screen.play")).toBeVisible();
});

test("easy-read letters and larger text switch on from the grown-up settings and stay on", async ({ page }) => {
  await installFakeSpeech(page);
  const { createHash } = await import("node:crypto");
  await seed(page, f => { f.pinHash = createHash("sha256").update("numbernagar:1234").digest("hex"); });
  await page.goto("/");
  await page.locator(".grown").click();
  for (const k of "1234") await page.getByRole("button", { name: k, exact: true }).click();
  const readable = page.locator(".field", { hasText: "Easy-read letters" }).getByRole("button", { name: "On" });
  await readable.click();
  await page.locator(".field", { hasText: "Larger text" }).getByRole("button", { name: "On" }).click();
  const has = (a: string) => page.evaluate(x => document.documentElement.hasAttribute(x), a);
  await expect.poll(() => has("data-readable")).toBe(true);
  await expect.poll(() => has("data-bigtext")).toBe(true);
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.body).fontFamily)).toContain("OpenDyslexic");
  await page.reload();
  await expect.poll(() => has("data-readable")).toBe(true);
});

for (const lang of ["en", "hi"] as const) {
  test(`no serious accessibility problems on the main screens · ${lang}`, async ({ page }) => {
    await installFakeSpeech(page);
    await seed(page, f => { (f.children[0].learner.skills as Record<string, unknown>)["count10"] = { state: "mastered", p: .95, lastDay: "2026-10-01", reviewStep: 0, nextReview: "2999-01-01", masteredOn: "2026-10-01", workedInRow: 0 }; }, lang);
    const scan = async (where: string) => {
      await page.waitForTimeout(500);                                       // let entrance animations finish before measuring colour
      const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
      const bad = r.violations.filter(v => v.impact === "serious" || v.impact === "critical");
      expect(bad.map(v => `${where}: ${v.id} (${v.nodes.length}) ${v.nodes[0].target} ${v.nodes[0].any[0]?.message}`)).toEqual([]);
    };
    await page.goto("/");
    await scan("who");
    await page.locator(".kid").click();
    await scan("map");
    await page.locator(".playkeya").click();
    await scan("game");
    await page.locator(".navbtn[aria-label=home]").click();
    await page.getByRole("button", { name: /skill book|कौशल/i }).click();
    await scan("skill book");
    await page.locator(".screen.book .primary").click();
    await page.locator("button", { hasText: /Keya's home|केया का घर/ }).click();
    await scan("home");
  });
}
