import { useEffect, useMemo, useState } from "preact/hooks";
import { check } from "../../engine/items";
import { ColumnState, enter, expected, needsTrade, newColumn, trade } from "../../engine/column";
import { mistakeFeedback } from "../../engine/items";
import { Blocks, Counter } from "../kit";
import { chime } from "../voice";
import { t } from "../i18n";
import type { GameProps } from "./types";

const digitsOf = (n: number, len: number) => String(n).padStart(len, " ").split("");

/** G6 House of Hundreds: build 3-digit numbers with blocks; add and subtract column by column. */
export function Hundreds(p: GameProps) {
  if (p.item.kind === "h_build") return <Build {...p} />;
  if (p.item.kind === "column") return <Columns {...p} />;
  return null;
}

function Build({ item, hint, lang, reveal, locked, onAnswer }: GameProps) {
  const [h, setH] = useState(0), [tn, setT] = useState(0), [o, setO] = useState(0);
  useEffect(() => { setH(0); setT(0); setO(0); }, [item]);
  if (item.kind !== "h_build") return null;
  const n = item.n;
  const show = reveal ? [Math.floor(n / 100), Math.floor(n / 10) % 10, n % 10] : [h, tn, o];
  return (
    <div class="game hundreds">
      <div class="order"><span class="tag">{lang === "hi" ? "ऑर्डर" : "Order"}</span><b class="big">{n}</b>
        {hint >= 2 && <span class="split"><em class="hcol">{Math.floor(n / 100)}</em> {t("hundreds", lang)} · <em class="tcol">{Math.floor(n / 10) % 10}</em> {t("tens", lang)} · <em class="ocol">{n % 10}</em> {t("ones", lang)}</span>}
      </div>
      <div class="tray"><Blocks h={show[0]} tn={show[1]} o={show[2]} /></div>
      {!reveal && <>
        <div class="counters">
          <Counter label={t("hundreds", lang)} value={h} set={setH} max={9} />
          <Counter label={t("tens", lang)} value={tn} set={setT} max={19} />
          <Counter label={t("ones", lang)} value={o} set={setO} max={19} />
        </div>
        <button class="primary" disabled={locked} onClick={() => { const c = check(item, { hundreds: h, tens: tn, ones: o }); onAnswer(c.ok, c.mistake); }}>{t("done", lang)}</button>
      </>}
    </div>
  );
}

function Columns({ item, hint, lang, reveal, locked, onAnswer, onStepWrong, onStepRight }: GameProps) {
  const col0 = useMemo(() => (item.kind === "column" ? newColumn(item.a, item.b, item.op) : null), [item]);
  const [s, setS] = useState<ColumnState | null>(col0);
  const [, force] = useState(0);
  useEffect(() => { setS(col0); }, [col0]);
  if (item.kind !== "column" || !s) return null;
  const len = s.len, A = digitsOf(item.a, len), B = digitsOf(item.b, len);
  const names = [t("ones", lang), t("tens", lang), t("hundreds", lang)];
  const colIdx = (visual: number) => len - 1 - visual;      // visual 0 = leftmost
  const doneAll = s.col >= len;
  const ans = item.op === "+" ? item.a + item.b : item.a - item.b;

  const press = (d: number) => {
    if (locked || doneAll) return;
    const r = enter(s, d);
    force(x => x + 1);
    if (!r.ok) { onStepWrong(r.bug === "wrong_digit" ? undefined : (r.bug as never)); return; }
    chime("tap");
    if (r.done) onAnswer(true);
    else onStepRight(lang === "hi" ? `सही। अब ${names[s.col]}।` : `Right. Now the ${names[s.col]}.`);
  };
  const doTrade = () => {
    if (locked) return;
    const r = trade(s);
    force(x => x + 1);
    if (!r.ok) onStepWrong("unneeded_trade");
    else onStepRight(item.op === "-" ? (lang === "hi" ? "एक दहाई खोली। अब इकाई घटाओ।" : "You opened a ten. Now take away.") : "");
  };

  // The top number as it stands now (after trades), for the blocks hint.
  const topNow = (() => {
    const d = String(item.a).padStart(len, "0").split("").map(Number).reverse();
    const out = d.map((x, i) => x - (s.borrowed[i] ? 1 : 0) + (i < len - 1 && s.borrowed[i + 1] ? 10 : 0));
    return { h: out[2] ?? 0, t: out[1] ?? 0, o: out[0] ?? 0 };
  })();

  return (
    <div class="game hundreds">
      <div class="colsum" role="group" aria-label={`${item.a} ${item.op} ${item.b}`}>
        <div class="crow heads">{Array.from({ length: len }, (_, v) => <span key={v} class={colIdx(v) === s.col ? "now" : ""}>{names[colIdx(v)]}</span>)}</div>
        <div class="crow">{A.map((d, v) => {
          const c = colIdx(v), lent = s.borrowed[c] && item.op === "-", got = item.op === "-" && c < len - 1 && s.borrowed[c + 1];
          return <span key={v} class="dig">{lent ? <><s>{d}</s><sup class="over">{Number(d) - 1}</sup></> : d}{got && <sup class="pre">1</sup>}
            {item.op === "+" && s.carried[c] && <sup class="carry">1</sup>}</span>;
        })}</div>
        <div class="crow"><span class="op">{item.op === "-" ? "−" : "+"}</span>{B.map((d, v) => <span key={v} class="dig">{d}</span>)}</div>
        <div class="rule" />
        <div class="crow ans">{Array.from({ length: len }, (_, v) => {
          const c = colIdx(v), w = reveal ? String(ans).padStart(len, " ")[v] : s.written[c];
          return <span key={v} class={`box ${c === s.col && !reveal ? "active" : ""}`}>{w ?? ""}</span>;
        })}</div>
      </div>
      {hint >= 2 && !reveal && <div class="tray small"><Blocks h={topNow.h} tn={topNow.t} o={topNow.o} /></div>}
      {hint >= 4 && !reveal && !doneAll && <p class="reveal-step">{lang === "hi" ? `इस कॉलम में ${expected(s)} लिखो।` : `Write ${expected(s)} in this column.`}
        {needsTrade(s) && item.op === "-" && !s.explicit[s.col] ? (lang === "hi" ? " (पहले एक दहाई खोलो।)" : " (Open a ten first.)") : ""}</p>}
      {!reveal && !doneAll && (
        <div class="digitpad">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(d => <button key={d} class="key" disabled={locked} onClick={() => press(d)}>{d}</button>)}
          {s.col < len - 1 && <button class="key wide soft" disabled={locked} onClick={doTrade}>{item.op === "-" ? t("openTen", lang) : t("carryTen", lang)}</button>}
        </div>
      )}
    </div>
  );
}

export const columnMistakeText = mistakeFeedback;
