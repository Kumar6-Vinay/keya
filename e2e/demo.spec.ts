import { test } from "@playwright/test";
import { GAMES, GameId, Lang, SKILLS } from "../src/engine/skills";
import { t } from "../src/ui/i18n";
import { expect, expectedParts, installFakeSpeech, spokenSince, startGame, utterances } from "./fixtures";

/** For each game's first skill: what must be visible after step 1 ("show how") and step 2 ("answer"). */
const EXPECT: Record<GameId, { s1: string; s2: string; note: string }> = {
  sabzi:    { s1: ".cart.demo-focus",                s2: ".cart.demo-answer",           note: "cart filled and counted, then the order is ringed" },
  laddoo:   { s1: ".cell.empty.demo-focus",          s2: ".cell.added.demo-answer",     note: "empty spaces ringed, then filled" },
  cat:      { s1: ".choice.demo-focus",              s2: ".choice.right.demo-answer",   note: "pictures named, then the right one ringed" },
  rangoli:  { s1: ".unitbox.demo-focus",             s2: ".tok.slot.filled.demo-answer", note: "each repeating part boxed, then ? filled" },
  sounds:   { s1: ".bigword.demo-focus",             s2: ".choice.right.demo-answer",   note: "the word ringed, then the right picture" },
  caps:     { s1: ".caps.demo-focus",                s2: ".choice.right.demo-answer",   note: "the letters ringed, then the right picture" },
  listen:   { s1: ".bigword.demo-focus",             s2: ".choice.right.demo-answer",   note: "the word ringed, then the right picture" },
  beads:    { s1: ".split.demo-focus",               s2: ".tray.demo-answer",           note: "tens and ones ringed, then the necklace" },
  stall:    { s1: ".money.demo-focus",               s2: ".answer.demo-answer",         note: "notes and coins ringed, then the total" },
  share:    { s1: ".plates.demo-focus",              s2: ".plates.demo-answer",         note: "one on each plate, then all shared" },
  hundreds: { s1: ".split.demo-focus",               s2: ".tray.demo-answer",           note: "hundreds, tens, ones ringed, then the blocks" },
};

const MARKS = ".demo-focus, .demo-answer, .unitbox";

/** The ring must really be drawn: a solid outline at least 3px wide (or the box border for pattern units). */
async function expectStrong(loc: ReturnType<import("@playwright/test").Page["locator"]>) {
  const first = loc.first();
  await expect(first).toBeVisible();
  const style = await first.evaluate(el => { const c = getComputedStyle(el); return { o: c.outlineStyle, ow: parseFloat(c.outlineWidth), b: c.borderTopStyle, bw: parseFloat(c.borderTopWidth) }; });
  expect((style.o === "solid" && style.ow >= 3) || (style.b === "solid" && style.bw >= 3)).toBe(true);
}

