import { useEffect, useState } from "preact/hooks";
import { check } from "../../../engine/items";
import { chime } from "../../voice";
import { t } from "../../i18n";
import type { GameProps } from "../types";
import { answer, Choice, focus } from "./common";

/** Sabzi Cart: give the customer the number of vegetables asked for; which basket has more or less. */
export function Sabzi({ item, hint, lang, reveal, locked, demo, onAnswer }: GameProps) {
  const [cart, setCart] = useState(0);
  useEffect(() => setCart(0), [item]);

  if (item.kind === "count") {
    const shown = reveal || demo === 1 ? item.n : cart;     // demo step 1: the cart is filled and counted out loud
    const bundles = Math.floor(shown / 10) * (item.bundle ? 1 : 0), loose = item.bundle ? shown % 10 : shown;
    const add = (k: number) => { if (locked || reveal) return; chime("tap"); setCart(c => Math.min(20, c + k)); };
    return (
      <div class="game sabzi">
        <div class={`order ${answer(demo)}`}><span class="tag">{lang === "hi" ? "ऑर्डर" : "Order"}</span><b class="big">{item.n}</b></div>
        <div class={`cart ${focus(demo)} ${answer(demo)}`} aria-label={`${shown} in the cart`}>
          <span class="cartlabel">🛒</span>
          {Array.from({ length: bundles }, (_, k) => <span key={`b${k}`} class="bundle10">{item.veg}×10</span>)}
          {Array.from({ length: loose }, (_, k) => (
            <button key={k} class="veg" disabled={locked || reveal} onClick={() => setCart(c => c - 1)} aria-label="take one back">
              {item.veg}{hint >= 2 && <small>{bundles * 10 + k + 1}</small>}
            </button>
          ))}
        </div>
        {!reveal && <>
          <div class="supply">
            <button class="vegbtn" disabled={locked} onClick={() => add(1)} aria-label="add one">{item.veg} +1</button>
            {item.bundle && <button class="vegbtn" disabled={locked || cart > 10} onClick={() => add(10)} aria-label="add a bundle of 10">{item.veg}×10 +10</button>}
            <button class="vegbtn soft" disabled={locked || cart === 0} onClick={() => setCart(c => Math.max(0, c - 1))} aria-label="take one back">−1</button>
          </div>
          <button class="primary" disabled={locked || cart === 0} onClick={() => { const c = check(item, { value: cart }); onAnswer(c.ok, c.mistake); }}>{t("done", lang)}</button>
        </>}
      </div>
    );
  }

  if (item.kind === "pick" && (item.mode === "more" || item.mode === "less")) {
    const [a, b] = item.seq!.map(Number);
    return (
      <div class="game sabzi compare">
        {(["A", "B"] as const).map((k, i) => {
          const n = i === 0 ? a : b;
          return (
            <Choice key={k} disabled={locked || reveal} right={(reveal || hint >= 4) && k === item.answer} mark={`${focus(demo)} ${answer(demo, k === item.answer)}`}
              onPick={() => { const c = check(item, { pick: k }); onAnswer(c.ok, c.mistake); }} label={`basket ${i + 1}`}>
              <div class={`basket ${hint >= 2 ? "rows" : ""}`}>{Array.from({ length: n }, (_, j) => <span key={j}>{item.target}</span>)}</div>
              <span class="basketicon">🧺</span>
              {(hint >= 3 || reveal) && <b class="num">{n}</b>}
            </Choice>
          );
        })}
      </div>
    );
  }
  return null;
}
