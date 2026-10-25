import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { Session, Turn } from "../engine/session";
import { AnswerSet, hint as hintText, Mistake, mistakeFeedback, nextItem, prompt } from "../engine/items";
import { rec, today } from "../engine/learner";
import { makeRng } from "../engine/rng";
import { GameId, GAMES, Lang, skill as skillOf } from "../engine/skills";
import { newId } from "../store";
import type { Child, Family } from "../store";
import { Keya } from "./Keya";
import { chime, say, stop } from "./voice";
import { t } from "./i18n";
import { DemoStep, demoScript } from "./demo";
import { Beads } from "./games/Beads";
import { Stall } from "./games/Stall";
import { Share } from "./games/Share";
import { Hundreds } from "./games/Hundreds";
import { Sabzi } from "./games/c1/Sabzi";
import { Laddoo } from "./games/c1/Laddoo";
import { Cat } from "./games/c1/Cat";
import { Rangoli } from "./games/c1/Rangoli";
import { English } from "./games/c1/English";
import type { Item } from "../engine/items";
import type { GameProps } from "./games/types";

const GAME_VIEW: Record<GameId, (p: GameProps) => preact.JSX.Element | null> = {
  sabzi: Sabzi, laddoo: Laddoo, cat: Cat, rangoli: Rangoli, sounds: English, caps: English, listen: English,
  beads: Beads, stall: Stall, share: Share, hundreds: Hundreds,
};

export interface PlayResult { id: string; minutes: number; items: number; alone: number; grown: string[]; attempts: Session["log"] }

type Mode = "demo" | "play" | "grew";

