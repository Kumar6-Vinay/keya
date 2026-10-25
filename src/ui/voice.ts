/** Keya's voice, using the phone's built-in speech until recorded clips exist.
 *  Every spoken line is also shown on screen, so the app works with sound off or no voice installed.
 *
 *  How speech works here, and why (each point was a real failure):
 *  1. Only one line is ever "current". A new line cancels the old one, waits until the engine reports idle,
 *     then speaks. Events from a cancelled utterance carry an old line number and are ignored, so a late
 *     "interrupted" or "canceled" can never end the new line.
 *  2. Chrome and Android can swallow an utterance spoken just after cancel(): no start, no end, no error,
 *     and `speaking` stays true. Every utterance therefore has a start watchdog. If it never starts we cancel,
 *     wait, and speak it once more; if it still does not start we say so on screen instead of staying silent.
 *  3. Nothing is spoken to "unlock" speech. (A silent empty utterance sat in the queue and could block the
 *     first real line.) A line that could not start is kept, and spoken on the next tap, which is what iPhone
 *     Safari and an embedded preview frame need.
 *  4. Voices load a moment after the page opens. Hindi lines wait briefly for them; English lines do not.
 *  5. Hindi lines often contain English words (in the English games). Those are spoken with an English voice.
 *  6. Chrome stops long utterances after about 15 seconds; lines are spoken in short parts.
 *  7. Problems are shown (see `onNotice`): sound blocked, voice not starting, no Hindi voice, no speech at all.
 */
import type { Lang } from "../engine/skills";

export type NoticeKind = "blocked" | "stuck" | "unsupported" | "no-hindi";
/** Most important first. Only the first one present is shown. */
const NOTICE_ORDER: NoticeKind[] = ["blocked", "stuck", "unsupported", "no-hindi"];

export interface SpeechDeps {
  synth: () => SpeechSynthesis | null;
  utter: (text: string) => SpeechSynthesisUtterance;
}

const START_WAIT = 1500;       // an utterance that has not started by now was swallowed
const IDLE_POLL = 25;
const IDLE_MAX = 900;          // give up waiting for the engine to go idle after this long
const VOICE_WAIT = 1200;       // Hindi lines wait this long for the voice list on a cold start

interface Line {
  id: number;
  text: string;                           // as asked for, kept so a blocked line can be spoken again on the next tap
  lang: Lang;
  parts: { text: string; lang: Lang }[];
  i: number;
  utt: SpeechSynthesisUtterance | null;   // held so the browser cannot garbage-collect it mid-speech
  started: boolean;
  tries: number;
  waitedForVoices?: boolean;
  startTimer?: ReturnType<typeof setTimeout>;
  endTimer?: ReturnType<typeof setTimeout>;
  resolve: () => void;
}

