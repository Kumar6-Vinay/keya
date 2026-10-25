import { createSpeaker, NoticeKind, splitParts } from "../src/ui/voice";

/** A small stand-in for speechSynthesis. Events arrive through timers, so tests control timing with fake timers. */
class FakeUtterance {
  lang = ""; voice: { name: string; lang: string } | null = null; rate = 1; pitch = 1; volume = 1;
  onstart: (() => void) | null = null; onend: (() => void) | null = null; onerror: ((e: { error: string }) => void) | null = null;
  constructor(public text: string) {}
}

class FakeSynth {
  voices: { name: string; lang: string }[] = [];
  spoken: { text: string; lang: string; voice: string | null }[] = [];   // handed to speak()
  played: string[] = [];                                                 // actually started
  playing: FakeUtterance | null = null;
  queue: FakeUtterance[] = [];
  wedged = false;                 // the engine swallowed an utterance: busy, silent, no events
  swallowNext = false;            // swallow the next utterance given to speak()
  swallowAlways = false;          // an engine that never starts (cancel does not help)
  deny = false;                   // speech blocked: every utterance fails with "not-allowed"
  cancels = 0;
  staleErrorDelay = 30;           // how late the "interrupted" event of a cancelled utterance arrives
  paused = false;

  get speaking() { return this.wedged || !!this.playing; }
  get pending() { return this.queue.length > 0; }
  getVoices() { return this.voices; }
  addEventListener() { /* voiceschanged is not needed here */ }
  resume() { this.paused = false; }

  speak(u: FakeUtterance) {
    this.spoken.push({ text: u.text, lang: u.lang, voice: u.voice?.name ?? null });
    if (this.deny) { setTimeout(() => u.onerror?.({ error: "not-allowed" }), 1); return; }
    if (this.swallowAlways || this.swallowNext) { this.swallowNext = false; this.wedged = true; return; }
    if (this.wedged) return;
    this.queue.push(u);
    this.pump();
  }
  private pump() {
    if (this.playing || !this.queue.length) return;
    const u = this.playing = this.queue.shift()!;
    setTimeout(() => { if (this.playing === u) { this.played.push(u.text); u.onstart?.(); } }, 5);
  }
  cancel() {
    this.cancels++;
    if (this.wedged && !this.swallowAlways) this.wedged = false;
    const gone = [...(this.playing ? [this.playing] : []), ...this.queue];
    this.playing = null; this.queue = [];
    for (const u of gone) setTimeout(() => u.onerror?.({ error: "interrupted" }), this.staleErrorDelay);
  }
  /** The utterance that is playing reaches its end. */
  finish() {
    const u = this.playing;
    if (!u) return false;
    this.playing = null;
    u.onend?.();
    this.pump();
    return true;
  }
}

function setup(opts: { hindi?: boolean; english?: boolean } = {}) {
  const synth = new FakeSynth();
  if (opts.english !== false) synth.voices.push({ name: "Rishi", lang: "en-IN" });
  if (opts.hindi !== false) synth.voices.push({ name: "Lekha", lang: "hi-IN" });
  const sp = createSpeaker({ synth: () => synth as unknown as SpeechSynthesis, utter: t => new FakeUtterance(t) as unknown as SpeechSynthesisUtterance });
  const notices: (NoticeKind | null)[] = [];
  sp.onNotice(n => notices.push(n));
  return { synth, sp, notices };
}

/** Let the engine play everything that has been asked for, finishing each utterance in turn. */
async function playAll(synth: FakeSynth, maxMs = 20000) {
  for (let t = 0; t < maxMs; t += 10) {
    await vi.advanceTimersByTimeAsync(10);
    if (synth.playing && synth.playing === synth.playing) { await vi.advanceTimersByTimeAsync(20); synth.finish(); }
  }
}

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

