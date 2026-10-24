import { useEffect, useState } from "preact/hooks";
import { check, foodLabel } from "../../engine/items";
import { chime } from "../voice";
import { t } from "../i18n";
import type { GameProps } from "./types";

const SWEET: Record<string, string> = { laddoo: "#f3a712", jalebi: "#f28c28", barfi: "#e9e2d0", peda: "#d9b38c" };
const Sweet = ({ food }: { food: string }) => (
  <svg viewBox="0 0 20 20" width="22" height="22" aria-hidden="true"><circle cx="10" cy="10" r="8" fill={SWEET[food] ?? "#f3a712"} stroke="#9c6a1c" stroke-width="1" /></svg>
);

/** A rectangular slab with straight cuts at the given % positions. Equal cuts make fair parts. */
function Slab({ cuts, food }: { cuts: number[]; food: string }) {
  const fill = food === "sandwich" ? "#f6e3b4" : food === "paratha" ? "#e9c27a" : "#c98a3d";
  return (
    <svg viewBox="0 0 160 70" width="160" height="70" aria-hidden="true">
      <rect x="4" y="4" width="152" height="62" rx="8" fill={fill} stroke="#7a5c3e" stroke-width="2" />
      {cuts.map(c => <line key={c} x1={4 + (152 * c) / 100} x2={4 + (152 * c) / 100} y1="4" y2="66" stroke="#4a3426" stroke-width="2.5" stroke-dasharray="5 3" />)}
    </svg>
  );
}

/** G5 Fair Share: deal sweets onto plates; spot halves and quarters. */
export function Share({ item, hint, lang, reveal, locked, onAnswer }: GameProps) {
  const n = item.kind === "share" ? item.plates : 0;
  const [plates, setPlates] = useState<number[]>(Array(n).fill(0));
  const [box, setBox] = useState(0);
  useEffect(() => { setPlates(Array(n).fill(0)); setBox(0); }, [item]);

  if (item.kind === "share") {
    const each = Math.floor(item.total / item.plates), rest = item.total % item.plates;
    const shown = reveal ? Array(item.plates).fill(each) : plates;
    const boxShown = reveal ? rest : box;
    const pile = item.total - shown.reduce((a, b) => a + b, 0) - boxShown;
    const minPlate = Math.min(...plates), nextPlate = plates.findIndex(p => p === minPlate);
    const give = (i: number) => { if (pile <= 0 || locked || reveal) return; chime("tap"); setPlates(ps => ps.map((p, j) => (j === i ? p + 1 : p))); };
    const take = (i: number) => { if (locked || reveal || plates[i] === 0) return; setPlates(ps => ps.map((p, j) => (j === i ? p - 1 : p))); };
    return (
      <div class="game share">
        <div class="pile" aria-label={`${pile} ${foodLabel(item.food, lang)}`}>
          <div class="sweets">{Array.from({ length: pile }, (_, k) => <Sweet key={k} food={item.food} />)}</div>
          <small>{pile > 0 ? t("pile", lang) : ""}</small>
        </div>
        <div class="plates">
          {shown.map((p, i) => (
            <div key={i} class={`plate ${hint >= 2 && !reveal && i === nextPlate && pile > 0 ? "next" : ""}`}>
              <button class="platebtn" aria-label={`plate ${i + 1}: ${p}`} disabled={locked || reveal} onClick={() => give(i)}>
                <div class="sweets">{Array.from({ length: p }, (_, k) => <Sweet key={k} food={item.food} />)}</div>
              </button>
              <div class="platefoot"><b>{p}</b>{!reveal && p > 0 && <button class="mini" aria-label="take one back" disabled={locked} onClick={() => take(i)}>−</button>}</div>
            </div>
          ))}
        </div>
        {item.skill === "share_left" && (
          <div class="leftbox">
            <span>{t("leftBox", lang)}: <b>{boxShown}</b></span>
            {!reveal && <><button class="mini" disabled={locked || pile <= 0} onClick={() => setBox(b => b + 1)}>+</button>
              <button class="mini" disabled={locked || box <= 0} onClick={() => setBox(b => b - 1)}>−</button></>}
          </div>
        )}
        {!reveal && <button class="primary" disabled={locked || plates.every(p => p === 0)}
          onClick={() => { const c = check(item, { plates, left: box + pile }); onAnswer(c.ok, c.mistake); }}>{t("done", lang)}</button>}
      </div>
    );
  }

  if (item.kind === "fraction") {
    return (
      <div class="game share fractions">
        {item.options.map(o => (
          <button key={o.id} class={`choice ${reveal && o.id === "even" ? "right" : ""}`} disabled={locked || reveal}
            onClick={() => { const c = check(item, { pick: o.id }); onAnswer(c.ok, c.mistake); }}>
            <Slab cuts={o.cuts} food={item.food} />
            {hint >= 2 && <small>{o.cuts.length + 1} {lang === "hi" ? "टुकड़े" : "pieces"}</small>}
          </button>
        ))}
      </div>
    );
  }
  return null;
}
