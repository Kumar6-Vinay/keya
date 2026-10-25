import { check } from "../../../engine/items";
import { Pos, POS_WORD, Shape, SHAPE_WORD } from "../../../engine/class1";
import type { GameProps } from "../types";
import { answer, Choice, focus } from "./common";

/** A small scene: a table, box or basket, with the cat at one position. */
function Scene({ place, pos }: { place: string; pos: Pos }) {
  const obj = place === "table"
    ? <g><rect x="30" y="60" width="100" height="10" rx="3" fill="#b07a3c" /><rect x="38" y="70" width="8" height="40" fill="#8a5a2b" /><rect x="114" y="70" width="8" height="40" fill="#8a5a2b" /></g>
    : place === "box"
      ? <g><rect x="45" y="55" width="70" height="55" rx="4" fill="#d9a35b" stroke="#8a5a2b" stroke-width="2" /><path d="M45 55 L60 42 L130 42 L115 55 Z" fill="#c48a3c" /></g>
      : <g><path d="M40 60 Q80 120 120 60 Z" fill="#c98a3d" stroke="#8a5a2b" stroke-width="2" /><path d="M40 60 Q80 20 120 60" fill="none" stroke="#8a5a2b" stroke-width="3" /></g>;
  // where the cat sits for each position word
  const at: Record<Pos, { x: number; y: number; behind?: boolean; scale?: number }> = {
    on: { x: 80, y: place === "basket" ? 30 : 40 },
    under: { x: 80, y: 102 },
    inside: { x: 80, y: place === "table" ? 102 : 82, scale: 0.8 },
    near: { x: 145, y: 95 },
    behind: { x: 80, y: 56, behind: true, scale: 0.85 },
  };
  const c = at[pos];
  const cat = <text x={c.x} y={c.y} font-size={26 * (c.scale ?? 1)} text-anchor="middle" dominant-baseline="middle" opacity={c.behind ? 0.9 : 1}>🐱</text>;
  return (
    <svg viewBox="0 0 170 120" width="150" height="106" aria-hidden="true">
      <rect x="0" y="110" width="170" height="10" fill="#e8dcc4" />
      {c.behind ? <>{cat}{obj}</> : pos === "inside" && place !== "table" ? <>{obj}{cat}</> : <>{obj}{cat}</>}
    </svg>
  );
}

const SHAPE_FILL = ["#e4572e", "#29a19c", "#f3a712", "#5b8def"];
function ShapeSvg({ s, i }: { s: Shape; i: number }) {
  const f = SHAPE_FILL[i % 4], rot = (i * 17) % 40 - 20;
  return (
    <svg viewBox="0 0 100 100" width="84" height="84" aria-hidden="true">
      <g transform={`rotate(${rot} 50 50)`}>
        {s === "circle" && <circle cx="50" cy="50" r={30 + (i % 2) * 6} fill={f} />}
        {s === "triangle" && <polygon points={i % 2 ? "50,14 88,82 12,82" : "20,20 86,40 30,86"} fill={f} />}
        {s === "square" && <rect x="22" y="22" width="56" height="56" fill={f} />}
        {s === "rectangle" && <rect x="12" y="32" width="76" height="36" fill={f} />}
      </g>
    </svg>
  );
}

/** Find the Furry Cat: position words, naming shapes, shapes around us. */
export function Cat({ item, hint, lang, reveal, locked, demo, onAnswer }: GameProps) {
  if (item.kind !== "pick") return null;
  const pick = (o: string) => { const c = check(item, { pick: o }); onAnswer(c.ok, c.mistake); };
  const show = (o: string) => (reveal || hint >= 4) && o === item.answer;
  const mark = (o: string) => `${focus(demo)} ${answer(demo, o === item.answer)}`;
  if (item.mode === "position")
    return <div class="game cat choices3">{item.options.map(o => (
      <Choice key={o} disabled={locked || reveal} right={show(o)} mark={mark(o)} onPick={() => pick(o)} label={o}>
        <Scene place={item.target} pos={o as Pos} />{demo !== undefined && demo > 0 && <small>{POS_WORD[o as Pos][lang]}</small>}</Choice>))}</div>;
  if (item.mode === "shape")
    return <div class="game cat choices4">{item.options.map((o, i) => (
      <Choice key={o} disabled={locked || reveal} right={show(o)} mark={mark(o)} onPick={() => pick(o)} label="shape"><ShapeSvg s={o as Shape} i={i} />{hint >= 3 && <small>{SHAPE_WORD[o as Shape][lang]}</small>}</Choice>))}</div>;
  if (item.mode === "shape_obj")
    return <div class="game cat choices3">
      {hint >= 2 && <div class={`shapehint ${focus(demo)}`}><ShapeSvg s={item.target as Shape} i={0} /></div>}
      {item.options.map(o => <Choice key={o} disabled={locked || reveal} right={show(o)} mark={mark(o)} onPick={() => pick(o)} label="object"><span class="pic" style={{ fontSize: "56px" }}>{o}</span></Choice>)}
    </div>;
  return null;
}