describe("speech queue", () => {
  it("speaks a whole line, one sentence after another, with the right voice for each part", async () => {
    const { synth, sp } = setup();
    const done = sp.say("सुनो: log। कौन-सा log जैसा शुरू होता है? tree, rain, leaf।", "hi");
    await playAll(synth, 2000);
    await done;
    const expected = splitParts("सुनो: log। कौन-सा log जैसा शुरू होता है? tree, rain, leaf।", "hi");
    expect(synth.spoken.map(s => s.text)).toEqual(expected.map(p => p.text));          // every part, in order, none dropped
    expect(synth.spoken.map(s => s.voice)).toEqual(expected.map(p => (p.lang === "en" ? "Rishi" : "Lekha")));
    expect(synth.spoken.filter(s => s.voice === "Rishi").map(s => s.text)).toEqual(["log", "log", "tree, rain, leaf"]);
    expect(sp.busy()).toBe(false);
  });

  it("speaks Hindi lines that contain English words: English parts use the English voice", async () => {
    const { synth, sp } = setup();
    const done = sp.say("सुनो: The monkey has a cap. सही तस्वीर छुओ।", "hi");
    await playAll(synth, 2000);
    await done;
    const eng = synth.spoken.filter(s => s.voice === "Rishi");
    expect(eng.map(s => s.text)).toEqual(["The monkey has a cap."]);
    expect(synth.spoken.filter(s => s.voice === "Lekha").length).toBe(2);
    expect(synth.spoken.every(s => s.lang === "hi-IN" || s.lang === "en-IN")).toBe(true);
  });

  it("a new line replaces the one that is playing; the old line's late 'interrupted' event does not end the new one", async () => {
    const { synth, sp } = setup();
    const a = sp.say("पहले मुझे एक करते देखो। आगे क्या आएगा?", "hi");
    await vi.advanceTimersByTimeAsync(50);
    expect(synth.playing?.text).toBe("पहले मुझे एक करते देखो।");
    const b = sp.say("अब तुम्हारी बारी।", "hi");
    await a;                                         // the replaced line is over
    await playAll(synth, 1000);
    await b;
    expect(synth.spoken.map(s => s.text)).toEqual(["पहले मुझे एक करते देखो।", "अब तुम्हारी बारी।"]);
    expect(synth.cancels).toBeGreaterThanOrEqual(1);
    expect(sp.busy()).toBe(false);
  });

  it("never speaks while the old utterance is still winding down", async () => {
    const { synth, sp } = setup();
    synth.staleErrorDelay = 300;
    void sp.say("एक दो तीन।", "hi");
    await vi.advanceTimersByTimeAsync(50);
    const wasSpeakingWhenNewOneStarted: boolean[] = [];
    const orig = synth.speak.bind(synth);
    synth.speak = u => { wasSpeakingWhenNewOneStarted.push(synth.speaking); orig(u); };
    void sp.say("चार पाँच छह।", "hi");
    await playAll(synth, 1000);
    expect(wasSpeakingWhenNewOneStarted).toEqual([false]);
  });

  it("when lines arrive in quick succession, only the last one is spoken and nothing is left behind", async () => {
    const { synth, sp } = setup();
    const all = [sp.say("एक।", "hi"), sp.say("दो।", "hi"), sp.say("तीन।", "hi")];
    await playAll(synth, 1000);
    await Promise.all(all);
    expect(synth.played).toEqual(["तीन।"]);             // the first two were replaced before they could play
    expect(synth.speaking).toBe(false);
    expect(sp.busy()).toBe(false);
  });

  it("'Say again' works every time, also after the line has finished", async () => {
    const { synth, sp } = setup();
    for (let i = 0; i < 4; i++) {
      const d = sp.say("अब तुम्हारी बारी।", "hi", true);
      await playAll(synth, 500);
      await d;
    }
    expect(synth.spoken.map(s => s.text)).toEqual(Array(4).fill("अब तुम्हारी बारी।"));
  });

  it("'Say again' while the line is still playing restarts it", async () => {
    const { synth, sp } = setup();
    void sp.say("आगे क्या आएगा?", "hi", true);
    await vi.advanceTimersByTimeAsync(50);
    const again = sp.say("आगे क्या आएगा?", "hi", true);
    await playAll(synth, 1000);
    await again;
    expect(synth.spoken.map(s => s.text)).toEqual(["आगे क्या आएगा?", "आगे क्या आएगा?"]);
    expect(sp.busy()).toBe(false);
  });
});

describe("recovery", () => {
  it("an utterance the engine swallows after a cancel is cancelled and spoken again", async () => {
    const { synth, sp, notices } = setup();
    void sp.say("गणित और अंग्रेज़ी से नगर की मदद करो", "hi");
    await vi.advanceTimersByTimeAsync(50);
    synth.swallowNext = true;                        // the next utterance never starts and the engine stays busy
    const b = sp.say("पहले मुझे एक करते देखो।", "hi");
    await playAll(synth, 8000);
    await b;
    const texts = synth.spoken.map(s => s.text);
    expect(texts.filter(t => t === "पहले मुझे एक करते देखो।")).toHaveLength(2);   // once swallowed, once heard
    expect(synth.speaking).toBe(false);
    expect(notices).toEqual([]);                     // recovered quietly
  });

  it("the next line after a recovery is spoken normally (the engine is not left stuck)", async () => {
    const { synth, sp } = setup();
    void sp.say("एक।", "hi");
    await vi.advanceTimersByTimeAsync(50);
    synth.swallowNext = true;
    void sp.say("दो।", "hi");
    await playAll(synth, 8000);
    const before = synth.spoken.length;
    const c = sp.say("तीन।", "hi");
    await playAll(synth, 1000);
    await c;
    expect(synth.spoken.slice(before).map(s => s.text)).toEqual(["तीन।"]);
  });

  it("an engine that never starts: the line gives up, a notice shows, and a tap tries again", async () => {
    const { synth, sp, notices } = setup();
    synth.swallowAlways = true;
    const d = sp.say("पहले मुझे एक करते देखो।", "hi");
    await vi.advanceTimersByTimeAsync(15000);
    await d;
    expect(sp.notice()).toBe("stuck");
    expect(notices).toContain("stuck");
    expect(sp.busy()).toBe(false);

    synth.swallowAlways = false; synth.wedged = false;   // the engine comes back
    synth.spoken.length = 0;
    sp.onTap();
    await playAll(synth, 1000);
    expect(synth.spoken.map(s => s.text)).toEqual(["पहले मुझे एक करते देखो।"]);
    expect(sp.notice()).toBeNull();                      // cleared once the line really started
  });

  it("blocked speech (not-allowed) shows a notice instead of failing silently, and the line plays on the next tap", async () => {
    const { synth, sp } = setup();
    synth.deny = true;
    const d = sp.say("आगे क्या आएगा?", "hi");
    await vi.advanceTimersByTimeAsync(100);
    await d;
    expect(sp.notice()).toBe("blocked");
    expect(sp.busy()).toBe(false);

    synth.deny = false;
    synth.spoken.length = 0;
    sp.onTap();
    await playAll(synth, 1000);
    expect(synth.spoken.map(s => s.text)).toEqual(["आगे क्या आएगा?"]);
    expect(sp.notice()).toBeNull();
  });

  it("no speech support at all: the line resolves and a notice says so", async () => {
    const sp = createSpeaker({ synth: () => null, utter: t => new FakeUtterance(t) as unknown as SpeechSynthesisUtterance });
    await sp.say("नमस्ते", "hi");
    expect(sp.notice()).toBe("unsupported");
  });
});

