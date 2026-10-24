import { useEffect, useState } from "preact/hooks";
import { check } from "../../engine/items";
import { Counter, Keypad, Necklace } from "../kit";
import { t } from "../i18n";
import type { GameProps } from "./types";

/** G3 Bead Mala: make, read and compare 2-digit numbers with strings of 10 beads. */
export function Beads({ item, hint, lang, reveal, locked, onAnswer }: GameProps) {
  const [tens, setTens] = useState(0);
  const [ones, setOnes] = useState(0);
  useEffect(() => { setTens(0); setOnes(0); }, [item]);

  if (item.kind === "pv_build") {
    const tt = reveal ? Math.floor(item.n / 10) : tens, oo = reveal ? item.n % 10 : ones;
    return (
      <div class="game beads">
        <div class="order"><span class="tag">{lang === "hi" ? "ऑर्डर" : "Order"}</span><b class="big">{item.n}</b>
          {hint >= 2 && <span class="split"><em class="tcol">{Math.floor(item.n / 10)}</em> {t("tens", lang)} · <em class="ocol">{item.n % 10}</em> {t("ones", lang)}</span>}
        </div>
        <div class="tray"><Necklace n={tt * 10 + Math.min(oo, 9)} />{oo > 9 && <span class="warn">{oo} {t("ones", lang)}</span>}</div>
        {!reveal && <>
          <div class="counters">
            <Counter label={lang === "hi" ? "लड़ियाँ (10)" : "strings of 10"} value={tens} set={setTens} max={9} />
            <Counter label={lang === "hi" ? "अकेले मोती" : "single beads"} value={ones} set={setOnes} max={19} />
          </div>
          <button class="primary" disabled={locked} onClick={() => { const c = check(item, { tens, ones }); onAnswer(c.ok, c.mistake); }}>{t("done", lang)}</button>
        </>}
      </div>
    );
  }

  if (item.kind === "pv_read") {
    return (
      <div class="game beads">
        <div class="tray"><Necklace n={item.n} labels={hint >= 2} /></div>
        {reveal ? <div class="answer big">{item.n}</div>
          : <Keypad maxLen={2} lang={lang} disabled={locked} onSubmit={v => { const c = check(item, { value: v }); onAnswer(c.ok, c.mistake); }} />}
      </div>
    );
  }

  if (item.kind === "pv_compare") {
    const bigger = item.a > item.b ? "a" : "b";
    return (
      <div class="game beads compare">
        {(["a", "b"] as const).map(k => (
          <button key={k} class={`choice ${reveal && k === bigger ? "right" : ""}`} disabled={locked || reveal}
            onClick={() => { const c = check(item, { pick: k }); onAnswer(c.ok, c.mistake); }}>
            <Necklace n={k === "a" ? item.a : item.b} labels={hint >= 2} />
            {(hint >= 3 || reveal) && <b class="num">{k === "a" ? item.a : item.b}</b>}
          </button>
        ))}
      </div>
    );
  }
  return null;
}
