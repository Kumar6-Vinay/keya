import { check } from "../../../engine/items";
import { Colour, COLOUR_HEX, COLOUR_WORD, SIZE_WORD, Thing } from "../../../engine/class1";
import type { GameProps } from "../types";
import { answer, Choice, focus } from "./common";

/** A balloon, flower or kite in one soft colour. Drawn, so any colour can be used. */
function ThingSvg({ kind, colour }: { kind: Thing; colour: Colour }) {
  const f = COLOUR_HEX[colour];
  return (
    <svg viewBox="0 0 100 100" width="84" height="84" aria-hidden="true">
      {kind === "balloon" && <g><ellipse cx="50" cy="40" rx="26" ry="32" fill={f} /><path d="M50 72 L44 80 L56 80 Z" fill={f} /><path d="M50 80 Q42 90 50 98" fill="none" stroke="#8a7a66" stroke-width="2" /></g>}
      {kind === "flower" && <g>{[0, 72, 144, 216, 288].map(a => <ellipse key={a} cx="50" cy="26" rx="13" ry="18" fill={f} transform={`rotate(${a} 50 48)`} />)}<circle cx="50" cy="48" r="11" fill="#fff6d6" /><path d="M50 60 L50 96" stroke="#74a06a" stroke-width="4" /></g>}
      {kind === "kite" && <g><polygon points="50,6 82,44 50,82 18,44" fill={f} /><path d="M50 6 L50 82 M18 44 L82 44" stroke="#fff" stroke-width="2" opacity=".7" /><path d="M50 82 Q40 90 50 96 Q60 100 52 100" fill="none" stroke="#8a7a66" stroke-width="2" /></g>}
    </svg>
  );
}

const SIZE_PX: Record<string, number> = { "1": 34, "2": 58, "3": 90 };

/** Colour and Size Garden: tap the colour asked for; tap the big one or the small one. Calm, no timers. */
export function Colours({ item, hint, lang, reveal, locked, demo, onAnswer }: GameProps) {
  if (item.kind !== "pick") return null;
  const pick = (o: string) => { const c = check(item, { pick: o }); onAnswer(c.ok, c.mistake); };
  const show = (o: string) => (reveal || hint >= 4) && o === item.answer;
  const mark = (o: string) => `${focus(demo)} ${answer(demo, o === item.answer)}`;
  const grid = item.options.length === 3 ? "choices3" : "choices4";
  const named = hint >= 2 || reveal;

  if (item.mode === "colour") {
    const thing = item.seq![0] as Thing;
    return (
      <div class={`game colours ${grid}`}>
        {item.options.map(o => (
          <Choice key={o} disabled={locked || reveal} right={show(o)} mark={mark(o)} onPick={() => pick(o)} label={COLOUR_WORD[o as Colour].en}>
            <ThingSvg kind={thing} colour={o as Colour} />
            <small class="cap-word">{named ? COLOUR_WORD[o as Colour][lang] : ""}</small>
          </Choice>
        ))}
      </div>
    );
  }
  if (item.mode === "size")
    return (
      <div class={`game colours size ${grid}`}>
        {item.options.map(o => (
          <Choice key={o} disabled={locked || reveal} right={show(o)} mark={mark(o)} onPick={() => pick(o)} label={SIZE_WORD[o].en}>
            <span class="pic" style={{ fontSize: `${SIZE_PX[o]}px` }} aria-hidden="true">{item.target}</span>
            <small class="cap-word">{named ? SIZE_WORD[o][lang] : ""}</small>
          </Choice>
        ))}
      </div>
    );
  return null;
}