for (const lang of ["hi", "en"] as Lang[]) {
  test.describe(`demo · ${lang}`, () => {
    for (const g of GAMES) {
      test(`${g.id}: three steps, each spoken and each visible`, async ({ page }) => {
        await installFakeSpeech(page);
        await startGame(page, g.id, lang);
        const view = page.locator(".demoview");
        const bubble = page.locator(".guide .bubble");
        const nextBtn = page.locator('.row [data-act="next"], .row [data-act="turn"]');
        const exp = EXPECT[g.id];

        for (const step of [0, 1, 2] as const) {
          // the screen is on this step and shows its line
          await expect(view).toHaveAttribute("data-demo-step", String(step));
          const line = (await bubble.textContent())!.trim();
          expect(line.length).toBeGreaterThan(3);

          // the line reached speech: every part, in order, in the right language, and it started
          const parts = expectedParts(line, lang);
          await expect.poll(async () => (await utterances(page)).filter(u => u.started).map(u => u.text).slice(-parts.length), { timeout: 8000 }).toEqual(parts);
          const spoken = (await utterances(page)).filter(u => u.started).slice(-parts.length);
          for (const u of spoken) expect(["hi-IN", "en-IN"]).toContain(u.lang);
          if (lang === "hi") expect(spoken.some(u => u.lang === "hi-IN")).toBe(true);
          else expect(spoken.every(u => u.lang === "en-IN")).toBe(true);

          // the visible change for this step
          if (step === 0) await expect(page.locator(MARKS)).toHaveCount(0);
          if (step === 1) { await expectStrong(page.locator(exp.s1)); await expect(page.locator(".demo-answer")).toHaveCount(0); }
          if (step === 2) await expectStrong(page.locator(exp.s2));

          // each press moves exactly one step; the last one is "My turn"
          const label = (await nextBtn.textContent())!.trim();
          expect(label).toBe(step === 2 ? t("myTurn", lang) : t("next", lang));
          if (step < 2) await nextBtn.click();
        }

        // pattern details: the repeating part was named, the ? box holds the answer, and the right option is ringed
        if (g.id === "rangoli") {
          const answer = (await page.locator(".tok.slot").textContent())!.trim();
          expect(answer).not.toBe("?");
          await expect(page.locator(".choice.right.demo-answer")).toHaveText(answer);
          await expect(page.locator(".choice.demo-answer")).toHaveCount(1);
          expect(await page.locator(".unitbox").count()).toBeGreaterThanOrEqual(2);
        }

        // "My turn": the demo is gone, Keya says the child's own problem, and it can be played
        const before = (await utterances(page)).length;
        await nextBtn.click();
        await expect(view).toHaveCount(0);
        const own = (await bubble.textContent())!.trim();
        expect(own.startsWith(t("yourTurn", lang))).toBe(true);
        await expect.poll(async () => (await spokenSince(page, before)).some(u => u.started)).toBe(true);
        await expect(page.locator(".controls")).toBeVisible();
      });
    }

    test("Say again repeats the current step's line; Watch again starts over from step 1", async ({ page }) => {
      await installFakeSpeech(page);
      await startGame(page, "rangoli", lang);
      const view = page.locator(".demoview");
      await expect(view).toHaveAttribute("data-demo-step", "0");
      await page.locator('[data-act="next"]').click();
      await expect(view).toHaveAttribute("data-demo-step", "1");
      const line1 = (await page.locator(".guide .bubble").textContent())!.trim();
      await expect.poll(async () => (await utterances(page)).some(u => u.started && u.text === expectedParts(line1, lang)[0])).toBe(true);

      for (let i = 0; i < 3; i++) {                                    // every time, not just the first
        const n = (await utterances(page)).length;
        await page.locator('[data-act="say"]').click();
        await expect.poll(async () => (await spokenSince(page, n)).filter(u => u.started).map(u => u.text)).toEqual(expectedParts(line1, lang));
      }

      const n = (await utterances(page)).length;
      await page.locator('[data-act="again"]').click();
      await expect(view).toHaveAttribute("data-demo-step", "0");
      await expect(page.locator(MARKS)).toHaveCount(0);
      const line0 = (await page.locator(".guide .bubble").textContent())!.trim();
      await expect.poll(async () => (await spokenSince(page, n)).filter(u => u.started).map(u => u.text)).toEqual(expectedParts(line0, lang));
      await page.locator('[data-act="next"]').click();                 // and it runs again
      await expect(view).toHaveAttribute("data-demo-step", "1");
      await expect(page.locator(".unitbox.demo-focus").first()).toBeVisible();
    });

    test("tapping Next fast moves one step per tap and never skips the line of a step", async ({ page }) => {
      await installFakeSpeech(page);
      await startGame(page, "rangoli", lang);
      const view = page.locator(".demoview");
      await page.locator('[data-act="next"]').click();
      await page.locator('[data-act="next"]').click();
      await expect(view).toHaveAttribute("data-demo-step", "2");
      const line2 = (await page.locator(".guide .bubble").textContent())!.trim();
      await expect.poll(async () => (await utterances(page)).filter(u => u.started).map(u => u.text).slice(-expectedParts(line2, lang).length)).toEqual(expectedParts(line2, lang));
    });
  });
}

// Every skill's demo, not only each game's first one: step 1 marks something, step 2 rings the answer.
for (const lang of ["hi", "en"] as Lang[]) {
  test(`every skill's demo shows a ringed focus, then a ringed answer · ${lang}`, async ({ page }) => {
    test.setTimeout(240_000);
    await installFakeSpeech(page);
    for (const s of SKILLS) {
      const ctxPage = await page.context().newPage();
      await installFakeSpeech(ctxPage);
      await startGame(ctxPage, s.game, lang, s.id);
      const view = ctxPage.locator(".demoview");
      await expect(view, `${s.id} starts with a demo`).toHaveAttribute("data-demo-step", "0");
      expect(await ctxPage.evaluate(() => (window as unknown as { __turn: { skill: string } }).__turn.skill), "the demo is for the intended skill").toBe(s.id);
      await ctxPage.locator('[data-act="next"]').click();
      await expect(view).toHaveAttribute("data-demo-step", "1");
      await expect(ctxPage.locator(".demo-focus, .unitbox").first(), `${s.id} step 1 marks something`).toBeVisible();
      await ctxPage.locator('[data-act="next"]').click();
      await expect(view).toHaveAttribute("data-demo-step", "2");
      await expect(ctxPage.locator(".demo-answer").first(), `${s.id} step 2 rings the answer`).toBeVisible();
      await ctxPage.close();
    }
  });
}
