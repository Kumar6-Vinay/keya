import { check } from "../../../engine/items";
import type { GameProps } from "../types";
import { Choice } from "./common";

/** Rangoli Patterns: what comes next, and find the one that breaks the pattern. */
export function Rangoli({ item, hint, locked, reveal, onAnswer }: GameProps) {
  if (item.kind !== "pick" || !item.seq) return null;
  const pick = (o: string) => { const c = check(item, { pick: o }); onAnswer(c.ok, c.mistake); };
  if (item.mode === "pattern") {
    const unit = (() => { for (let n = 1; n <= item.seq!.length; n++) if (item.seq!.every((t, i) => t === item.seq![i % n])) return n; return item.seq!.length; })();
    return (
      <div class="game rangoli">
        <div class="pattern">
          {item.seq.map((tk, i) => <span key={i} class={`tok ${hint >= 2 && i % unit === 0 ? "start" : ""}`}>{tk}</span>)}
          <span class="tok slot">{reveal ? item.answer : "?"}</span>
        </div>
        {!reveal && <div class="choices3">{item.options.map(o => <Choice key={o} disabled={locked} right={hint >= 4 && o === item.answer} onPick={() => pick(o)} label="choice"><span class="pic" style={{ fontSize: "44px" }}>{o}</span></Choice>)}</div>}
      </div>
    );
  }
  if (item.mode === "pattern_fix")
    return (
      <div class="game rangoli">
        <div class="pattern">
          {item.seq.map((tk, i) => (
            <button key={i} class={`tok tapme ${(reveal || hint >= 4) && String(i) === item.answer ? "bad" : ""}`} disabled={locked || reveal} onClick={() => pick(String(i))} aria-label={`tile ${i + 1}`}>{tk}</button>
          ))}
        </div>
      </div>
    );
  return null;
}