export function createSpeaker(deps: SpeechDeps) {
  let enabled = true;
  let seq = 0;
  let line: Line | null = null;
  let last: { text: string; lang: Lang } | null = null;     // latest line asked for, even when sound is off
  let retry: { text: string; lang: Lang } | null = null;    // a line that could not start; spoken on the next tap
  let talking = false;
  let lastError = "";
  let spoke = false;                                        // some line has started playing
  let voices: SpeechSynthesisVoice[] = [];
  let onTalk: (t: boolean) => void = () => {};
  const notices = new Set<NoticeKind>();
  const noticeListeners = new Set<(n: NoticeKind | null) => void>();

  const refreshVoices = () => { const v = deps.synth()?.getVoices() ?? []; if (v.length) voices = v; };
  deps.synth()?.addEventListener?.("voiceschanged", refreshVoices);
  refreshVoices();

  function pickVoice(lang: Lang) {
    if (lang === "hi") return voices.find(v => /^hi([-_]|$)/i.test(v.lang));
    return voices.find(v => /^en[-_]IN/i.test(v.lang)) ?? voices.find(v => /^en[-_](GB|US)/i.test(v.lang)) ?? voices.find(v => /^en/i.test(v.lang));
  }

  // ---------- notices ----------

  const current = () => NOTICE_ORDER.find(k => notices.has(k)) ?? null;
  function setNotice(kind: NoticeKind, on: boolean) {
    const before = current();
    if (on) notices.add(kind); else notices.delete(kind);
    const after = current();
    if (before !== after) noticeListeners.forEach(fn => fn(after));
  }

  const setTalking = (t: boolean) => { if (talking !== t) { talking = t; onTalk(t); } };

  // ---------- one line ----------

  function clearTimers(ln: Line) { clearTimeout(ln.startTimer); clearTimeout(ln.endTimer); }

  /** The line is over: finished, replaced, or given up. */
  function endLine(ln: Line | null) {
    if (!ln) return;
    clearTimers(ln);
    ln.utt = null;
    ln.resolve();
  }

  function finish(ln: Line) {
    if (ln.id !== seq) return;
    endLine(ln);
    line = null;
    setTalking(false);
  }

  function advance(ln: Line) {
    if (ln.id !== seq) return;
    clearTimers(ln);
    ln.i++; ln.tries = 0; ln.started = false;
    if (ln.i >= ln.parts.length) finish(ln); else speakPart(ln);
  }

  /** Wait until the engine is idle after a cancel, then run. Gives up waiting after IDLE_MAX and runs anyway. */
  function whenIdle(ln: Line, run: () => void) {
    const s = deps.synth()!;
    let waited = 0;
    const tick = () => {
      if (ln.id !== seq) return;
      if (!s.speaking && !s.pending) return run();
      waited += IDLE_POLL;
      if (waited === 400) { try { s.cancel(); } catch { /* ignore */ } }
      if (waited >= IDLE_MAX) return run();
      setTimeout(tick, IDLE_POLL);
    };
    setTimeout(tick, IDLE_POLL);
  }

  function speakPart(ln: Line) {
    const s = deps.synth();
    if (!s || ln.id !== seq) return;
    const part = ln.parts[ln.i];
    // Hindi on a cold start: the voice list may not be there yet.
    refreshVoices();
    if (part.lang === "hi" && !voices.length && !spoke && !ln.waitedForVoices) {
      ln.waitedForVoices = true;
      const t0 = Date.now();
      const poll = () => {
        if (ln.id !== seq) return;
        refreshVoices();
        if (voices.length || Date.now() - t0 >= VOICE_WAIT) speakPart(ln); else setTimeout(poll, 50);
      };
      setTimeout(poll, 50);
      return;
    }
    if (voices.length) setNotice("no-hindi", part.lang === "hi" ? !pickVoice("hi") : notices.has("no-hindi"));

    const u = deps.utter(part.text);
    const v = pickVoice(part.lang);
    u.lang = v?.lang ?? (part.lang === "hi" ? "hi-IN" : "en-IN");
    if (v) u.voice = v;
    u.rate = part.lang === "hi" ? 0.9 : 0.85; u.pitch = 1.15; u.volume = 1;
    ln.utt = u; ln.started = false;

    const mine = () => ln.id === seq && ln.utt === u;
    u.onstart = () => {
      if (!mine()) return;
      ln.started = true; spoke = true;
      clearTimeout(ln.startTimer);
      setNotice("blocked", false); setNotice("stuck", false);
      setTalking(true);
    };
    u.onend = () => { if (mine()) advance(ln); };
    u.onerror = e => {
      if (!mine()) return;                                   // an old, cancelled utterance: not our business
      const err = (e as SpeechSynthesisErrorEvent).error ?? "error";
      if (err === "not-allowed") { giveUp(ln, "blocked"); return; }
      if (err === "interrupted" || err === "canceled") { advance(ln); return; }
      lastError = err;
      if (err === "synthesis-unavailable" || err === "audio-hardware") { giveUp(ln, "stuck"); return; }
      advance(ln);                                           // language/voice trouble on one part: go on to the next
    };

    // Swallowed utterance: no start event at all. Cancel, wait, and speak it once more.
    ln.startTimer = setTimeout(() => {
      if (!mine() || ln.started) return;
      if (s.paused) { try { s.resume(); } catch { /* ignore */ } }
      if (ln.tries < 1) {
        ln.tries++;
        try { s.cancel(); } catch { /* ignore */ }
        whenIdle(ln, () => { try { s.resume(); } catch { /* ignore */ } speakPart(ln); });
      } else giveUp(ln, "stuck");
    }, START_WAIT);
    // If the browser never reports the end, do not hang the line.
    const guard = (extra: number) => {
      ln.endTimer = setTimeout(() => {
        if (!mine()) return;
        if (ln.started && (s.speaking) && extra < 4) return guard(extra + 1);
        if (!ln.started) return;                              // the start watchdog owns this case
        advance(ln);
      }, 3000 + part.text.length * 130 + extra * 1500);
    };
    guard(0);

    try { s.speak(u); } catch (e) { lastError = String(e); giveUp(ln, "blocked"); }
  }

  /** The browser will not play this line now. Keep it for the next tap and say so on screen. */
  function giveUp(ln: Line, kind: "blocked" | "stuck") {
    if (ln.id !== seq) return;
    retry = { text: ln.text, lang: ln.lang };
    setNotice(kind, true);
    try { deps.synth()?.cancel(); } catch { /* ignore */ }
    finish(ln);
  }

  // ---------- public ----------

  function say(text: string, lang: Lang, force = false): Promise<void> {
    last = { text, lang };
    if (!text || (!enabled && !force)) return Promise.resolve();
    const s = deps.synth();
    if (!s) { setNotice("unsupported", true); return Promise.resolve(); }
    const parts = splitParts(speakable(text, lang), lang);
    if (!parts.length) return Promise.resolve();
    retry = null;
    const prev = line;
    return new Promise<void>(resolve => {
      const ln: Line = { id: ++seq, text, lang, parts, i: 0, utt: null, started: false, tries: 0, resolve };
      endLine(prev);
      line = ln;
      try { s.resume(); } catch { /* ignore */ }
      if (prev || s.speaking || s.pending) {
        try { s.cancel(); } catch { /* ignore */ }
        whenIdle(ln, () => speakPart(ln));
      } else speakPart(ln);                                  // idle engine: speak inside the caller's tap
    });
  }

  function stop() {
    const prev = line;
    seq++; line = null;
    endLine(prev);
    try { if (prev || deps.synth()?.speaking || deps.synth()?.pending) deps.synth()?.cancel(); } catch { /* not supported */ }
    setTalking(false);
  }

  /** The voice switch. Turning it on says the current line again, so the tap is heard to work. */
  function setVoice(on: boolean) {
    enabled = on;
    if (!on) { stop(); retry = null; return; }
    if (last) void say(last.text, last.lang);
  }

  /** A tap anywhere: if a line could not start, speak it now, inside the tap (what iPhone Safari needs). */
  function onTap() {
    if (!retry || !enabled) return;
    const r = retry;
    void say(r.text, r.lang);
  }

  async function status() {
    refreshVoices();
    if (!voices.length && deps.synth()) { await new Promise(r => setTimeout(r, VOICE_WAIT)); refreshVoices(); }
    return { supported: !!deps.synth(), voices: voices.length, hindi: !!pickVoice("hi"), english: !!pickVoice("en"), unlocked: spoke, lastError };
  }

  return {
    say, stop, setVoice, onTap, status,
    voiceOn: () => enabled,
    onTalking: (fn: (t: boolean) => void) => { onTalk = fn; },
    onNotice: (fn: (n: NoticeKind | null) => void) => { noticeListeners.add(fn); return () => { noticeListeners.delete(fn); }; },
    notice: current,
    /** True while a line is being spoken or is waiting its turn. */
    busy: () => !!line,
  };
}

