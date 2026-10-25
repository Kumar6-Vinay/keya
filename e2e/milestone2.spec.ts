import { createHash } from "node:crypto";
import { test } from "@playwright/test";
import { explain } from "../src/engine/items";
import type { Item } from "../src/engine/items";
import { expect, installFakeSpeech, seedFamily, startGame, utterances } from "./fixtures";

type Turned = { item: Item & { answer: string } };
const turn = (p: import("@playwright/test").Page) => p.evaluate(() => (window as unknown as { __turn: Turned }).__turn);

test("a right answer says why, and Next moves on at once", async ({ page }) => {
  await installFakeSpeech(page);
  await startGame(page, "rangoli", "en");
  await page.locator("[data-act=next]").click(); await page.locator("[data-act=next]").click(); await page.locator("[data-act=turn]").click();
  const t = await turn(page);
  await page.locator(".choices3 .choice", { hasText: t.item.answer }).click();
  await expect(page.locator(".bubble.good")).toContainText(explain(t.item, "en"));
  await expect.poll(async () => (await utterances(page)).some(u => u.text.includes(explain(t.item, "en").slice(0, 12)))).toBe(true);
  await page.locator(".controls .primary").click();             // Next
  await expect(page.locator(".bubble.good")).toHaveCount(0);
  expect((await turn(page)).item).not.toEqual(t.item);
});

test("the town shows what was mastered and a tap says what it is", async ({ page }) => {
  await installFakeSpeech(page);
  const f = seedFamily("en");
  (f.children[0].learner.skills as Record<string, unknown>)["count10"] = { state: "mastered", p: 0.95, lastDay: "2026-10-01", reviewStep: 0, nextReview: "2999-01-01", masteredOn: "2026-10-01", workedInRow: 0 };
  await page.addInitScript(x => localStorage.setItem("keya.family.v1", JSON.stringify(x)), f);
  await page.goto("/");
  await page.locator(".kid").click();
  await expect(page.locator(".place")).toHaveCount(1);
  await expect(page.locator(".townscore")).toContainText("1 /");
  const n = (await utterances(page)).length;
  await page.locator(".place").click();
  await expect.poll(async () => (await utterances(page)).slice(n).some(u => u.text.includes("vegetable cart"))).toBe(true);
});

test("an empty town invites the child to play", async ({ page }) => {
  await installFakeSpeech(page);
  await page.addInitScript(x => localStorage.setItem("keya.family.v1", JSON.stringify(x)), seedFamily("en"));
  await page.goto("/");
  await page.locator(".kid").click();
  await expect(page.locator(".emptytown")).toBeVisible();
});

test("the grown-up report can be copied", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await installFakeSpeech(page);
  const f = seedFamily("en");
  f.pinHash = createHash("sha256").update("numbernagar:1234").digest("hex");        // the app's salt, kept so old PINs still work
  await page.addInitScript(x => localStorage.setItem("keya.family.v1", JSON.stringify(x)), f);
  await page.goto("/");
  await page.locator(".grown").click();
  for (const k of "1234") await page.getByRole("button", { name: k, exact: true }).click();
  await page.getByRole("button", { name: "Copy", exact: true }).click();
  await expect(page.getByRole("button", { name: /Copied/ })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain("Riya's week");
});
