import { useEffect, useState } from "preact/hooks";
import { check } from "../../../engine/items";
import { Keypad } from "../../kit";
import { chime } from "../../voice";
import { t } from "../../i18n";
import type { GameProps } from "../types";
import { answer, focus } from "./common";

const L = "🟠";

/** Laddoo Box: fill a box of 5 or 10 (number bonds); add and take away with pictures. */
export function Laddoo({ item, hint, lang, reveal, locked, demo, onAnswer }: GameProps) {
  const [added, setAdded] = useState<boolean[]>([]);
  useEffect(() => setAdded([]), [item]);

  if (item.kind === "bond") {
    const need = item.size - item.filled;
    const cells = Array.from({ length: item.size }, (_, i) => i < item.filled ? "have" : (reveal || added[i]) ? "added" : "empty");
    const count = added.filter(Boolean).length;
    return (
      <div class="game laddoo">
        <div class={`frame f${item.size}`} role="img" aria-label={`${item.filled} of ${item.size} filled`}>
          {cells.map((c, i) => (
            <button key={i} class={`cell ${c} ${c === "empty" ? focus(demo) : ""} ${c === "added" ? answer(demo) : ""}`} disabled={locked || reveal || c === "have" || item.say}
              onClick={() => { chime("tap"); setAdded(a => { const n = a.slice(); n[i] = !n[i]; return n; }); }}>
              {c !== "empty" ? L : hint >= 2 && !item.say ? "·" : ""}
            </button>
          ))}
        </div>
        {item.say ? (reveal ? <div class={`answer big ${answer(demo)}`}>{need}</div>
          : <Keypad maxLen={2} lang={lang} disabled={locked} onSubmit={v => { const c = check(item, { value: v }); onAnswer(c.ok, c.mistake); }} />)
          : !reveal && <button class="primary" disabled={locked || count === 0} onClick={() => { const c = check(item, { value: count }); onAnswer(c.ok, c.mistake); }}>{t("done", lang)}</button>}
      </div>
    );
  }

  if (item.kind === "arith1") {
    const total = item.op === "+" ? item.a + item.b : item.a;
    const right = item.op === "+" ? item.a + item.b : item.a - item.b;
    return (
      <div class="game laddoo">
        <div class={`plates2 ${hint >= 2 ? "framed" : ""} ${focus(demo)}`}>
          {item.op === "+" ? <>
            <div class="plate1">{Array.from({ length: item.a }, (_, k) => <span key={k}>{L}</span>)}</div>
            <b class="opsign">+</b>
            <div class="plate1">{Array.from({ length: item.b }, (_, k) => <span key={k}>{L}</span>)}</div>
          </> : (
            <div class="plate1 wide">{Array.from({ length: total }, (_, k) => <span key={k} class={k >= item.a - item.b ? "eaten" : ""}>{L}</span>)}</div>
          )}
        </div>
        {hint >= 3 && <p class="sumline">{item.a} {item.op === "+" ? "+" : "−"} {item.b} = ?</p>}
        {reveal ? <div class={`answer big ${answer(demo)}`}>{right}</div>
          : <Keypad maxLen={2} lang={lang} disabled={locked} onSubmit={v => { const c = check(item, { value: v }); onAnswer(c.ok, c.mistake); }} />}
      </div>
    );
  }
  return null;
}