// ---------- text preparation ----------

/** What the child hears for the picture tokens used in patterns, so a line like "Next comes 🔵" is spoken. */
const EMOJI_WORD: Record<string, Record<Lang, string>> = {
  "🔴": { en: "red", hi: "लाल" }, "🔵": { en: "blue", hi: "नीला" }, "🟡": { en: "yellow", hi: "पीला" }, "🟢": { en: "green", hi: "हरा" },
  "🟠": { en: "orange", hi: "नारंगी" }, "⭐": { en: "star", hi: "तारा" }, "🌸": { en: "flower", hi: "फूल" }, "🪔": { en: "diya", hi: "दीया" },
  "🔺": { en: "triangle", hi: "तिकोना" },
};
export const emojiWord = (e: string, lang: Lang) => EMOJI_WORD[e]?.[lang] ?? "";

/** The words actually sent to the speech engine for a line shown on screen. */
export const speakable = (text: string, lang: Lang) => text
  .replace(/−/g, lang === "hi" ? " घटा " : " minus ")
  .replace(/×/g, lang === "hi" ? " गुणा " : " times ")
  .replace(/₹(\d+)/g, lang === "hi" ? "$1 रुपये" : "$1 rupees")
  .replace(/[🔴🔵🟡🟢🟠⭐🌸🪔🔺]/gu, m => ` ${emojiWord(m, lang)} `)
  .replace(/[📿🔊💡⏸↩]/gu, "")
  .replace(/[ \t]{2,}/g, " ").trim();

