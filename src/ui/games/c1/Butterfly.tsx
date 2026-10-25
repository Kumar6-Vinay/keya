import { check } from "../../../engine/items";
import type { GameProps } from "../types";
import { answer, Choice, focus } from "./common";

/** Butterfly Count and Match: count the butterflies and tap the number; which number comes next. */
export function Butterfly({ item, hint, reveal, locked, demo, onAnswer }: GameProps) {
  if (item.kind !== "pick") return null;
  const pick = (o: string) => { const c = check(item, { pick: o }); onAnswer(c.ok, c.mistake); };
  const show = (o: string) => (reveal || hint >= 4) && o === item.answer;
  const options = (
    <div class="choices3">
      {item.options.map(o => (
        <Choice key={o} disabled={locked || reveal} right={show(o)} mark={answer(demo, o === item.answer)} onPick={() => pick(o)} label={o}>
          <b class="numcard">{o}</b>
        </Choice>
      ))}
    </div>
  );

  if (item.mode === "num_match") {
    const n = Number(item.answer);
    return (
      <div class="game butterfly">
        <div class={`flowerbed ${focus(demo)}`} role="img" aria-label={`${n} butterflies`}>
          {Array.from({ length: n }, (_, i) => <span key={i} class="bfly" style={{ animationDelay: `${(i % 4) * 0.7}s` }}>🦋{hint >= 2 && <small>{i + 1}</small>}</span>)}
        </div>
        {options}
      </div>
    );
  }
  if (item.mode === "num_next")
    return (
      <div class="game butterfly">
        <div class={`pattern ${focus(demo)}`}>
          {item.seq!.map(n => <span key={n} class="numstep"><span class="tok">{n}</span>{hint >= 2 && <small class="plus1" aria-hidden="true">+1</small>}</span>)}
          <span class={`tok slot ${reveal ? `filled ${answer(demo)}` : ""}`}>{reveal ? item.answer : "?"}</span>
        </div>
        {options}
      </div>
    );
  return null;
}
