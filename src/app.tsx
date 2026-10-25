import { useEffect, useRef, useState } from "preact/hooks";
import { dueReviews, today } from "./engine/learner";
import { Cls, GameId, GAMES, Lang, skill as skillOf, SKILLS, skillsFor } from "./engine/skills";
import { addChild, AVATARS, Child, Family, hashPin, load, newFamily, prune, save, upsertSession } from "./store";
import { Keya } from "./ui/Keya";
import { Play, PlayResult, PLACE_ICON } from "./ui/Play";
import { Parent, PinPad } from "./ui/Parent";
import { HOME, t } from "./ui/i18n";
import { say, setVoice, stop, voiceOn } from "./ui/voice";
import { SpeechNotice } from "./ui/SpeechNotice";

type Screen =
  | { name: "setup" }
  | { name: "who" }
  | { name: "map" }
  | { name: "play"; game: GameId }
  | { name: "goodbye"; game: GameId; r: PlayResult }
  | { name: "book" }
  | { name: "pin" }
  | { name: "parent" };

const isRoot = (s: Screen) => s.name === "who" || s.name === "setup";
/** One level up. The root screens have no parent. */
const parentOf = (s: Screen): Screen | null => {
  switch (s.name) {
    case "play": case "goodbye": case "book": return { name: "map" };
    case "map": case "pin": case "parent": return { name: "who" };
    default: return null;
  }
};