export function Play({ family, child, game, onSave, onEnd, onBreak, onMid }: {
  family: Family; child: Child; game: GameId;
  onMid: (midPlay: boolean) => void;
  onSave: (r: PlayResult) => void;
  onEnd: (r: PlayResult) => void;
  onBreak: () => void;
}) {
  const lang: Lang = child.lang;
  const day = today(family.tz);
  const session = useMemo(() => new Session(child.learner, game, day, makeRng(Date.now() & 0xffffffff), family.limitMin), []);
  const [turn, setTurn] = useState<Turn>(session.current());
  const [hintLv, setHintLv] = useState(0);
  const [msg, setMsg] = useState<{ text: string; tone: "good" | "hint" | "neutral" } | null>(null);
  const [locked, setLocked] = useState(false);
  const [reveal, setReveal] = useState(false);
  const [mode, setMode] = useState<Mode>("play");
  const [grewSkill, setGrewSkill] = useState<string | null>(null);
  const demoed = useRef(new Set<string>());
  const [demo, setDemo] = useState<{ item: Item; step: 0 | 1 | 2; script: DemoStep[] } | null>(null);
  const View = GAME_VIEW[game];
  const sessionId = useMemo(() => newId(), []);

  const result = (): PlayResult => ({ id: sessionId, minutes: Math.max(1, Math.round(session.minutes())), items: session.log.length,
    alone: session.aloneCount(), grown: session.grown, attempts: session.log });

  // Time limit: finish the current item, then say goodbye.
  useEffect(() => {
    const id = setInterval(() => { if (session.minutes() >= family.limitMin) session.timeUp(); }, 15000);
    // Leaving by Back or Home keeps what was done so far.
    return () => { clearInterval(id); stop(); if (session.log.length) onSave(result()); };
  }, []);

  // Test hook (dev builds only): lets the automated test read the current item.
  if (import.meta.env.DEV) (window as unknown as { __turn: Turn }).__turn = turn;

  useEffect(() => { onMid(session.log.length > 0); }, [turn]);

  // New item: maybe a demo first (new skill), then the spoken prompt.
  useEffect(() => {
    if (turn.phase === "done") { onEnd(result()); return; }
    setHintLv(turn.hint); setReveal(false); setLocked(false);
    const isNew = rec(child.learner, turn.skill).state === "not_started" && !session.log.some(l => l.skill === turn.skill);
    if (turn.phase === "practice" && isNew && !demoed.current.has(turn.skill)) {
      demoed.current.add(turn.skill);
      startDemo(nextItem(turn.skill, 1, makeRng(turn.no * 7919), new AnswerSet()));
      return;
    }
    const lead = turn.phase === "review" ? t("visitorSays", lang) + " " : turn.phase === "check" ? t("specialRequest", lang) + " " : "";
    const p = lead + prompt(turn.item, lang);
    setMsg({ text: p, tone: "neutral" });
    say(p, lang);
  }, [turn]);

  // The demo has three steps (see ui/demo.ts). Each step changes the screen and speaks its line in the same tap,
  // so what Keya says and what the child sees always go together.
  const startDemo = (item: Item) => {
    const script = demoScript(item, lang);
    setDemo({ item, step: 0, script });
    setMode("demo");
    say(script[0].line, lang);
  };
  const goDemoStep = (step: 0 | 1 | 2) => {
    if (!demo) return;
    setDemo({ ...demo, step });
    say(demo.script[step].line, lang);
  };
  const startOwnTurn = () => {
    setDemo(null); setMode("play");
    const p = `${t("yourTurn", lang)} ${prompt(turn.item, lang)}`;
    setMsg({ text: p, tone: "neutral" }); say(p, lang);
  };

  const nextTurn = () => { setMsg(null); setTurn({ ...session.current() }); };

  const onAnswer = (ok: boolean, mistake?: Mistake) => {
    const o = session.submit(ok, mistake);
    onMid(true);
    onSave(result());
    if (ok) {
      chime("good");
      const text = turn.hint >= 2 || turn.wrongs > 0 ? t("gotThere", lang) : t("rightStrategy", lang);
      setMsg({ text, tone: "good" }); say(text, lang); setLocked(true);
      setTimeout(() => {
        if (o.grew) { setGrewSkill(o.grew); setMode("grew"); chime("grow"); return; }
        if (o.stepChanged) say(t(o.stepChanged === "easier" ? "easier" : "harder", lang), lang);
        nextTurn();
      }, 1400);
      return;
    }
    if (!o.moveOn) {
      const cur = session.current();
      setHintLv(cur.hint);
      const text = `${mistakeFeedback(mistake, lang)} ${hintText(cur.item, cur.hint, lang)}`;
      setMsg({ text, tone: "hint" }); say(text, lang);
      return;
    }
    // Item finished without success: show how it goes, then move on (never "game over").
    setReveal(true); setLocked(true);
    const text = o.checkFailed ? t("checkMissed", lang) : t("showIt", lang);
    setMsg({ text, tone: "neutral" }); say(text, lang);
  };

  const onStepWrong = (mistake?: Mistake) => {
    const o = session.stepWrong(mistake);
    const cur = session.current();
    setHintLv(cur.hint);
    const text = mistakeFeedback(o.mistake, lang);
    setMsg({ text, tone: "hint" }); say(text, lang);
  };
  const onStepRight = (text: string) => { if (text) { setMsg({ text, tone: "neutral" }); say(text, lang); } };

  const askHelp = () => {
    const lv = session.help();
    setHintLv(lv);
    // Column sums: levels 3–4 talk about the column the child is on, shown under the sum.
    const text = turn.item.kind === "column" && lv >= 3
      ? (lv >= 4 ? (lang === "hi" ? "नीचे देखो: इस कॉलम का जवाब लिखा है।" : "Look below: the answer for this column is shown.")
                 : (lang === "hi" ? "ऊपर का अंक छोटा हो तो एक दहाई खोलो। जोड़ में 9 से ज़्यादा हो तो दहाई आगे ले जाओ।"
                                  : "If the top digit is smaller, open a ten. If a column adds up to more than 9, carry a ten."))
      : hintText(turn.item, lv, lang);
    setMsg({ text, tone: "hint" }); say(text, lang);
  };

  if (mode === "grew" && grewSkill) {
    const sk = skillOf(grewSkill);
    return (
      <div class="screen grow">
        <h2>{t("townGrows", lang)}</h2>
        <div class="place-pop" aria-hidden="true">{PLACE_ICON[grewSkill] ?? "🏠"}</div>
        <p class="lead">{sk.place[lang]}</p>
        <div class="skillcard"><small>{t("newCard", lang)}</small><b>{sk.canDo[lang]}</b></div>
        <div class="row">
          <button class="primary" onClick={() => { setMode("play"); setGrewSkill(null); nextTurn(); }}>{t("keepPlaying", lang)}</button>
          <button class="soft" onClick={() => onEnd(result())}>{t("bye", lang)}</button>
        </div>
      </div>
    );
  }

  if (mode === "demo" && demo) {
    const cur = demo.script[demo.step];
    const last = demo.step >= demo.script.length - 1;
    return (
      <div class="screen play">
        <Header game={game} lang={lang} phase="demo" />
        <Bubble text={cur.line} tone="neutral" mood="" />
        <div class="demoview" data-demo-step={demo.step}>
          <View item={demo.item} hint={cur.hint} lang={lang} reveal={cur.reveal} locked demo={demo.step}
            onAnswer={() => {}} onStepWrong={() => {}} onStepRight={() => {}} />
        </div>
        <div class="demosteps" role="img" aria-label={`${demo.step + 1} / ${demo.script.length}`}>
          {demo.script.map((_, i) => <span key={i} class={i === demo.step ? "on" : i < demo.step ? "past" : ""} />)}
        </div>
        <div class="row">
          <button class="soft" data-act="say" onClick={() => say(cur.line, lang, true)}>🔊 {t("sayAgain", lang)}</button>
          <button class="soft" data-act="again" onClick={() => startDemo(demo.item)}>↺ {t("watchAgain", lang)}</button>
          <button class="primary" data-act={last ? "turn" : "next"} onClick={() => (last ? startOwnTurn() : goDemoStep((demo.step + 1) as 1 | 2))}>
            {last ? t("myTurn", lang) : t("next", lang)}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div class="screen play">
      <Header game={game} lang={lang} phase={turn.phase} />
      {msg && <Bubble text={msg.text} tone={msg.tone} mood={msg.tone === "good" ? "cheer" : msg.tone === "hint" ? "think" : ""} />}
      <View key={turn.no} item={turn.item} hint={hintLv} lang={lang} reveal={reveal} locked={locked}
        onAnswer={onAnswer} onStepWrong={onStepWrong} onStepRight={onStepRight} />
      <div class="controls">
        <button class="soft" onClick={() => msg && say(msg.text, lang, true)}>🔊 {t("sayAgain", lang)}</button>
        {turn.canHelp && !reveal && <button class="soft" disabled={locked} onClick={askHelp}>💡 {t("help", lang)}</button>}
        {reveal && <button class="primary" onClick={nextTurn}>{t("next", lang)}</button>}
        <button class="soft" onClick={() => { onSave(result()); onBreak(); }}>⏸ {t("pause", lang)}</button>
      </div>
    </div>
  );
}

export const PLACE_ICON: Record<string, string> = {
  count10: "🛒", count20: "🍉", more_less: "⚖️", bond10: "🍬", add10: "🫖", sub10: "🪑", addsub20: "🍲",
  position: "🏡", shape_name: "🪁", shape_obj: "🔷", pat_next: "🌺", pat_next2: "🪔", pat_fix: "🎏",
  first_sound: "🌻", letter_sound: "🎠", letter_pick: "🦋", read_cvc: "🌳", build_cvc: "🧢", build_cvc2: "🚜",
  vocab: "🐄", sentence: "🌈", sight: "📚",
  pv_build: "📿", pv_read: "🛒", pv_compare: "🎪", money_add: "🧸", money_add_carry: "🎈", money_change: "🎡",
  share_equal: "🧺", share_left: "🍬", share_fraction: "🍛", h_build: "🧱", h_add: "🏠", h_sub: "🏫",
};

function Header({ game, lang, phase }: { game: GameId; lang: Lang; phase: string }) {
  const g = GAMES.find(x => x.id === game)!;
  return (
    <div class="gamehead">
      <b>{g.name[lang]}</b>
      {phase === "review" && <span class="chip visit">{lang === "hi" ? "मेहमान" : "Visitor"}</span>}
      {phase === "check" && <span class="chip check">{lang === "hi" ? "ख़ास काम" : "Special request"}</span>}
      {phase === "demo" && <span class="chip">{lang === "hi" ? "देखो" : "Watch"}</span>}
    </div>
  );
}

function Bubble({ text, tone, mood }: { text: string; tone: string; mood: "" | "cheer" | "think" }) {
  return (
    <div class="guide">
      <Keya mood={mood} size={64} />
      <p class={`bubble ${tone}`} aria-live="polite">{text}</p>
    </div>
  );
}
