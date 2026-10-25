import { test } from "@playwright/test";
import { expect, installFakeSpeech, seedFamily, utterances } from "./fixtures";

const open = async (page: import("@playwright/test").Page, lang: "hi" | "en") => {
  await installFakeSpeech(page);
  await page.addInitScript(f => localStorage.setItem("keya.family.v1", JSON.stringify(f)), seedFamily(lang));
  await page.goto("/");
  await page.locator(".kid").click();
};

test("Play with Keya starts a game in one tap, and the buttons are big", async ({ page }) => {
  await open(page, "hi");
  const btn = page.locator(".playkeya");
  expect((await btn.boundingBox())!.height).toBeGreaterThanOrEqual(80);
  await expect(page.locator(".goal span")).toHaveCount(2);
  await btn.click();
  await expect(page.locator(".screen.play")).toBeVisible();
});

test("a tile's speaker reads its title aloud without opening the game", async ({ page }) => {
  await open(page, "en");
  const before = (await utterances(page)).length;
  await page.locator(".tilesay").first().click();
  await expect(page.locator(".screen.map")).toBeVisible();
  await expect.poll(async () => (await utterances(page)).slice(before).some(u => u.text.includes("Sabzi Cart"))).toBe(true);
  expect((await page.locator(".tilesay").first().boundingBox())!.width).toBeGreaterThanOrEqual(48);
});

test("the grown-up PIN pad shuts for a while after three wrong tries", async ({ page }) => {
  await open(page, "en");
  await page.locator(".navbtn[aria-label=back]").click();
  await page.locator(".grown").click();
  for (let i = 0; i < 3; i++) for (const k of "9999") await page.getByRole("button", { name: k, exact: true }).click();
  await expect(page.locator(".err[role=alert]")).toBeVisible();
  await expect(page.getByRole("button", { name: "1", exact: true })).toBeDisabled();
  await page.reload();
  await page.locator(".grown").click();
  await expect(page.getByRole("button", { name: "1", exact: true })).toBeDisabled();   // still shut after a reload
});

test("fonts come from the app itself, not Google", async ({ page }) => {
  const hosts = new Set<string>();
  page.on("request", r => hosts.add(new URL(r.url()).hostname));
  await open(page, "hi");
  await page.waitForTimeout(500);
  expect([...hosts].filter(h => /google|gstatic/.test(h))).toEqual([]);
});