export function App() {
  const [family, setFamily] = useState<Family | null>(() => load());
  const [screen, setScreenRaw] = useState<Screen>(() => (load() ? { name: "who" } : { name: "setup" }));
  const screenRef = useRef(screen); screenRef.current = screen;
  const midPlay = useRef(false);                       // a game is under way: leaving asks once, gently
  const ignorePop = useRef(false);
  const [confirm, setConfirm] = useState<Screen | null>(null);
  const [childId, setChildId] = useState<string | null>(null);
  const [onBreak, setOnBreak] = useState(false);
  const [, bump] = useState(0);
  const [voice, setVoiceState] = useState(voiceOn());

  const child = family?.children.find(c => c.id === childId) ?? null;
  const lang: Lang = child?.lang ?? "en";
  const persist = () => { if (family) { save(family); bump(x => x + 1); } };

  useEffect(() => { document.documentElement.lang = lang === "hi" ? "hi" : "en"; }, [lang]);

  // Every screen change goes through here: speech stops, and the browser history keeps exactly one entry above
  // the root while a child is inside, so the phone's back button goes up one level instead of closing the app.
  const doGo = (target: Screen, viaPop = false) => {
    stop(); setOnBreak(false); setConfirm(null); midPlay.current = false;
    const cur = screenRef.current;
    if (viaPop) { if (!isRoot(target)) history.pushState({ keya: 1 }, ""); }
    else if (isRoot(cur) && !isRoot(target)) history.pushState({ keya: 1 }, "");
    else if (!isRoot(cur) && isRoot(target)) { ignorePop.current = true; history.back(); }
    screenRef.current = target;
    setScreenRaw(target);
  };
  const setScreen = (s: Screen) => doGo(s);
  const tryLeave = (target: Screen, viaPop = false) => {
    if (screenRef.current.name === "play" && midPlay.current) { if (viaPop) history.pushState({ keya: 1 }, ""); setConfirm(target); return; }
    doGo(target, viaPop);
  };
  useEffect(() => {
    const onPop = () => {
      if (ignorePop.current) { ignorePop.current = false; return; }
      const up = parentOf(screenRef.current);
      if (up) tryLeave(up, true);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  if (!family || screen.name === "setup")
    return <Setup onDone={f => { save(f); setFamily(f); setScreen({ name: "who" }); }} />;

  const back = parentOf(screen);
  const home: Screen | null = screen.name === "who" || screen.name === "map" ? null : { name: screen.name === "pin" || screen.name === "parent" || !child ? "who" : "map" };
  const top = (
    <>
      <header class="topbar">
        <nav class="navbtns">
          {back && <button class="navbtn" aria-label="back" onClick={() => tryLeave(back)}><span aria-hidden="true">←</span> {t("back", lang)}</button>}
          {home && <button class="navbtn" aria-label="home" onClick={() => tryLeave(home)}><span aria-hidden="true">🏠</span> {t("home", lang)}</button>}
        </nav>
        <span class="brand">{t("appName", lang)}</span>
        <button class="ghost" aria-pressed={voice} aria-label="sound" onClick={() => { setVoice(!voice); setVoiceState(!voice); }}>{voice ? "🔊" : "🔇"}</button>
      </header>
      <SpeechNotice lang={lang} />
      {confirm && (
        <div class="leave-confirm" role="dialog" aria-label="leave">
          <p>{t("leaveAsk", lang)}</p>
          <div class="row">
            <button class="primary" onClick={() => setConfirm(null)}>{t("stay", lang)}</button>
            <button class="soft" onClick={() => doGo(confirm)}>{t("leave", lang)}</button>
          </div>
        </div>
      )}
    </>
  );

  if (screen.name === "pin")
    return <div class="app">{top}<PinPad title={t("grownUp", lang)} onCancel={() => setScreen({ name: "who" })}
      onPin={async pin => { if ((await hashPin(pin)) === family.pinHash) { setScreen({ name: "parent" }); return true; } return false; }} /></div>;

  if (screen.name === "parent")
    return <div class="app">{top}<Parent family={family} persist={persist}
      onWiped={() => { setFamily(null); setScreen({ name: "setup" }); }} onExit={() => setScreen({ name: "who" })} /></div>;

  if (screen.name === "who" || !child)
    return (
      <div class="app">{top}
        <div class="screen who">
          <div class="guide"><Keya size={72} /><p class="bubble neutral">{t("whoPlaying", "en")} · {t("whoPlaying", "hi")}</p></div>
          <div class="kids">
            {family.children.map(c => (
              <button key={c.id} class="kid" onClick={() => { setChildId(c.id); setScreen({ name: "map" }); say(`${c.nickname}!`, c.lang); }}>
                <span class="avatar">{c.avatar}</span><b>{c.nickname}</b>
              </button>
            ))}
          </div>
          <button class="ghost grown" onClick={() => setScreen({ name: "pin" })}>👪 {t("grownUp", "en")} / {t("grownUp", "hi")}</button>
        </div>
      </div>
    );

  if (screen.name === "play") {
    const game = screen.game;
    const saveSession = (r: PlayResult) => upsertSession(child, { id: r.id, date: today(family.tz), game, minutes: r.minutes, items: r.items, alone: r.alone,
      grown: r.grown, attempts: r.attempts.map(a => ({ skill: a.skill, correct: a.correct, hint: a.hint, mistake: a.mistake, phase: a.phase })) });
    return (
      <div class="app">{top}
        <div hidden={onBreak}>
          <Play family={family} child={child} game={screen.game}
            onSave={r => { saveSession(r); persist(); }}
            onMid={m => { midPlay.current = m; }}
            onBreak={() => { stop(); setOnBreak(true); say(t("breakSay", lang), lang); }}
            onEnd={r => { saveSession(r); prune(family, today(family.tz)); persist(); setScreen({ name: "goodbye", game: screen.game, r }); }} />
        </div>
        {onBreak && (
          <div class="screen break">
            <Keya size={96} />
            <h2>{t("breakTitle", lang)}</h2>
            <p class="lead">{t("breakSay", lang)}</p>
            <button class="primary" onClick={() => setOnBreak(false)}>{t("ready", lang)}</button>
          </div>
        )}
      </div>
    );
  }

  if (screen.name === "goodbye") {
    const { r, game } = screen;
    const line = `${t("goodbyeSay", lang)} ${HOME[game][lang]}`;
    return (
      <div class="app">{top}
        <div class="screen goodbye">
          <Keya size={96} mood="cheer" />
          <h2>{t("goodbyeTitle", lang)}</h2>
          <ul class="today">
            <li>{t("todayYou", lang)}: <b>{r.alone}</b> {t("solvedAlone", lang)}</li>
            {r.grown.map(id => <li key={id}>{PLACE_ICON[id]} {skillOf(id).canDo[lang]}</li>)}
          </ul>
          <div class="homecard"><small>{t("homeChallenge", lang)}</small><p>{HOME[game][lang]}</p></div>
          <div class="row">
            <button class="soft" onClick={() => say(line, lang, true)}>🔊 {t("sayAgain", lang)}</button>
            <button class="primary" onClick={() => { stop(); setScreen({ name: "who" }); }}>{t("bye", lang)}</button>
          </div>
        </div>
        <SayOnce text={line} lang={lang} />
      </div>
    );
  }

  if (screen.name === "book")
    return (
      <div class="app">{top}
        <div class="screen book">
          <h2>{t("skillBook", lang)}</h2>
          <div class="cards">
            {SKILLS.filter(s => child.openClasses.includes(s.cls)).map(s => {
              const st = child.learner.skills[s.id]?.state ?? "not_started";
              const got = st === "mastered" || st === "secure";
              return <div key={s.id} class={`skillcard ${got ? "" : "dim"}`}><span class="ic">{got ? PLACE_ICON[s.id] : "⬜"}</span><b>{s.canDo[lang]}</b></div>;
            })}
          </div>
          <button class="primary" onClick={() => setScreen({ name: "map" })}>{t("back", lang)}</button>
        </div>
      </div>
    );

  // Town map
  const day = today(family.tz);
  const due = dueReviews(child.learner, day);
  return (
    <div class="app">{top}
      <div class="screen map">
        <div class="maphead">
          <span class="avatar sm">{child.avatar}</span><b>{child.nickname}</b>
          <button class="ghost" onClick={() => { child.lang = lang === "hi" ? "en" : "hi"; persist(); }}>{lang === "hi" ? "English" : "हिंदी"}</button>
          <button class="ghost" onClick={() => setScreen({ name: "book" })}>📖 {t("skillBook", lang)}</button>
        </div>
        {due.length > 0 && (
          <button class="visitor" onClick={() => setScreen({ name: "play", game: skillOf(due[0]).game })}>
            <span aria-hidden="true">🧑‍🌾</span> {t("visitorSays", lang)}
          </button>
        )}
        <Town child={child} lang={lang} onPick={g => setScreen({ name: "play", game: g })} />
      </div>
      <SayOnce text={`${t("tagline", lang)}`} lang={lang} />
    </div>
  );
}

function SayOnce({ text, lang }: { text: string; lang: Lang }) {
  useEffect(() => { say(text, lang); }, [text]);
  return null;
}

const DISTRICT: Record<GameId, { bg: string; icon: string }> = {
  sabzi: { bg: "#fde2cf", icon: "🥕" }, laddoo: { bg: "#ffe9b8", icon: "🍬" }, cat: { bg: "#e6e0f8", icon: "🐱" }, rangoli: { bg: "#fbd8e6", icon: "🌺" },
  sounds: { bg: "#dff3d6", icon: "🌻" }, caps: { bg: "#d9ecf7", icon: "🧢" }, listen: { bg: "#f6e7d2", icon: "👂" },
  beads: { bg: "#fde6c8", icon: "📿" }, stall: { bg: "#fbd3d0", icon: "🎪" },
  share: { bg: "#d8efd3", icon: "🧺" }, hundreds: { bg: "#d6e4fa", icon: "🧱" },
};

function Town({ child, lang, onPick }: { child: Child; lang: Lang; onPick: (g: GameId) => void }) {
  // Sections by class, the child's own class first; inside a class, maths then English.
  const classes = ([1, 2, 3] as const).slice().sort((a, b) => (a === child.cls ? -1 : b === child.cls ? 1 : a - b));
  return (
    <div class="townwrap">
      {classes.map(cls => {
        const games = GAMES.filter(g => g.cls === cls);
        const open = child.openClasses.includes(cls);
        return (
          <section key={cls} class={`classblock ${open ? "" : "closedblock"}`}>
            <h3 class="classhead">{lang === "hi" ? `कक्षा ${cls}` : `Class ${cls}`}{!open && <span class="lock"> 🔒 {lang === "hi" ? "बड़ों से खुलवाओ" : "Ask a grown-up to open"}</span>}</h3>
            {(["maths", "english"] as const).filter(sub => games.some(g => g.subject === sub)).map(sub => (
              <div key={sub}>
                {cls === 1 && <h4 class="subhead">{t(sub, lang)}</h4>}
                <div class="town">
                  {games.filter(g => g.subject === sub).map(g => {
                    const levels = skillsFor(g.id);
                    const grown = levels.filter(s => ["mastered", "secure"].includes(child.learner.skills[s.id]?.state ?? ""));
                    return (
                      <button key={g.id} class={`district ${open ? "" : "closed"}`} style={{ background: DISTRICT[g.id].bg }} disabled={!open} onClick={() => open && onPick(g.id)}>
                        <span class="dicon" aria-hidden="true">{DISTRICT[g.id].icon}</span>
                        <b>{g.name[lang]}</b>
                        <small>{g.blurb[lang]}</small>
                        <span class="plots" aria-label={`${grown.length} of ${levels.length}`}>
                          {levels.map(s => <span key={s.id} class={`plot ${grown.includes(s) ? "built" : ""}`}>{grown.includes(s) ? PLACE_ICON[s.id] : ""}</span>)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </section>
        );
      })}
    </div>
  );
}

// ---------- first-run setup, for the parent ----------

function Setup({ onDone }: { onDone: (f: Family) => void }) {
  const [step, setStep] = useState(0);
  const [agree, setAgree] = useState(false);
  const [pinHash, setPinHash] = useState("");
  const [first, setFirst] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [cls, setCls] = useState<Cls>(1);
  const [lang, setLang] = useState<Lang>("hi");
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata";

  if (step === 0)
    return (
      <div class="app"><div class="screen setup">
        <Keya size={110} />
        <h1>Keya · केया</h1>
        <p class="lead">A learning town for Classes 1 to 3, built on the NCERT books: maths for every class, and English for Class 1. 10–15 minutes a day. No ads, no chat, no answers handed out.</p>
        <p class="lead hi">कक्षा 1 से 3 के लिए सीखने का नगर, NCERT किताबों के अनुसार: हर कक्षा के लिए गणित और कक्षा 1 के लिए अंग्रेज़ी। रोज़ 10–15 मिनट। कोई विज्ञापन नहीं, कोई चैट नहीं।</p>
        <button class="primary" onClick={() => setStep(1)}>Set up (for parents) · शुरू करें</button>
      </div></div>
    );

  if (step === 1)
    return (
      <div class="app"><div class="screen setup notice">
        <h2>Before you start</h2>
        <ul>
          <li><b>We store:</b> your child's nickname, class, language, picture choice and maths progress.</li>
          <li><b>We never ask for:</b> real name, school, photos, location or contacts.</li>
          <li><b>Where:</b> on this phone only. Cloud backup is off unless you turn it on.</li>
          <li><b>No AI chat, no ads, no contact with other users.</b></li>
          <li><b>You can</b> see the progress, remove anything we noticed, and delete everything at any time.</li>
        </ul>
        <p class="hi small">हम आपके बच्चे का उपनाम, कक्षा, भाषा, चित्र और गणित की प्रगति इसी फ़ोन पर रखते हैं। असली नाम, स्कूल, फ़ोटो या जगह नहीं माँगते। आप कभी भी सब मिटा सकते हैं।</p>
        <label class="check"><input type="checkbox" checked={agree} onChange={e => setAgree((e.target as HTMLInputElement).checked)} />
          I am this child's parent or guardian and I agree. · मैं इस बच्चे का माता-पिता/अभिभावक हूँ और सहमत हूँ।</label>
        <button class="primary" disabled={!agree} onClick={() => setStep(2)}>Continue · आगे</button>
      </div></div>
    );

  if (step === 2)
    return (
      <div class="app">
        <PinPad title={first ? "Type the PIN again · फिर से PIN डालें" : "Choose a 4-digit grown-up PIN · बड़ों का 4 अंकों का PIN चुनें"}
          onPin={async pin => {
            if (!first) { setFirst(pin); return true; }
            if (pin !== first) { setFirst(null); return false; }
            setPinHash(await hashPin(pin)); setStep(3); return true;
          }} />
      </div>
    );

  return (
    <div class="app"><div class="screen setup">
      <h2>Add your child · बच्चा जोड़ें</h2>
      <label class="field">Nickname · उपनाम<input value={name} maxLength={16} onInput={e => setName((e.target as HTMLInputElement).value)} placeholder="Riya" /></label>
      <div class="field">Class · कक्षा
        <div class="seg">{([1, 2, 3] as const).map(c => <button key={c} aria-pressed={cls === c} onClick={() => setCls(c)}>{c}</button>)}</div></div>
      <div class="field">Keya speaks · केया बोलेगी
        <div class="seg"><button aria-pressed={lang === "hi"} onClick={() => setLang("hi")}>हिंदी</button><button aria-pressed={lang === "en"} onClick={() => setLang("en")}>English</button></div></div>
      <div class="field">Picture · चित्र
        <div class="avatars">{AVATARS.map(a => <button key={a} aria-pressed={avatar === a} onClick={() => setAvatar(a)}>{a}</button>)}</div></div>
      <button class="primary" disabled={!name.trim()} onClick={() => {
        const f = newFamily(pinHash, tz);
        addChild(f, name, cls, lang, avatar);
        onDone(f);
      }}>Done · हो गया</button>
    </div></div>
  );
}
