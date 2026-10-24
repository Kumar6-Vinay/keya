import type { Item, Mistake } from "../../engine/items";
import type { Lang } from "../../engine/skills";

export interface GameProps {
  item: Item;
  hint: number;        // 0 none · 1 nudge · 2 picture aid · 3 worked step · 4 answer for this step
  lang: Lang;
  reveal: boolean;     // show the correct answer (demo, or after 3 tries)
  locked: boolean;     // input disabled while feedback shows
  onAnswer: (ok: boolean, mistake?: Mistake) => void;            // finishes or retries the item
  onStepWrong: (mistake?: Mistake) => void;                       // multi-step items: a wrong step
  onStepRight: (msg: string) => void;                             // multi-step items: a right step
}
