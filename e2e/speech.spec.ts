import { test } from "@playwright/test";
import { Lang } from "../src/engine/skills";
import { expect, expectedParts, installFakeSpeech, spokenSince, startGame, utterances } from "./fixtures";

const bubbleText = async (page: import("@playwright/test").Page) => (await page.locator(".guide .bubble").textContent())!.trim();
const startedTexts = async (page: import("@playwright/test").Page, from = 0) => (await spokenSince(page, from)).filter(u => u.started).map(u => u.text);

test.describe("speech in the real app", () => {
  test("normal engine: no notice, and the line is heard", async ({ page }) => {
    await installFakeSpeech(page);
    await startGame(page, "rangoli", "hi");
    const line = await bubbleText(page);
    await expect.poll(() => startedTexts(page).then(t => t.slice(-expectedParts(line, "hi").length))).toEqual(expectedParts(line, "hi"));
    await expect(page.locator(".speech-notice")).toHaveCount(0);
  });

  for (const lang of ["hi", "en"] as Lang[]) {
    test(`speech blocked (as in an embedded frame): a visible notice, never silent about it · ${lang}`, async ({ page }) => {
      await installFakeSpeech(page, { deny: true });
      await startGame(page, "rangoli", lang);
      const notice = page.locator('.speech-notice[data-notice="blocked"]');
      await expect(notice).toBeVisible({ timeout: 8000 });
      await expect(notice).toContainText(lang === "hi" ? "प्रीव्यू" : "preview frame");
      await expect(page.locator(".guide .bubble")).toBeVisible();                       // the text is still there
    });
  }

  test("blocked, then allowed: a tap plays the waiting line and clears the notice", async ({ page }) => {
    await installFakeSpeech(page, { deny: true });
    await startGame(page, "rangoli", "hi");
    await expect(page.locator('.speech-notice[data-notice="blocked"]')).toBeVisible({ timeout: 8000 });
    await page.evaluate(() => {                                                          // the browser now allows speech
      const s = window.speechSynthesis as unknown as { speak: (u: { text: string; onstart?: () => void; onend?: () => void }) => void };
      const w = window as unknown as { __utts: { text: string; started: boolean; ended: boolean; error: string | null }[] };
      s.speak = u => { const rec = { text: u.text, lang: "", voice: null, t: 0, started: false, ended: false, error: null as string | null }; w.__utts.push(rec); setTimeout(() => { rec.started = true; u.onstart?.(); setTimeout(() => { rec.ended = true; u.onend?.(); }, 80); }, 5); };
    });
    const n = (await utterances(page)).length;
    await page.locator(".speech-notice button.soft").click();
    await expect.poll(() => startedTexts(page, n).then(t => t.length)).toBeGreaterThan(0);
    await expect(page.locator(".speech-notice")).toHaveCount(0);
  });

  test("no Hindi voice: a notice says so in Hindi mode, and not in English mode", async ({ page, browser }) => {
    await installFakeSpeech(page, { hindi: false });
    await startGame(page, "rangoli", "hi");
    await expect(page.locator('.speech-notice[data-notice="no-hindi"]')).toBeVisible({ timeout: 8000 });
    await expect(page.locator(".guide .bubble")).toBeVisible();

    const ctx = await browser.newContext({ viewport: { width: 412, height: 839 } });
    const en = await ctx.newPage();
    await installFakeSpeech(en, { hindi: false });
    await startGame(en, "rangoli", "en");
    await expect(en.locator(".demoview")).toBeVisible();
    await en.waitForTimeout(800);
    await expect(en.locator(".speech-notice")).toHaveCount(0);
    await ctx.close();
  });

  test("an engine that swallows a line (busy, no events): the line is still heard, nothing stays stuck", async ({ page }) => {
    await installFakeSpeech(page, { swallowFirst: "पहले मुझे" });
    await startGame(page, "rangoli", "hi");
    const line = await bubbleText(page);
    const parts = expectedParts(line, "hi");
    await expect.poll(() => startedTexts(page).then(t => t.slice(-parts.length)), { timeout: 12000 }).toEqual(parts);
    await expect(page.locator(".speech-notice")).toHaveCount(0);
    const all = await utterances(page);
    const swallowed = all.filter(u => !u.started && !u.error);                            // handed to the engine, never started, no error: a real wedge
    expect(swallowed.length).toBe(1);
    expect(all.filter(u => u.started && u.text === swallowed[0].text).length).toBeGreaterThan(0);   // the same words were spoken on the retry
    // and the next lines are fine
    await page.locator('[data-act="next"]').click();
    const line1 = await bubbleText(page);
    await expect.poll(() => startedTexts(page).then(t => t.slice(-expectedParts(line1, "hi").length)), { timeout: 8000 }).toEqual(expectedParts(line1, "hi"));
  });

  test("Say again works every time, in the demo and in play", async ({ page }) => {
    await installFakeSpeech(page);
    await startGame(page, "rangoli", "hi");
    await page.locator('[data-act="turn"], [data-act="next"]').first().click();
    await page.locator('[data-act="next"]').click();
    await page.locator('[data-act="turn"]').click();
    const own = await bubbleText(page);
    for (let i = 0; i < 4; i++) {
      const n = (await utterances(page)).length;
      await page.locator(".controls .soft").first().click();
      await expect.poll(() => startedTexts(page, n)).toEqual(expectedParts(own, "hi"));
    }
  });

  test("the sound switch: off is silent, on says the line again, every time", async ({ page }) => {
    await installFakeSpeech(page);
    await startGame(page, "rangoli", "en");
    const sw = page.getByRole("button", { name: "sound" });
    for (let i = 0; i < 3; i++) {
      await sw.click();                                                                  // off
      await expect(sw).toHaveText("🔇");
      const n = (await utterances(page)).length;
      await page.locator('[data-act="next"]').click();                                    // a new step while muted: shown, not spoken
      await page.waitForTimeout(300);
      expect((await utterances(page)).length).toBe(n);
      const line = await bubbleText(page);
      await sw.click();                                                                  // on
      await expect(sw).toHaveText("🔊");
      await expect.poll(() => startedTexts(page, n)).toEqual(expectedParts(line, "en"));
      await page.locator('[data-act="again"]').click();                                  // back to step 1 for the next round
      await expect(page.locator(".demoview")).toHaveAttribute("data-demo-step", "0");
    }
  });

  test("lines in quick succession: the last one is heard in full and the engine ends idle", async ({ page }) => {
    await installFakeSpeech(page);
    await startGame(page, "rangoli", "hi");
    await expect(page.locator(".demoview")).toBeVisible();
    await page.locator('[data-act="next"]').click();
    await page.locator('[data-act="next"]').click();
    const last = await bubbleText(page);
    await expect.poll(() => startedTexts(page).then(t => t.slice(-expectedParts(last, "hi").length)), { timeout: 8000 }).toEqual(expectedParts(last, "hi"));
    await expect.poll(() => page.evaluate(() => window.speechSynthesis.speaking), { timeout: 8000 }).toBe(false);
  });
});
