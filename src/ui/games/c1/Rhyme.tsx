import { check } from "../../../engine/items";
import { PIC } from "../../../engine/class1";
import { say } from "../../voice";
import type { GameProps } from "../types";
import { answer, Choice, focus, Hear } from "./common";

/** Rhyme Pond: hear a word and tap the picture that sounds the same at the end; find the odd one out. */
export function Rhyme({ item, hint, reveal, locked, demo, onAnswer }: GameProps) {
  if (item.kind !== "pick") return null;
  const pick = (o: string) => { const c = check(item, { pick: o }); onAnswer(c.ok, c.mistake); };
  const show = (o: string) => (reveal || hint >= 4) && o === item.answer;
  const odd = item.mode === "rhyme_odd";
  const grid = (
    <div class="choices3">
      {item.options.map(o => (
        <Choice key={o} disabled={locked || reveal} right={show(o)} mark={`${odd ? focus(demo) : ""} ${answer(demo, o === item.answer)}`} onPick={() => pick(o)} label={o}>
          <span class="pic" style={{ fontSize: "52px" }}>{PIC[o]}</span>
          <span class="cap-word">{hint >= 2 || reveal ? o : ""}</span>
          <Hear word={o} />
        </Choice>
      ))}
    </div>
  );
  if (item.mode === "rhyme")
    return (
      <div class="game english rhyme">
        <button class={`bigword ${focus(demo)}`} onClick={() => say(item.target, "en", true)} aria-label={`hear ${item.target}`}>
          <span class="pic" style={{ fontSize: "64px" }}>{PIC[item.target]}</span><span class="word">🔊 {item.target}</span>
        </button>
        {grid}
      </div>
    );
  if (odd) return <div class="game english rhyme">{grid}</div>;
  return null;
}
