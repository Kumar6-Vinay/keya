import { check } from "../../../engine/items";
import { patternUnit } from "../../demo";
import type { GameProps } from "../types";
import { answer, Choice, focus } from "./common";

/** The tiles cut into repeating parts. Each part gets its own box in the demo; the last one may be unfinished. */
function Units({ seq, unit, demo, children }: { seq: string[]; unit: number; demo?: number; children: (tk: string, i: number) => preact.JSX.Element }) {
  const groups: number[][] = [];
  seq.forEach((_, i) => { (groups[Math.floor(i / unit)] ??= []).push(i); });
  return <>{groups.map((g, k) => <span key={k} class={`unitbox ${focus(demo)}`} data-unit={k}>{g.map(i => children(seq[i], i))}</span>)}</>;
}

/** Rangoli Patterns: what comes next, and find the one that breaks the pattern. */
export function Rangoli({ item, hint, locked, reveal, demo, onAnswer }: GameProps) {
  if (item.kind !== "pick" || !item.seq) return null;
  const pick = (o: string) => { const c = check(item, { pick: o }); onAnswer(c.ok, c.mistake); };
  const seq = item.seq;
  if (item.mode === "pattern") {
    const unit = patternUnit(seq);
    const tile = (tk: string, i: number) => <span key={i} class={`tok ${hint >= 2 && i % unit === 0 ? "start" : ""}`}>{tk}</span>;
    return (
      <div class="game rangoli">
        <div class="pattern">
          {demo === 1 || demo === 2
            ? <Units seq={seq} unit={unit} demo={demo}>{tile}</Units>
            : seq.map((tk, i) => tile(tk, i))}
          <span class={`tok slot ${reveal ? `filled ${answer(demo)}` : ""}`}>{reveal ? item.answer : "?"}</span>
        </div>
        {(!reveal || demo !== undefined) && (
          <div class="choices3">{item.options.map(o => (
            <Choice key={o} disabled={locked || reveal} right={(hint >= 4 || reveal) && o === item.answer} mark={answer(demo, o === item.answer)}
              onPick={() => pick(o)} label="choice"><span class="pic" style={{ fontSize: "44px" }}>{o}</span></Choice>))}</div>
        )}
      </div>
    );
  }
  if (item.mode === "pattern_fix") {
    const bad = Number(item.answer);
    const unit = patternUnit(seq, bad);
    const tile = (tk: string, i: number) => (
      <button key={i} class={`tok tapme ${(reveal || hint >= 4) && String(i) === item.answer ? "bad" : ""} ${answer(demo, i === bad)}`}
        disabled={locked || reveal} onClick={() => pick(String(i))} aria-label={`tile ${i + 1}`}>{tk}</button>
    );
    return (
      <div class="game rangoli">
        <div class="pattern">
          {demo === 1 || demo === 2 ? <Units seq={seq} unit={unit} demo={demo}>{tile}</Units> : seq.map((tk, i) => tile(tk, i))}
        </div>
      </div>
    );
  }
  return null;
}