describe("voices", () => {
  it("no Hindi voice on the device: a notice shows, and the line is still tried", async () => {
    const { synth, sp } = setup({ hindi: false });
    const d = sp.say("अब तुम्हारी बारी।", "hi");
    await playAll(synth, 1000);
    await d;
    expect(sp.notice()).toBe("no-hindi");
    expect(synth.spoken.map(s => s.text)).toEqual(["अब तुम्हारी बारी।"]);
    expect(synth.spoken[0].lang).toBe("hi-IN");
  });

  it("a Hindi voice present: no notice", async () => {
    const { synth, sp } = setup();
    const d = sp.say("अब तुम्हारी बारी।", "hi");
    await playAll(synth, 1000);
    await d;
    expect(sp.notice()).toBeNull();
  });

  it("an English line never raises the Hindi notice", async () => {
    const { synth, sp } = setup({ hindi: false });
    const d = sp.say("Now it's your turn.", "en");
    await playAll(synth, 1000);
    await d;
    expect(sp.notice()).toBeNull();
    expect(synth.spoken[0].voice).toBe("Rishi");
  });

  it("voices that load late: a Hindi line waits for them and uses the Hindi voice", async () => {
    const { synth, sp } = setup({ hindi: false, english: false });
    const d = sp.say("अब तुम्हारी बारी।", "hi");
    await vi.advanceTimersByTimeAsync(300);
    expect(synth.spoken).toHaveLength(0);
    synth.voices.push({ name: "Lekha", lang: "hi-IN" });
    await playAll(synth, 1000);
    await d;
    expect(synth.spoken.map(s => s.voice)).toEqual(["Lekha"]);
  });

  it("voices that never load: the line is spoken anyway after a short wait", async () => {
    const { synth, sp } = setup({ hindi: false, english: false });
    const d = sp.say("अब तुम्हारी बारी।", "hi");
    await playAll(synth, 3000);
    await d;
    expect(synth.spoken).toHaveLength(1);
  });

  it("picture tokens in a line are spoken as colour words", async () => {
    const { synth, sp } = setup();
    const d = sp.say("अगला 🔵 है।", "hi");
    await playAll(synth, 1000);
    await d;
    expect(synth.spoken[0].text).toContain("नीला");
    expect(synth.spoken[0].text).not.toContain("🔵");
  });
});

describe("the sound switch", () => {
  it("sound off: nothing is spoken; 'Say again' (force) still is", async () => {
    const { synth, sp } = setup();
    sp.setVoice(false);
    await sp.say("आगे क्या आएगा?", "hi");
    expect(synth.spoken).toHaveLength(0);
    const d = sp.say("आगे क्या आएगा?", "hi", true);
    await playAll(synth, 500);
    await d;
    expect(synth.spoken).toHaveLength(1);
  });

  it("turning sound off stops the line; turning it on says the current line again, every time", async () => {
    const { synth, sp } = setup();
    void sp.say("अब तुम्हारी बारी।", "hi");
    await vi.advanceTimersByTimeAsync(50);
    for (let i = 0; i < 3; i++) {
      sp.setVoice(false);
      expect(sp.busy()).toBe(false);
      await vi.advanceTimersByTimeAsync(100);
      expect(synth.playing).toBeNull();
      const before = synth.spoken.length;
      sp.setVoice(true);
      await playAll(synth, 500);
      expect(synth.spoken.slice(before).map(s => s.text)).toEqual(["अब तुम्हारी बारी।"]);
    }
  });

  it("stop() ends the line and leaves the engine idle", async () => {
    const { synth, sp } = setup();
    const d = sp.say("एक दो तीन।", "hi");
    await vi.advanceTimersByTimeAsync(50);
    sp.stop();
    await d;
    await vi.advanceTimersByTimeAsync(200);
    expect(synth.speaking).toBe(false);
    expect(sp.busy()).toBe(false);
  });
});
