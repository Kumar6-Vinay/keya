import { createHash } from "node:crypto";
import { test } from "@playwright/test";
import { Lang } from "../src/engine/skills";
import { t } from "../src/ui/i18n";
import { expect, installFakeSpeech, seedFamily, startGame, utterances } from "./fixtures";

const back = (p: import("@playwright/test").Page) => p.locator(".navbtn[aria-label=back]");
const home = (p: import("@playwright/test").Page) => p.locator(".navbtn[aria-label=home]");
const onMap = (p: import("@playwright/test").Page) => expect(p.locator(".screen.map")).toBeVisible();
const onWho = (p: import("@playwright/test").Page) => expect(p.locator(".screen.who")).toBeVisible();

async function answerOne(p: import("@playwright/test").Page) {
  const ans = await p.evaluate(() => (window as unknown as { __turn: { item: { answer: string } } }).__turn.item.answer);
  await p.locator(".choices3 .choice", { hasText: ans }).click();
}

for (const lang of ["hi", "en"] as Lang[]) {
  test.describe(`back and home · ${lang}`, () => {
    test("buttons are labelled, big, and go one level up", async ({ page }) => {
      await installFakeSpeech(page);
      await startGame(page, "rangoli", lang);
      await expect(page.locator(".demoview")).toBeVisible();
      for (const b of [back(page), home(page)]) {
        const box = (await b.boundingBox())!;
        expect(box.height).toBeGreaterThanOrEqual(48);
      }
      await expect(back(page)).toContainText(t("back", lang));
      await expect(home(page)).toContainText(t("home", lang));
      await back(page).click(); await onMap(page);                       // game -> map
      await expect(home(page)).toHaveCount(0);                          // nothing to go home to
      await back(page).click(); await onWho(page);                      // map -> who's playing
      await expect(back(page)).toHaveCount(0);
      await expect(home(page)).toHaveCount(0);
    });

    test("Home from a game goes to the map; leaving stops speech", async ({ page }) => {
      await installFakeSpeech(page);
      await startGame(page, "rangoli", lang);
      await expect.poll(async () => (await utterances(page)).some(u => u.started)).toBe(true);
      await home(page).click(); await onMap(page);
      await page.waitForTimeout(300);
      const n = (await utterances(page)).length;
      await page.waitForTimeout(1500);
      expect(await page.evaluate(() => window.speechSynthesis.speaking)).toBe(false);
      expect((await utterances(page)).length - n).toBeLessThanOrEqual(1);   // only the map's own greeting, nothing from the game
    });

    test("skill book: Back and Home go to the map", async ({ page }) => {
      await installFakeSpeech(page);
      await page.addInitScript(f => localStorage.setItem("keya.family.v1", JSON.stringify(f)), seedFamily(lang));
      await page.goto("/");
      await page.locator(".kid").click();
      await page.locator(".maphead .ghost", { hasText: /📖/ }).click();
      await expect(page.locator(".screen.book")).toBeVisible();
      await back(page).click(); await onMap(page);
      await page.locator(".maphead .ghost", { hasText: /📖/ }).click();
      await home(page).click(); await onMap(page);
    });

    test("the phone's back button goes up one level, and the browser history stays tidy", async ({ page }) => {
      await installFakeSpeech(page);
      await startGame(page, "rangoli", lang);
      await expect(page.locator(".demoview")).toBeVisible();
      await page.goBack(); await onMap(page);
      await page.goBack(); await onWho(page);
      expect(await page.evaluate(() => history.length)).toBeLessThanOrEqual(4);
      await page.locator(".kid").click(); await onMap(page);          // and forward again works
    });

    test("leaving in the middle of a game: one gentle question, progress is saved", async ({ page }) => {
      await installFakeSpeech(page);
      await startGame(page, "rangoli", lang);
      await page.locator('[data-act="next"]').click();
      await page.locator('[data-act="next"]').click();
      await page.locator('[data-act="turn"]').click();
      await answerOne(page);
      await expect.poll(() => page.locator(".bubble.good").count()).toBeGreaterThan(0);
      await home(page).click();
      const dialog = page.getByRole("dialog");
      await expect(dialog).toContainText(t("leaveAsk", lang));
      await dialog.getByRole("button", { name: t("stay", lang) }).click();
      await expect(dialog).toHaveCount(0);
      await expect(page.locator(".screen.play")).toBeVisible();          // still playing
      await page.goBack();                                                // the phone's back button asks too
      await expect(page.getByRole("dialog")).toBeVisible();
      await page.getByRole("dialog").getByRole("button", { name: t("leave", lang) }).click();
      await onMap(page);
      const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("keya.family.v1")!).children[0].sessions);
      expect(saved.length).toBe(1);
      expect(saved[0].items).toBeGreaterThanOrEqual(1);
    });

    test("grown-ups area: Back and Home leave it, and the PIN is still needed to get in", async ({ page }) => {
      await installFakeSpeech(page);
      const pinHash = createHash("sha256").update("numbernagar:1234").digest("hex");
      await page.addInitScript(f => localStorage.setItem("keya.family.v1", JSON.stringify(f)), { ...seedFamily(lang), pinHash });
      await page.goto("/");
      await page.locator(".grown").click();
      await expect(page.locator(".screen.pin")).toBeVisible();
      await back(page).click(); await onWho(page);
      await page.locator(".grown").click();
      for (const k of "1234") await page.locator(`button[aria-label="${k}"]`).click();
      await expect(page.locator(".phead")).toBeVisible();
      await home(page).click(); await onWho(page);
      await page.locator(".grown").click();
      await expect(page.locator(".screen.pin")).toBeVisible();           // locked again
    });
  });
}
