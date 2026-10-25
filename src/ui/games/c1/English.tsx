import { useEffect, useState } from "preact/hooks";
import { check } from "../../../engine/items";
import { PIC } from "../../../engine/class1";
import { chime, say } from "../../voice";
import type { GameProps } from "../types";
import { answer, Choice, focus, Hear } from "./common";

/** Sound Garden, Cap Seller's Caps and Listen and Tap. English content is always spoken with an English voice. */
export function English({ item, hint, lang, reveal, locked, demo, onAnswer }: GameProps) {
  const [built, setBuilt] = useState<number[]>([]);
  useEffect(() => setBuilt([]), [item]);
  if (item.kind !== "pick") return null;
  const pick = (o: string) => { const c = check(item, { pick: o }); onAnswer(c.ok, c.mistake); };
  const show = (o: string) => (reveal || hint >= 4) && o === item.answer;
  const big = (w: string) => (
    <button class={`bigword ${focus(demo)}`} onClick={() => say(w, "en", true)} aria-label={`hear ${w}`}>
      {PIC[w] ? <span class="pic" style={{ fontSize: "64px" }}>{PIC[w]}</span> : null}<span class="word">🔊 {w}</span>
    </button>
  );

  switch (item.mode) {
    case "first_sound":
      return <div class="game english">{big(item.target)}
        <div class="choices3">{item.options.map(o => <Choice key={o} disabled={locked || reveal} right={show(o)} mark={answer(demo, o === item.answer)} onPick={() => pick(o)} label={o}>
          <span class="pic" style={{ fontSize: "52px" }}>{PIC[o]}</span><span class="cap-word">{hint >= 2 || reveal ? o : ""}</span><Hear word={o} /></Choice>)}</div></div>;
    case "letter_sound":
      return <div class="game english"><div class={`letter-tile ${focus(demo)}`}>{item.target}</div>
        <div class="choices3">{item.options.map(o => <Choice key={o} disabled={locked || reveal} right={show(o)} mark={answer(demo, o === item.answer)} onPick={() => pick(o)} label={o}>
          <span class="pic" style={{ fontSize: "52px" }}>{PIC[o]}</span><span class="cap-word">{hint >= 2 || reveal ? o : ""}</span><Hear word={o} /></Choice>)}</div></div>;
    case "letter_pick":
      return <div class="game english">{big(item.target)}
        <div class="choices3">{item.options.map(o => <Choice key={o} disabled={locked || reveal} right={show(o)} mark={answer(demo, o === item.answer)} onPick={() => pick(o)} label={`letter ${o}`}>
          <span class="letter-tile small">{o}</span></Choice>)}</div></div>;
    case "read_word":
      return <div class="game english">
        <div class={`caps ${focus(demo)}`}>{item.answer.split("").map((ch, i) => <span key={i} class="capletter">{ch}</span>)}</div>
        <div class="choices3">{item.options.map(o => <Choice key={o} disabled={locked || reveal} right={show(o)} mark={answer(demo, o === item.answer)} onPick={() => pick(o)} label="picture">
          <span class="pic" style={{ fontSize: "56px" }}>{PIC[o]}</span>{reveal && <span class="cap-word">{o}</span>}</Choice>)}</div></div>;
    case "build_word": {
      const word = built.map(i => item.options[i]).join("");
      const tap = (i: number) => {
        if (locked || built.includes(i)) return;
        chime("tap");
        const next = [...built, i];
        setBuilt(next);
        say(item.options[i], "en");
        if (next.length === item.answer.length) {
          const w = next.map(k => item.options[k]).join("");
          const c = check(item, { word: w });
          setTimeout(() => { if (!c.ok) setBuilt([]); onAnswer(c.ok, c.mistake); }, 350);
        }
      };
      return <div class="game english">{big(item.target)}
        <div class={`wslots ${focus(demo)} ${answer(demo)}`}>{item.answer.split("").map((ch, i) => <span key={i} class={`wslot ${hint >= 3 && i === built.length ? "next" : ""}`}>{reveal ? ch : word[i] ?? (hint >= 4 && i === built.length ? <em>{ch}</em> : "")}</span>)}</div>
        {!reveal && <div class="caps tiles">{item.options.map((ch, i) => <button key={i} class="capletter" disabled={locked || built.includes(i)} onClick={() => tap(i)}>{ch}</button>)}</div>}
        {!reveal && built.length > 0 && <button class="soft" disabled={locked} onClick={() => setBuilt(b => b.slice(0, -1))}>⌫</button>}
      </div>;
    }
    case "vocab":
      return <div class="game english"><button class={`bigword ${focus(demo)}`} onClick={() => say(item.target, "en", true)}><span class="word">🔊 {hint >= 2 || reveal ? item.target : ""}</span></button>
        <div class={item.options.length > 3 ? "choices4" : "choices3"}>{item.options.map(o => <Choice key={o} disabled={locked || reveal} right={show(o)} mark={answer(demo, o === item.answer)} onPick={() => pick(o)} label="picture">
          <span class="pic" style={{ fontSize: "56px" }}>{PIC[o]}</span></Choice>)}</div></div>;
    case "sentence":
      return <div class="game english"><button class={`bigword ${focus(demo)}`} onClick={() => say(item.target, "en", true)}><span class="word">🔊 {hint >= 2 || reveal ? item.target : ""}</span></button>
        <div class="choices3">{item.options.map(o => <Choice key={o} disabled={locked || reveal} right={show(o)} mark={answer(demo, o === item.answer)} onPick={() => pick(o)} label="picture">
          <span class="pic" style={{ fontSize: "48px" }}>{o}</span></Choice>)}</div></div>;
    case "sight":
      return <div class="game english"><button class={`bigword ${focus(demo)}`} onClick={() => say(item.target, "en", true)}><span class="word">🔊</span></button>
        <div class="choices4">{item.options.map(o => <Choice key={o} disabled={locked || reveal} right={show(o)} mark={answer(demo, o === item.answer)} onPick={() => pick(o)} label={`word ${o}`}>
          <span class="sightword">{o}</span></Choice>)}</div></div>;
  }
  void lang;
  return null;
}
