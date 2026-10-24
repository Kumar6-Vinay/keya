import { useState } from "preact/hooks";
import type { Lang } from "../engine/skills";
import { chime } from "./voice";
import { t } from "./i18n";

/** Number pad for open answers. Shows what was typed; no answer is ever pre-filled. */
export function Keypad({ maxLen = 3, lang, onSubmit, disabled, prefix = "" }:
  { maxLen?: number; lang: Lang; onSubmit: (v: number) => void; disabled?: boolean; prefix?: string }) {
  const [v, setV] = useState("");
  const press = (k: string) => { chime("tap"); setV(x => (k === "del" ? x.slice(0, -1) : x.length < maxLen ? x + k : x)); };
  return (
    <div class="keypad">
      <div class="readout" aria-live="polite">{prefix}{v || <span class="ph">?</span>}</div>
      <div class="keys">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "del", "0"].map(k => (
          <button key={k} class={k === "del" ? "key soft" : "key"} disabled={disabled} onClick={() => press(k)}
            aria-label={k === "del" ? t("del", lang) : k}>{k === "del" ? "⌫" : k}</button>
        ))}
        <button class="key go" disabled={disabled || v === ""} onClick={() => { onSubmit(Number(v)); setV(""); }}>{t("check", lang)}</button>
      </div>
    </div>
  );
}

/** + / − counter used to build numbers with beads, blocks or sweets. */
export function Counter({ label, value, set, max, min = 0 }: { label: string; value: number; set: (n: number) => void; max: number; min?: number }) {
  return (
    <div class="counter">
      <button class="round" aria-label={`${label} −`} disabled={value <= min} onClick={() => { chime("tap"); set(value - 1); }}>−</button>
      <span class="count"><b>{value}</b> {label}</span>
      <button class="round" aria-label={`${label} +`} disabled={value >= max} onClick={() => { chime("tap"); set(value + 1); }}>+</button>
    </div>
  );
}

const BEAD = ["#e4572e", "#f3a712", "#29a19c", "#5b8def", "#a259c4"];

/** A string of 10 beads (a ten) drawn as a short vertical strand. */
export function BeadString({ i = 0, label }: { i?: number; label?: boolean }) {
  return (
    <svg class="string" viewBox="0 0 22 128" width="22" height="128" aria-hidden="true">
      <line x1="11" y1="2" x2="11" y2="126" stroke="#8a6d4b" stroke-width="2" />
      {Array.from({ length: 10 }, (_, k) => <circle key={k} cx="11" cy={9 + k * 12} r="5.6" fill={BEAD[i % BEAD.length]} />)}
      {label && <text x="11" y="-2" />}
    </svg>
  );
}

export function Bead({ i = 0 }: { i?: number }) {
  return <svg class="bead" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><circle cx="8" cy="8" r="6" fill={BEAD[(i + 2) % BEAD.length]} /></svg>;
}

export function Necklace({ n, labels }: { n: number; labels?: boolean }) {
  const tens = Math.floor(n / 10), ones = n % 10;
  return (
    <div class="necklace" role="img" aria-label={`${tens} strings of 10 and ${ones} beads`}>
      <div class="strings">{Array.from({ length: tens }, (_, k) => <div class="strwrap" key={k}><BeadString i={k} />{labels && <small>10</small>}</div>)}</div>
      <div class="singles">{Array.from({ length: ones }, (_, k) => <Bead key={k} i={k} />)}</div>
    </div>
  );
}

/** Base-ten blocks: hundred flat, ten rod, one cube. */
export function Blocks({ h, tn, o, gone }: { h: number; tn: number; o: number; gone?: { t?: number; o?: number } }) {
  return (
    <div class="blocks" role="img" aria-label={`${h} hundreds, ${tn} tens, ${o} ones`}>
      <div class="flats">{Array.from({ length: h }, (_, k) => (
        <svg key={k} viewBox="0 0 50 50" width="46" height="46" aria-hidden="true"><rect x="1" y="1" width="48" height="48" rx="3" fill="#f2c14e" stroke="#b5862a" />
          {Array.from({ length: 9 }, (_, j) => <g key={j}><line x1={5.8 + j * 4.8 + 1} y1="1" x2={5.8 + j * 4.8 + 1} y2="49" stroke="#b5862a" stroke-width=".5" /><line y1={5.8 + j * 4.8 + 1} x1="1" y2={5.8 + j * 4.8 + 1} x2="49" stroke="#b5862a" stroke-width=".5" /></g>)}</svg>))}</div>
      <div class="rods">{Array.from({ length: tn }, (_, k) => (
        <svg key={k} class={gone?.t && k >= tn - gone.t ? "gone" : ""} viewBox="0 0 10 50" width="10" height="46" aria-hidden="true"><rect x="1" y="1" width="8" height="48" rx="2" fill="#5b8def" stroke="#3459a8" />
          {Array.from({ length: 9 }, (_, j) => <line key={j} x1="1" x2="9" y1={5.8 + j * 4.8} y2={5.8 + j * 4.8} stroke="#3459a8" stroke-width=".5" />)}</svg>))}</div>
      <div class="cubes">{Array.from({ length: o }, (_, k) => (
        <svg key={k} class={gone?.o && k >= o - gone.o ? "gone" : ""} viewBox="0 0 10 10" width="10" height="10" aria-hidden="true"><rect x="1" y="1" width="8" height="8" rx="1.5" fill="#29a19c" stroke="#1b6f6b" /></svg>))}</div>
    </div>
  );
}