/** Split a line into parts: Hindi text with a Hindi voice, embedded English words with an English voice. */
export function splitParts(text: string, lang: Lang): { text: string; lang: Lang }[] {
  if (lang === "en") return sentences(text).map(t => ({ text: t, lang }));
  const parts: { text: string; lang: Lang }[] = [];
  const re = /([A-Za-z][A-Za-z'’ ,!?.-]*[A-Za-z!?.]|[A-Za-z])/g;
  let last = 0, m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push({ text: text.slice(last, m.index), lang: "hi" });
    parts.push({ text: m[0], lang: "en" });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last), lang: "hi" });
  return parts.flatMap(p => sentences(p.text).map(t => ({ text: t, lang: p.lang }))).filter(p => /[\p{L}\p{N}]/u.test(p.text));
}
const sentences = (t: string) => t.split(/(?<=[.?!।])\s+/).map(x => x.trim()).filter(Boolean);

// ---------- the app's speaker ----------

const browserSynth = (): SpeechSynthesis | null => (typeof window !== "undefined" && "speechSynthesis" in window ? window.speechSynthesis : null);
const speaker = createSpeaker({ synth: browserSynth, utter: text => new SpeechSynthesisUtterance(text) });

export const say = speaker.say;
export const stop = speaker.stop;
export const setVoice = speaker.setVoice;
export const voiceOn = speaker.voiceOn;
export const onTalking = speaker.onTalking;
export const onNotice = speaker.onNotice;
export const getNotice = speaker.notice;
export const voiceStatus = speaker.status;
/** Used by the app's own pages to say a blocked/stuck line again when the child taps 🔊 on the notice. */
export const retryNow = speaker.onTap;

if (typeof document !== "undefined") {
  for (const ev of ["pointerdown", "touchend", "keydown"]) document.addEventListener(ev, () => { speaker.onTap(); try { ac?.resume(); } catch { /* ignore */ } }, { capture: true, passive: true });
}

/** Speak a test line in each language for the parent's voice check. */
export async function testVoice(): Promise<string[]> {
  const st = await voiceStatus();
  const out: string[] = [];
  if (!st.supported) return ["This browser has no speech. Keya's lines will show as text only."];
  out.push(`${st.voices} voices found on this device.`);
  out.push(st.english ? "English voice: found." : "English voice: not found.");
  out.push(st.hindi ? "Hindi voice: found." : "Hindi voice: not found. Hindi lines will show as text. On Android, install Hindi in Settings › Text-to-speech (Google). On iPhone, add a Hindi voice in Settings › Accessibility › Spoken Content › Voices.");
  await say("Hello! I am Keya.", "en", true);
  if (st.hindi) await say("नमस्ते! मैं केया हूँ।", "hi", true);
  const after = await voiceStatus();
  if (getNotice() === "blocked" || getNotice() === "stuck") out.push("Sound did not start here. If this page is inside a preview frame, open it in its own browser tab.");
  if (after.lastError) out.push(`Last speech error: ${after.lastError}.`);
  return out;
}

// ---------- soft sounds made in code, no files. No error buzzer: mistakes are handled by words only. ----------

let ac: AudioContext | null = null;
export function chime(kind: "tap" | "good" | "grow") {
  if (!speaker.voiceOn()) return;
  try {
    ac ??= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (ac.state === "suspended") ac.resume();
    const notes = kind === "tap" ? [660] : kind === "good" ? [523, 659] : [523, 659, 784, 1047];
    notes.forEach((f, i) => {
      const t0 = ac!.currentTime + i * 0.1, o = ac!.createOscillator(), g = ac!.createGain();
      o.type = "sine"; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(kind === "tap" ? 0.03 : 0.08, t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.25);
      o.connect(g).connect(ac!.destination); o.start(t0); o.stop(t0 + 0.3);
    });
  } catch { /* audio not available */ }
}

/** Recorded clips (e.g. letter sounds) override speech when present: /audio/<key>.mp3. */
export function playClip(key: string, fallback: () => void) {
  let used = false;
  const fb = () => { if (!used) { used = true; fallback(); } };
  try {
    const a = new Audio(`audio/${key}.mp3`);
    a.onerror = fb;
    a.play().catch(fb);
  } catch { fb(); }
}
