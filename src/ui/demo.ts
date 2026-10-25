/** The "watch me" demo: three steps for every game. Each step has one spoken line and one visible change.
 *
 *    step 0  Keya reads the problem                      nothing marked yet
 *    step 1  Keya shows how                              the thing to look at is ringed  (class demo-focus)
 *    step 2  Keya gives the answer                       the answer is placed and ringed (class demo-answer)
 *
 *  The game screens read `demo` (0, 1 or 2) from their props and add those two classes; the line and the
 *  hint/reveal levels come from here. Learning rules are not touched: this only decides what Keya says and shows.
 */
import { hint as hintText, Item, prompt } from "../engine/items";
import type { Lang } from "../engine/skills";
import { emojiWord } from "./voice";
import { t } from "./i18n";

export interface DemoStep {
  line: string;
  hint: number;        // how much of the picture aid the game shows (same levels the Help button uses)
  reveal: boolean;     // the answer is shown
}

/** How many tiles make the repeating part. `skip` ignores one tile (the odd one out, in "find the mistake"). */
export function patternUnit(seq: string[], skip = -1): number {
  for (let n = 1; n <= seq.length; n++) if (seq.every((tk, i) => i === skip || tk === seq[i % n])) return n;
  return seq.length;
}

const say = (lang: Lang, en: string, hi: string) => (lang === "hi" ? hi : en);
const names = (tokens: string[], lang: Lang) => tokens.map(tk => emojiWord(tk, lang) || tk).join(", ");

/** The picture aid used on the "show how" step, chosen so the change is visible for each kind of item. */
function showHowLevel(item: Item): number {
  if (item.kind === "pick") {
    switch (item.mode) {
      case "more": case "less": case "shape": return 3;       // counts / shape names appear
      default: return 2;
    }
  }
  return item.kind === "pv_compare" || item.kind === "arith1" ? 3 : 2;
}

export function demoScript(item: Item, lang: Lang): DemoStep[] {
  const open = { line: `${t("watchMe", lang)} ${prompt(item, lang)}`, hint: 0, reveal: false };
  let how = hintText(item, 3, lang);
  let result = hintText(item, 4, lang);

  if (item.kind === "pick" && item.seq && (item.mode === "pattern" || item.mode === "pattern_fix")) {
    const skip = item.mode === "pattern_fix" ? Number(item.answer) : -1;
    const u = patternUnit(item.seq, skip);
    const unit = item.seq.slice(0, u);
    how = say(lang, `This part repeats: ${names(unit, lang)}.`, `यह हिस्सा बार-बार आता है: ${names(unit, lang)}।`);
    if (item.mode === "pattern")
      result = say(lang, `Next comes ${names([item.answer], lang)}.`, `आगे ${names([item.answer], lang)} आएगा।`);
    else {
      const bad = Number(item.answer);
      result = say(lang, `Number ${bad + 1} is wrong. It should be ${names([unit[bad % u]], lang)}.`,
        `नंबर ${bad + 1} गलत है। यहाँ ${names([unit[bad % u]], lang)} आना चाहिए।`);
    }
  }
  return [open, { line: how, hint: showHowLevel(item), reveal: false }, { line: result, hint: showHowLevel(item), reveal: true }];
}
