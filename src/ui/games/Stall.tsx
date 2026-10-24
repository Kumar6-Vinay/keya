import { check, toyLabel } from "../../engine/items";
import { Keypad } from "../kit";
import { t } from "../i18n";
import type { GameProps } from "./types";

const TOY_ICON: Record<string, string> = { kite: "🪁", top: "🪀", drum: "🥁", doll: "🪆", ball: "⚽", whistle: "📯", car: "🚗", flute: "🎶" };

function Money({ amount }: { amount: number }) {
  const notes = Math.floor(amount / 10), coins = amount % 10;
  return (
    <div class="money" role="img" aria-label={`${notes} ten-rupee notes and ${coins} one-rupee coins`}>
      {Array.from({ length: notes }, (_, k) => <span key={`n${k}`} class="note">₹10</span>)}
      {Array.from({ length: coins }, (_, k) => <span key={`c${k}`} class="coin">₹1</span>)}
    </div>
  );
}

/** Number line from the price up to the note paid: first to the next ten, then in tens. */
function JumpLine({ from, to }: { from: number; to: number }) {
  const next = Math.min(to, Math.ceil(from / 10) * 10);
  const stops = [from, ...(next > from ? [next] : []), ...Array.from({ length: Math.floor((to - next) / 10) }, (_, k) => next + (k + 1) * 10)];
  const W = 300, x = (v: number) => 16 + ((v - from) / Math.max(1, to - from)) * (W - 32);
  return (
    <svg class="jumps" viewBox={`0 0 ${W} 70`} role="img" aria-label={`Count up from ${from} to ${to}`}>
      <line x1="10" x2={W - 10} y1="50" y2="50" stroke="#7a5c3e" stroke-width="2" />
      {stops.map((v, i) => <g key={v}><line x1={x(v)} x2={x(v)} y1="44" y2="56" stroke="#7a5c3e" stroke-width="2" />
        <text x={x(v)} y="68" text-anchor="middle" font-size="11" fill="#4a3426">{v}</text>
        {i > 0 && <path d={`M${x(stops[i - 1])} 44 Q${(x(stops[i - 1]) + x(v)) / 2} ${14} ${x(v)} 44`} fill="none" stroke="#e4572e" stroke-width="2" />}
        {i > 0 && <text x={(x(stops[i - 1]) + x(v)) / 2} y="22" text-anchor="middle" font-size="11" fill="#e4572e">+{v - stops[i - 1]}</text>}</g>)}
    </svg>
  );
}

/** G4 Fair Stall: add prices and give change at the mela. */
export function Stall({ item, hint, lang, reveal, locked, onAnswer }: GameProps) {
  if (item.kind === "money_add") {
    const total = item.prices[0] + item.prices[1];
    return (
      <div class="game stall">
        <div class="counter-top">
          {item.toys.map((toy, i) => (
            <div class="toy" key={toy}><span class="icon" aria-hidden="true">{TOY_ICON[toy] ?? "🎁"}</span>
              <span class="label">{toyLabel(toy, lang)}</span><span class="price">₹{item.prices[i]}</span>
              {hint >= 2 && <Money amount={item.prices[i]} />}</div>
          ))}
        </div>
        {reveal ? <div class="answer big">₹{total}</div>
          : <Keypad maxLen={2} prefix={`${t("total", lang)}: ₹`} lang={lang} disabled={locked}
              onSubmit={v => { const c = check(item, { value: v }); onAnswer(c.ok, c.mistake); }} />}
      </div>
    );
  }
  if (item.kind === "money_change") {
    return (
      <div class="game stall">
        <div class="counter-top">
          <div class="toy"><span class="icon" aria-hidden="true">{TOY_ICON[item.toy] ?? "🎁"}</span>
            <span class="label">{toyLabel(item.toy, lang)}</span><span class="price">₹{item.price}</span></div>
          <div class="paid"><span class="bignote">₹{item.paid}</span><small>{lang === "hi" ? "ग्राहक ने दिए" : "customer pays"}</small></div>
        </div>
        {hint >= 2 && <JumpLine from={item.price} to={item.paid} />}
        {reveal ? <div class="answer big">₹{item.paid - item.price}</div>
          : <Keypad maxLen={2} prefix={`${t("change", lang)}: ₹`} lang={lang} disabled={locked}
              onSubmit={v => { const c = check(item, { value: v }); onAnswer(c.ok, c.mistake); }} />}
      </div>
    );
  }
  return null;
}
