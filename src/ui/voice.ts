/** Keya's voice, using the phone's built-in speech until recorded clips exist.
 *  Every spoken line is also shown on screen, so the app works with sound off or no voice installed.
 *
 *  Why speech failed before, and what this file does about it:
 *  1. Browsers (iPhone Safari especially) only allow speech that starts from a tap. We "unlock" speech
 *     inside the first tap anywhere on the page, with a silent utterance.
 *  2. Chrome can drop an utterance spoken immediately after cancel(). We wait briefly after cancelling.
 *  3. Voices load a moment after the page opens. We wait for them before choosing one.
 *  4. Errors were hidden. They are now recorded and shown in the parent's voice test.
 *  5. Hindi lines often contain English words (in the English games). Those are spoken with an English voice.
 *  6. Chrome stops long utterances after about 15 seconds; lines are spoken in short parts.
 */
import type { Lang } from "../engine/skills";

let enabled = true;
let unlocked = false;
let onTalk: (talking: boolean) => void = () => {};
let seq = 0;                       // increases on every new say(); stale queued parts are skipped
let lastError = "";
const synth = (): SpeechSynthesis | null => (typeof window !== "undefined" && "speechSynthesis" in window ? window.speechSynthesis : null);

export const setVoice = (on: boolean) => { enabled = on; if (!on) stop(); };
export const voiceOn = () => enabled;
export const onTalking = (fn: (t: boolean) => void) => { onTalk = fn; };

// ---------- voices ----------

let voices: SpeechSynthesisVoice[] = [];
const voicesReady: Promise<void> = new Promise(resolve => {
  const s = synth();
  if (!s) return resolve();
  const load = () => { voices = s.getVoices(); if (voices.length) resolve(); };
  load();
  s.addEventListener?.("voiceschanged", load);
  setTimeout(() => { voices = s.getVoices(); resolve(); }, 2500);     // some browsers never fire the event
});

function pickVoice(lang: Lang): SpeechSynthesisVoice | undefined {
  if (lang === "hi") return voices.find(v => /^hi([-_]|$)/i.test(v.lang));
  return voices.find(v => /^en[-_]IN/i.test(v.lang)) ?? voices.find(v => /^en[-_](GB|US)/i.test(v.lang)) ?? voices.find(v => /^en/i.test(v.lang));
}

export async function voiceStatus() {
  await voicesReady;
  return { supported: !!synth(), voices: voices.length, hindi: !!pickVoice("hi"), english: !!pickVoice("en"), unlocked, lastError };
}

// ---------- unlock on the first tap ----------

function unlock() {
  const s = synth();
  if (unlocked || !s) return;
  try {
    // A silent, empty utterance inside the tap: allows later speech on iPhone Safari.
    // It is not tracked as Keya's line, so the first real line never cancels it.
    if (!s.speaking && !s.pending) { const u = new SpeechSynthesisUtterance(""); u.volume = 0; s.speak(u); }
    unlocked = true;
  } catch (e) { lastError = String(e); }
  try { ac?.resume(); } catch { /* ignore */ }
}
if (typeof document !== "undefined") {
  for (const ev of ["pointerdown", "touchend", "keydown"]) document.addEventListener(ev, unlock, { capture: true, passive: true });
}

// ---------- speaking ----------

export function stop() {
  seq++;
  try { if (current) synth()?.cancel(); } catch { /* not supported */ }
  onTalk(false);
}

const tidy = (text: string, lang: Lang) => text
  .replace(/−/g, lang === "hi" ? " घटा " : " minus ")
  .replace(/×/g, lang === "hi" ? " गुणा " : " times ")
  .replace(/₹(\d+)/g, lang === "hi" ? "$1 रुपये" : "$1 rupees")
  .replace(/[📿🔊💡⏸↩]/gu, "");

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

let current: { done: Promise<void> } | null = null;   // the utterance Keya is speaking now (not the silent unlock)
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

export async function say(text: string, lang: Lang, force = false) {
  const s = synth();
  if ((!enabled && !force) || !text || !s) return;
  const my = ++seq;
  try {
    if (current) {
      // Stop Keya's previous line and wait until the browser confirms it has stopped:
      // speaking right after cancel() is dropped on some browsers.
      const prev = current;
      s.cancel();
      await Promise.race([prev.done, sleep(400)]);
      await sleep(60);
    }
    await voicesReady;
    if (my !== seq) return;
    try { s.resume(); } catch { /* ignore */ }
    const parts = splitParts(tidy(text, lang), lang);
    onTalk(true);
    for (const p of parts) {
      if (my !== seq) return;
      await speakOne(p.text, p.lang);
    }
    if (my === seq) onTalk(false);
  } catch (e) { lastError = String(e); onTalk(false); }
}

function speakOne(text: string, lang: Lang): Promise<void> {
  const s = synth()!;
  const u = new SpeechSynthesisUtterance(text);
  const v = pickVoice(lang);
  u.lang = v?.lang ?? (lang === "hi" ? "hi-IN" : "en-IN");
  if (v) u.voice = v;
  u.rate = lang === "hi" ? 0.9 : 0.85; u.pitch = 1.15;
  const done = new Promise<void>(resolve => {
    let fin = false;
    const finish = () => { if (!fin) { fin = true; clearTimeout(guard); if (current?.done === done) current = null; resolve(); } };
    u.onend = finish;
    u.onerror = e => { const err = (e as SpeechSynthesisErrorEvent).error; if (err !== "interrupted" && err !== "canceled") lastError = err ?? "error"; finish(); };
    // Never hang the game if the browser never reports the end.
    const guard = setTimeout(finish, 1500 + text.length * 110);
  });
  current = { done };
  s.speak(u);
  return done;
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
  if (after.lastError) out.push(`Last speech error: ${after.lastError}.`);
  return out;
}

// ---------- soft sounds made in code, no files. No error buzzer: mistakes are handled by words only. ----------

let ac: AudioContext | null = null;
export function chime(kind: "tap" | "good" | "grow") {
  if (!enabled) return;
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
