/** Class 1 items: maths (counting, bonds, add/take away, positions, shapes, patterns) and English
 *  (first sounds, letters, blending 3-letter words, book vocabulary, sentences, sight words).
 *  English content stays in English; instructions follow the child's language. */
import { int, pick, Rng, shuffle } from "./rng";
import type { Lang } from "./skills";

// ---------- word banks (pictures are emoji so they work offline on any phone) ----------

export const PIC: Record<string, string> = {
  sun: "☀️", sock: "🧦", six: "6️⃣", cat: "🐱", cap: "🧢", car: "🚗", cup: "☕", pen: "🖊️", pig: "🐷", bat: "🦇", bus: "🚌",
  ball: "⚽", dog: "🐶", duck: "🦆", drum: "🥁", hen: "🐔", hat: "🎩", house: "🏠", mango: "🥭", monkey: "🐒", moon: "🌙",
  fish: "🐟", fox: "🦊", tree: "🌳", tiger: "🐯", apple: "🍎", ant: "🐜", egg: "🥚", rain: "🌧️", rice: "🍚", rainbow: "🌈",
  goat: "🐐", girl: "👧", leaf: "🍃", lion: "🦁", nest: "🪺", nose: "👃", van: "🚐", web: "🕸️", box: "📦", bed: "🛏️",
  map: "🗺️", net: "🥅", log: "🪵", nut: "🥜", hand: "✋", cow: "🐄", banana: "🍌", milk: "🥛",
  bread: "🍞", flower: "🌸", umbrella: "☂️", kite: "🪁", book: "📖", boy: "👦", bag: "🎒", sad: "😢",
  octopus: "🐙", horse: "🐴", sheep: "🐑", duckling: "🐤", snow: "❄️", cloud: "☁️", star: "⭐", ear: "👂", eye: "👁️",
};

/** First-sound groups. Words grouped by their first SOUND (not just letter); k/c share /k/, so they never compete. */
const BY_SOUND: Record<string, string[]> = {
  s: ["sun", "sock", "six"], k: ["cat", "cap", "car", "cup"], p: ["pen", "pig"], b: ["bat", "bus", "ball", "box", "bed", "bag"],
  d: ["dog", "duck", "drum"], h: ["hen", "hat", "house", "horse"], m: ["mango", "monkey", "moon", "map", "milk"],
  f: ["fish", "fox", "flower"], t: ["tree", "tiger"], a: ["apple", "ant"], e: ["egg"], r: ["rain", "rice", "rainbow"],
  g: ["goat", "girl"], l: ["leaf", "lion", "log"], n: ["nest", "nose", "net", "nut"], v: ["van"], w: ["web"], u: ["umbrella"], o: ["octopus"],
};
/** The letter we teach for each sound group (c for /k/: Class 1 words here are spelled with c). */
const LETTER_OF: Record<string, string> = { k: "c" };
const letterFor = (snd: string) => LETTER_OF[snd] ?? snd;

export const CVC = ["cat", "cap", "cup", "pen", "pig", "bat", "bus", "dog", "hen", "hat", "fox", "box", "bed", "map", "net", "log", "nut", "van", "sun", "bag", "sad"];
/** Words that differ by one letter from each target: the honest distractors for blending. */
function nearWords(w: string, rng: Rng, n: number): string[] {
  const near = CVC.filter(x => x !== w && [0, 1, 2].filter(i => x[i] === w[i]).length >= 2);
  const far = CVC.filter(x => x !== w && !near.includes(x));
  return shuffle(rng, near).concat(shuffle(rng, far)).slice(0, n);
}

/** Book vocabulary by Mridang unit. */
export const VOCAB: Record<string, string[]> = {
  "My Family and Me": ["hand", "girl", "boy", "nose", "ear", "eye", "house"],
  "Life Around Us": ["monkey", "cap", "tree", "cow", "hen", "goat", "duck", "horse", "sheep", "dog", "cat"],
  "Food": ["mango", "banana", "rice", "milk", "bread", "egg", "apple"],
  "Seasons": ["sun", "rain", "rainbow", "umbrella", "cloud", "snow", "flower", "kite"],
};
const ALL_VOCAB = Object.values(VOCAB).flat();

/** Short sentences, each with its picture and two pictures that share a word with it (so listening matters). */
export const SENTENCES: { s: string; pic: string; near: string[] }[] = [
  { s: "It is raining.", pic: "🌧️", near: ["☀️", "🌈"] },
  { s: "The sun is hot.", pic: "☀️", near: ["🌧️", "🌙"] },
  { s: "The monkey has a cap.", pic: "🐒🧢", near: ["🐒🍌", "👦🧢"] },
  { s: "I eat a mango.", pic: "🥭", near: ["🍌", "🍎"] },
  { s: "I drink milk.", pic: "🥛", near: ["☕", "🍚"] },
  { s: "The cow is in the farm.", pic: "🐄", near: ["🐐", "🐔"] },
  { s: "The hen has an egg.", pic: "🐔🥚", near: ["🦆🥚", "🐔🌳"] },
  { s: "I have two hands.", pic: "✋✋", near: ["✋", "👂👂"] },
  { s: "Good morning!", pic: "🌅", near: ["🌙", "🛏️"] },
  { s: "Good night!", pic: "🌙", near: ["🌅", "☀️"] },
  { s: "I see a rainbow.", pic: "🌈", near: ["☁️", "🌧️"] },
  { s: "The cat is under the tree.", pic: "🌳🐱", near: ["🐱", "🌳🐶"] },
];

export const SIGHT = ["I", "a", "the", "is", "my", "it", "in", "on", "we", "see", "and", "to", "he", "she", "go", "can"];

// ---------- maths pictures ----------

export const VEG = ["🍅", "🥕", "🧅", "🥔", "🍆", "🌽"];
export const POS = ["on", "under", "inside", "near", "behind"] as const;
export type Pos = (typeof POS)[number];
export const PLACES = ["table", "box", "basket"] as const;
export const SHAPES = ["circle", "triangle", "square", "rectangle"] as const;
export type Shape = (typeof SHAPES)[number];
export const SHAPE_OBJ: Record<Shape, string[]> = {
  circle: ["🪙", "🍪", "🕐", "🛞", "🍩"], triangle: ["🔺", "🍕", "⛺", "📐"], square: ["🔲", "🧇", "🎲", "🖼️"], rectangle: ["📱", "🚪", "📖", "💵"],
};
/** Calm-garden banks: colours drawn in soft shades, size pictures, and rhyme families (all words have pictures). */
export const COLOURS = ["red", "blue", "yellow", "green", "orange", "purple"] as const;
export type Colour = (typeof COLOURS)[number];
export const COLOUR_WORD: Record<Colour, Record<Lang, string>> = {
  red: { en: "red", hi: "लाल" }, blue: { en: "blue", hi: "नीला" }, yellow: { en: "yellow", hi: "पीला" },
  green: { en: "green", hi: "हरा" }, orange: { en: "orange", hi: "नारंगी" }, purple: { en: "purple", hi: "बैंगनी" },
};
export const COLOUR_HEX: Record<Colour, string> = { red: "#e8826a", blue: "#6f9be0", yellow: "#f2c94c", green: "#74c07e", orange: "#f0a05a", purple: "#a98bd6" };
export const THINGS = ["balloon", "flower", "kite"] as const;
export type Thing = (typeof THINGS)[number];
export const THING_WORD: Record<Thing, Record<Lang, string>> = {
  balloon: { en: "balloon", hi: "गुब्बारा" }, flower: { en: "flower", hi: "फूल" }, kite: { en: "kite", hi: "पतंग" },
};
export const SIZE_PICS = ["🐶", "🐱", "🍎", "⭐", "🐠", "🌷", "🦋", "🐢"];
/** Size ranks used as the choices: 1 small, 2 middle, 3 big. */
export const SIZE_WORD: Record<string, Record<Lang, string>> = {
  "1": { en: "small", hi: "छोटा" }, "2": { en: "middle", hi: "बीच का" }, "3": { en: "big", hi: "बड़ा" },
};
/** Words that rhyme (same ending sound). Every word has a picture in PIC. */
export const RHYMES: string[][] = [
  ["cat", "hat", "bat", "rat"], ["pen", "hen"], ["dog", "log"], ["box", "fox"], ["cap", "map"],
  ["car", "star"], ["tree", "bee"], ["sock", "clock"], ["house", "mouse"],
];
Object.assign(PIC, { rat: "🐀", bee: "🐝", clock: "⏰", mouse: "🐭" });

export const PAT_TOKENS = ["🔴", "🔵", "🟡", "🟢", "⭐", "🌸", "🪔", "🔺"];

// ---------- items ----------

export type C1Item =
  | { kind: "count"; skill: string; n: number; veg: string; bundle: boolean }
  | { kind: "bond"; skill: string; size: 5 | 10; filled: number; say: boolean }   // say: answer with a number instead of filling
  | { kind: "arith1"; skill: string; a: number; b: number; op: "+" | "-"; thing: string }
  | { kind: "pick"; skill: string; mode: PickMode; target: string; options: string[]; answer: string; seq?: string[] };

export type PickMode = "more" | "less" | "position" | "shape" | "shape_obj" | "pattern" | "pattern_fix"
  | "first_sound" | "letter_sound" | "letter_pick" | "read_word" | "build_word" | "vocab" | "sentence" | "sight"
  | "colour" | "size" | "num_match" | "num_next" | "rhyme" | "rhyme_odd";

type Step = 1 | 2 | 3;

function pickItem(skill: string, mode: PickMode, target: string, answer: string, options: string[], rng: Rng, seq?: string[]): C1Item {
  return { kind: "pick", skill, mode, target, answer, options: shuffle(rng, options), seq };
}

export function genClass1(skill: string, step: Step, rng: Rng): C1Item | null {
  switch (skill) {
    case "count10": return { kind: "count", skill, n: step === 1 ? int(rng, 2, 5) : int(rng, 5, 10), veg: pick(rng, VEG), bundle: false };
    case "count20": return { kind: "count", skill, n: step === 1 ? int(rng, 11, 14) : int(rng, 11, 20), veg: pick(rng, VEG), bundle: true };
    case "more_less": {
      const mode: PickMode = step === 1 ? "more" : pick(rng, ["more", "less"] as const);
      const a = int(rng, 1, step === 3 ? 18 : 9);
      let b = step === 3 ? a + pick(rng, [-2, -1, 1, 2]) : int(rng, 1, 9);
      if (b === a || b < 1) b = a + 2;
      const v = pick(rng, VEG);
      const ans = mode === "more" ? (a > b ? "A" : "B") : (a < b ? "A" : "B");
      return { kind: "pick", skill, mode, target: v, answer: ans, options: ["A", "B"], seq: [String(a), String(b)] };
    }
    case "bond10": {
      const size = step === 1 ? 5 : 10;
      return { kind: "bond", skill, size, filled: int(rng, 1, size - 1), say: step === 3 };
    }
    case "add10": { const a = int(rng, 1, step === 1 ? 4 : 7); return { kind: "arith1", skill, a, b: int(rng, 1, 10 - a), op: "+", thing: "🟠" }; }
    case "sub10": { const a = int(rng, step === 1 ? 3 : 5, 10); return { kind: "arith1", skill, a, b: int(rng, 1, a - 1), op: "-", thing: "🟠" }; }
    case "addsub20": {
      if (rng() < 0.5) { const a = int(rng, 5, 9); return { kind: "arith1", skill, a, b: int(rng, 10 - a + (step > 1 ? 1 : 0), Math.min(9, 20 - a)), op: "+", thing: "🟠" }; }
      const a = int(rng, 11, 18); return { kind: "arith1", skill, a, b: int(rng, a - 9, step === 1 ? a - 10 : 9), op: "-", thing: "🟠" };
    }
    case "position": {
      const target = pick(rng, step === 1 ? ["on", "under", "inside"] : POS) as Pos;
      const others = shuffle(rng, POS.filter(p => p !== target)).slice(0, 2);
      return pickItem(skill, "position", pick(rng, PLACES), target, [target, ...others], rng);
    }
    case "shape_name": {
      const target = pick(rng, step === 1 ? ["circle", "triangle", "square"] : SHAPES) as Shape;
      const others = shuffle(rng, SHAPES.filter(s => s !== target && (step === 3 || !(target === "square" && s === "rectangle") && !(target === "rectangle" && s === "square")))).slice(0, step === 1 ? 2 : 3);
      return pickItem(skill, "shape", target, target, [target, ...others], rng);
    }
    case "shape_obj": {
      const target = pick(rng, SHAPES) as Shape;
      const right = pick(rng, SHAPE_OBJ[target]);
      const others = shuffle(rng, SHAPES.filter(s => s !== target)).slice(0, 2).map(s => pick(rng, SHAPE_OBJ[s]));
      return pickItem(skill, "shape_obj", target, right, [right, ...others], rng);
    }
    case "pat_next": case "pat_next2": {
      const toks = shuffle(rng, PAT_TOKENS);
      const unit = skill === "pat_next" ? (step === 1 ? [toks[0], toks[1]] : [toks[0], toks[1], toks[2]])
        : pick(rng, [[toks[0], toks[0], toks[1]], [toks[0], toks[1], toks[1]], [toks[0], toks[1], toks[2], toks[2]]]);
      const len = unit.length * 2 + int(rng, 0, unit.length - 1);
      const seq = Array.from({ length: len }, (_, i) => unit[i % unit.length]);
      const ans = unit[len % unit.length];
      const opts = [...new Set([ans, ...unit, toks[3]])].slice(0, 3);
      return pickItem(skill, "pattern", ans, ans, opts.includes(ans) ? opts : [ans, ...opts.slice(0, 2)], rng, seq);
    }
    case "pat_fix": {
      const toks = shuffle(rng, PAT_TOKENS);
      const unit = step === 1 ? [toks[0], toks[1]] : [toks[0], toks[1], toks[2]];
      const len = unit.length * 3;
      const seq = Array.from({ length: len }, (_, i) => unit[i % unit.length]);
      const bad = int(rng, 1, len - 1);
      seq[bad] = unit[(bad + 1) % unit.length];
      // positions are the options; the answer is the index of the wrong tile
      return { kind: "pick", skill, mode: "pattern_fix", target: "", answer: String(bad), options: seq.map((_, i) => String(i)), seq };
    }
    case "first_sound": {
      const snd = pick(rng, Object.keys(BY_SOUND).filter(s => BY_SOUND[s].length >= 2));
      const [target, right] = shuffle(rng, BY_SOUND[snd]);
      const others = shuffle(rng, Object.keys(BY_SOUND).filter(s => s !== snd)).slice(0, 2).map(s => pick(rng, BY_SOUND[s]));
      return pickItem(skill, "first_sound", target, right, [right, ...others], rng);
    }
    case "letter_sound": {
      const pool = step === 1 ? ["s", "a", "t", "p", "m", "n"] : Object.keys(BY_SOUND);
      const snd = pick(rng, pool.filter(s => BY_SOUND[s]));
      const right = pick(rng, BY_SOUND[snd]);
      const others = shuffle(rng, Object.keys(BY_SOUND).filter(s => s !== snd)).slice(0, 2).map(s => pick(rng, BY_SOUND[s]));
      return pickItem(skill, "letter_sound", letterFor(snd), right, [right, ...others], rng);
    }
    case "letter_pick": {
      const snd = pick(rng, Object.keys(BY_SOUND));
      const word = pick(rng, BY_SOUND[snd]);
      const confusable: Record<string, string[]> = { b: ["d", "p"], d: ["b", "p"], p: ["b", "d"], m: ["n", "w"], n: ["m", "h"], u: ["n", "a"] };
      const letter = letterFor(snd);
      const pool = (step === 3 && confusable[letter]) ? confusable[letter] : shuffle(rng, Object.keys(BY_SOUND).map(letterFor).filter(l => l !== letter)).slice(0, 2);
      return pickItem(skill, "letter_pick", word, letter, [letter, ...pool.slice(0, 2)], rng);
    }
    case "read_cvc": {
      const w = pick(rng, CVC.filter(x => PIC[x]));
      const others = nearWords(w, rng, 4).filter(x => PIC[x]).slice(0, 2);
      return pickItem(skill, "read_word", w, w, [w, ...others], rng);
    }
    case "build_cvc": case "build_cvc2": {
      const w = pick(rng, CVC.filter(x => PIC[x]));
      const extra = skill === "build_cvc" ? (step === 1 ? 1 : 2) : 3 + (step === 3 ? 1 : 0);
      const vowels = "aeiou".split("").filter(v => !w.includes(v));
      const cons = "bcdfghjlmnprstv".split("").filter(c => !w.includes(c));
      const extras = shuffle(rng, [...shuffle(rng, vowels).slice(0, 1), ...shuffle(rng, cons)]).slice(0, extra);
      return { kind: "pick", skill, mode: "build_word", target: w, answer: w, options: shuffle(rng, [...w.split(""), ...extras]) };
    }
    case "vocab": {
      const unit = pick(rng, Object.keys(VOCAB));
      const w = pick(rng, VOCAB[unit]);
      const others = shuffle(rng, ALL_VOCAB.filter(x => x !== w)).slice(0, step === 1 ? 2 : 3);
      return pickItem(skill, "vocab", w, w, [w, ...others], rng);
    }
    case "sentence": {
      const s = pick(rng, SENTENCES);
      return pickItem(skill, "sentence", s.s, s.pic, [s.pic, ...s.near], rng);
    }
    case "colour_pick": {
      const colours = shuffle(rng, [...COLOURS]).slice(0, step === 3 ? 4 : 3);
      const thing = pick(rng, [...THINGS]);
      const target = pick(rng, colours);
      return pickItem(skill, "colour", target, target, colours, rng, [thing]);
    }
    case "size_compare": {
      const pic = pick(rng, SIZE_PICS);
      const big = rng() < 0.5;
      const ranks = step === 1 ? ["1", "3"] : ["1", "2", "3"];
      return pickItem(skill, "size", pic, big ? "3" : "1", ranks, rng, [big ? "big" : "small"]);
    }
    case "count_match": {
      const n = step === 1 ? int(rng, 1, 5) : step === 2 ? int(rng, 3, 8) : int(rng, 6, 10);
      const near = shuffle(rng, [n - 2, n - 1, n + 1, n + 2].filter(x => x >= 1 && x <= 10)).slice(0, 2);
      return pickItem(skill, "num_match", "🦋", String(n), [n, ...near].map(String), rng);
    }
    case "num_next": {
      const hi = step === 1 ? 6 : step === 2 ? 10 : 17;
      const a = int(rng, 1, hi);
      const ans = a + 3, shown = [a, a + 1, a + 2];
      const near = shuffle(rng, [ans - 2, ans + 1, ans + 2, ans - 4].filter(x => x >= 1 && x <= 20 && !shown.includes(x))).slice(0, 2);
      return pickItem(skill, "num_next", "", String(ans), [ans, ...near].map(String), rng, shown.map(String));
    }
    case "rhyme_pick": {
      const fam = pick(rng, RHYMES);
      const [target, right] = shuffle(rng, fam);
      const others = RHYMES.filter(f => f !== fam).flat();
      const sameStart = others.filter(w => w[0] === target[0]);
      const rest = shuffle(rng, others.filter(w => w[0] !== target[0]));
      const wrong = step === 1 || !sameStart.length ? rest.slice(0, 2) : [pick(rng, sameStart), rest[0]];
      return pickItem(skill, "rhyme", target, right, [right, ...wrong], rng);
    }
    case "rhyme_odd": {
      const fam = pick(rng, RHYMES.filter(f => f.length >= 2));
      const [a, b] = shuffle(rng, fam);
      const others = RHYMES.filter(f => f !== fam).flat();
      const sameStart = others.filter(w => w[0] === a[0] || w[0] === b[0]);
      const odd = step === 3 && sameStart.length ? pick(rng, sameStart) : pick(rng, others.filter(w => w[0] !== a[0] && w[0] !== b[0]));
      return pickItem(skill, "rhyme_odd", "", odd, [a, b, odd], rng, [a, b]);
    }
    case "sight": {
      const pool = step === 1 ? SIGHT.slice(0, 6) : SIGHT;
      const w = pick(rng, pool);
      const others = shuffle(rng, pool.filter(x => x !== w && x.toLowerCase() !== w.toLowerCase())).slice(0, 3);
      return pickItem(skill, "sight", w, w, [w, ...others], rng);
    }
  }
  return null;
}

const GARDEN_MODES = ["colour", "size", "num_match", "num_next", "rhyme", "rhyme_odd"];
export const c1AnswerKey = (it: C1Item) =>
  it.kind === "pick" && GARDEN_MODES.includes(it.mode) ? `${it.mode}:${it.target}:${it.answer}:${(it.seq ?? []).join(",")}` :
  it.kind === "count" ? `n${it.n}` : it.kind === "bond" ? `b${it.size}-${it.filled}` : it.kind === "arith1" ? `${it.a}${it.op}${it.b}` : `${it.mode}:${it.target}:${it.answer}`;

export const c1Choices = (it: C1Item) => (it.kind === "pick" && it.mode !== "build_word" ? it.options.length : 0);

// ---------- checking ----------

export type C1Mistake = "chose_opposite" | "off_by_one" | "overfilled" | "wrong_op" | "end_sound" | "letter_reversal"
  | "vowel_swap" | "letters_out_of_order" | "near_word" | "near_shape" | "miscount" | "wrong_pick" | "same_start";

export function checkClass1(it: C1Item, ans: { value?: number; pick?: string; word?: string }): { ok: boolean; mistake?: C1Mistake } {
  switch (it.kind) {
    case "count": {
      const v = ans.value ?? -1;
      if (v === it.n) return { ok: true };
      return { ok: false, mistake: Math.abs(v - it.n) === 1 ? "off_by_one" : "miscount" };
    }
    case "bond": {
      const v = ans.value ?? -1, need = it.size - it.filled;
      if (v === need) return { ok: true };
      return { ok: false, mistake: v > need ? "overfilled" : Math.abs(v - need) === 1 ? "off_by_one" : "miscount" };
    }
    case "arith1": {
      const right = it.op === "+" ? it.a + it.b : it.a - it.b, v = ans.value ?? -1;
      if (v === right) return { ok: true };
      if (it.op === "-" && v === it.a + it.b) return { ok: false, mistake: "wrong_op" };
      if (it.op === "+" && v === Math.abs(it.a - it.b)) return { ok: false, mistake: "wrong_op" };
      return { ok: false, mistake: Math.abs(v - right) === 1 ? "off_by_one" : "miscount" };
    }
    case "pick": {
      if (it.mode === "build_word") {
        const w = ans.word ?? "";
        if (w === it.answer) return { ok: true };
        if ([...w].sort().join("") === [...it.answer].sort().join("")) return { ok: false, mistake: "letters_out_of_order" };
        if (w.length === 3 && w[0] === it.answer[0] && w[2] === it.answer[2]) return { ok: false, mistake: "vowel_swap" };
        return { ok: false, mistake: "wrong_pick" };
      }
      const p = ans.pick ?? "";
      if (p === it.answer) return { ok: true };
      if (it.mode === "more" || it.mode === "less") return { ok: false, mistake: "chose_opposite" };
      if (it.mode === "letter_pick" && ["bd", "db", "pq", "qp", "bp", "pb", "dp", "pd", "mn", "nm", "nu", "un"].includes(p + it.answer)) return { ok: false, mistake: "letter_reversal" };
      if (it.mode === "first_sound" && p.slice(-1) === it.target.slice(-1)) return { ok: false, mistake: "end_sound" };
      if (it.mode === "read_word") return { ok: false, mistake: "near_word" };
      if (it.mode === "rhyme" && p[0] === it.target[0]) return { ok: false, mistake: "same_start" };
      if (it.mode === "shape" && ((p === "square" && it.answer === "rectangle") || (p === "rectangle" && it.answer === "square"))) return { ok: false, mistake: "near_shape" };
      return { ok: false, mistake: "wrong_pick" };
    }
  }
}

export const C1_MISTAKE_TEXT: Record<C1Mistake, Record<Lang, string>> = {
  chose_opposite: { en: "Mixes up 'more' and 'less'", hi: "'ज़्यादा' और 'कम' में उलझ जाते हैं" },
  off_by_one: { en: "Counting is one off (skips or repeats one)", hi: "गिनती में एक का अंतर (एक छूटता या दोहराता है)" },
  overfilled: { en: "Adds more than needed to make the total", hi: "कुल बनाने के लिए ज़रूरत से ज़्यादा जोड़ देते हैं" },
  wrong_op: { en: "Adds instead of taking away (or the other way)", hi: "घटाने की जगह जोड़ देते हैं (या उल्टा)" },
  end_sound: { en: "Listens to the end of a word instead of the start", hi: "शब्द की शुरुआत की जगह आख़िरी आवाज़ सुनते हैं" },
  letter_reversal: { en: "Mixes up letters that look alike (b/d, p/b, m/n)", hi: "मिलते-जुलते अक्षरों में उलझते हैं (b/d, p/b, m/n)" },
  vowel_swap: { en: "Gets the middle vowel sound wrong", hi: "बीच की स्वर ध्वनि ग़लत होती है" },
  letters_out_of_order: { en: "Has the right letters but in the wrong order", hi: "अक्षर सही हैं पर क्रम ग़लत है" },
  near_word: { en: "Reads a word that looks similar (guesses from the first letter)", hi: "मिलता-जुलता शब्द पढ़ लेते हैं (पहले अक्षर से अंदाज़ा)" },
  near_shape: { en: "Mixes up squares and rectangles", hi: "वर्ग और आयत में उलझते हैं" },
  miscount: { en: "Counting slip", hi: "गिनने में चूक" },
  wrong_pick: { en: "Chose a different answer", hi: "दूसरा जवाब चुना" },
  same_start: { en: "Picks a word that starts the same instead of ending the same (rhyme)", hi: "आख़िर में एक जैसी आवाज़ की जगह एक जैसी शुरुआत वाला शब्द चुनते हैं (तुक)" },
};

// ---------- words for the child ----------

const T = (lang: Lang, en: string, hi: string) => (lang === "hi" ? hi : en);
export const POS_WORD: Record<Pos, Record<Lang, string>> = {
  on: { en: "on", hi: "ऊपर" }, under: { en: "under", hi: "नीचे" }, inside: { en: "inside", hi: "अंदर" },
  near: { en: "near", hi: "पास" }, behind: { en: "behind", hi: "पीछे" },
};
export const PLACE_WORD: Record<string, Record<Lang, string>> = {
  table: { en: "the table", hi: "मेज़" }, box: { en: "the box", hi: "डिब्बे" }, basket: { en: "the basket", hi: "टोकरी" },
};
export const SHAPE_WORD: Record<Shape, Record<Lang, string>> = {
  circle: { en: "circle", hi: "गोला" }, triangle: { en: "triangle", hi: "तिकोना" }, square: { en: "square", hi: "चौकोर (वर्ग)" }, rectangle: { en: "rectangle", hi: "आयत" },
};

export function promptClass1(it: C1Item, lang: Lang): string {
  switch (it.kind) {
    case "count": return T(lang, `Please give me ${it.n} vegetables.`, `मुझे ${it.n} सब्ज़ियाँ दो।`);
    case "bond": return it.say
      ? T(lang, `${it.filled} laddoos are in the box. How many more make ${it.size}?`, `डिब्बे में ${it.filled} लड्डू हैं। ${it.size} बनाने के लिए कितने और चाहिए?`)
      : T(lang, `This box holds ${it.size} laddoos. Fill it up!`, `इस डिब्बे में ${it.size} लड्डू आते हैं। इसे भर दो!`);
    case "arith1": return it.op === "+"
      ? T(lang, `${it.a} laddoos and ${it.b} more laddoos. How many altogether?`, `${it.a} लड्डू और ${it.b} लड्डू। कुल कितने?`)
      : T(lang, `There were ${it.a} laddoos. ${it.b} were eaten. How many are left?`, `${it.a} लड्डू थे। ${it.b} खा लिए। कितने बचे?`);
    case "pick": switch (it.mode) {
      case "more": return T(lang, "Which basket has more?", "किस टोकरी में ज़्यादा है?");
      case "less": return T(lang, "Which basket has less?", "किस टोकरी में कम है?");
      case "position": return T(lang, `Where is the cat ${POS_WORD[it.answer as Pos].en} ${PLACE_WORD[it.target].en}? Tap that picture.`,
        `बिल्ली ${PLACE_WORD[it.target].hi} के ${POS_WORD[it.answer as Pos].hi} कहाँ है? वह तस्वीर छुओ।`);
      case "colour": { const th = it.seq![0] as Thing; return T(lang, `Tap the ${COLOUR_WORD[it.target as Colour].en} ${THING_WORD[th].en}.`, `${COLOUR_WORD[it.target as Colour].hi} ${THING_WORD[th].hi} को छुओ।`); }
      case "size": return it.seq![0] === "big" ? T(lang, "Tap the big one.", "बड़े वाले को छुओ।") : T(lang, "Tap the small one.", "छोटे वाले को छुओ।");
      case "num_match": return T(lang, "How many butterflies? Tap the number.", "कितनी तितलियाँ हैं? संख्या छुओ।");
      case "num_next": return T(lang, `Which number comes next? ${it.seq!.join(", ")}, ?`, `आगे कौन-सी संख्या आएगी? ${it.seq!.join(", ")}, ?`);
      case "rhyme": return T(lang, `Which one rhymes with ${it.target}? Tap that picture.`, `${it.target} से किसकी तुक मिलती है? वह तस्वीर छुओ।`);
      case "rhyme_odd": return T(lang, "Two of these rhyme. Which one is different?", "इनमें दो की तुक मिलती है। कौन-सा अलग है?");
      case "shape": return T(lang, `Tap the ${SHAPE_WORD[it.answer as Shape].en}.`, `${SHAPE_WORD[it.answer as Shape].hi} को छुओ।`);
      case "shape_obj": return T(lang, `Which one is shaped like a ${SHAPE_WORD[it.target as Shape].en}?`, `किसका आकार ${SHAPE_WORD[it.target as Shape].hi} जैसा है?`);
      case "pattern": return T(lang, "What comes next?", "आगे क्या आएगा?");
      case "pattern_fix": return T(lang, "One does not follow the pattern. Tap it.", "एक पैटर्न के हिसाब से नहीं है। उसे छुओ।");
      case "first_sound": return T(lang, `Listen: ${it.target}. Which one starts like ${it.target}? ${it.options.join(", ")}.`,
        `सुनो: ${it.target}। कौन-सा ${it.target} जैसा शुरू होता है? ${it.options.join(", ")}।`);
      case "letter_sound": return T(lang, `This is the letter ${it.target}. Which picture starts with ${it.target}? ${it.options.join(", ")}.`,
        `यह अक्षर ${it.target} है। कौन-सी तस्वीर ${it.target} से शुरू होती है? ${it.options.join(", ")}।`);
      case "letter_pick": return T(lang, `Listen: ${it.target}. Which letter does ${it.target} start with?`, `सुनो: ${it.target}। ${it.target} किस अक्षर से शुरू होता है?`);
      case "read_word": return T(lang, "Read the word on the caps. Tap its picture.", "टोपियों पर लिखा शब्द पढ़ो। उसकी तस्वीर छुओ।");
      case "build_word": return T(lang, `Make the word ${it.target}. Tap the letters in order.`, `${it.target} शब्द बनाओ। अक्षर क्रम से छुओ।`);
      case "vocab": return T(lang, `Find: ${it.target}.`, `ढूँढो: ${it.target}।`);
      case "sentence": return T(lang, `Listen: ${it.target} Tap the picture.`, `सुनो: ${it.target} सही तस्वीर छुओ।`);
      case "sight": return T(lang, `Find the word: ${it.target}.`, `यह शब्द ढूँढो: ${it.target}।`);
    }
  }
}

/** Hints: 1 nudge · 2 picture/sound aid · 3 worked step · 4 the answer (only on request). */
export function hintClass1(it: C1Item, level: number, lang: Lang): string {
  const L = Math.max(1, Math.min(4, level));
  switch (it.kind) {
    case "count": return [
      T(lang, "Touch each one as you count.", "हर एक को छूकर गिनो।"),
      it.bundle ? T(lang, "A bundle has 10. Start with the bundle, then count on.", "बंडल में 10 हैं। बंडल से शुरू करो, फिर आगे गिनो।") : T(lang, "Count slowly: 1, 2, 3…", "धीरे-धीरे गिनो: 1, 2, 3…"),
      it.bundle && it.n > 10 ? T(lang, `10 and ${it.n - 10} more make ${it.n}.`, `10 और ${it.n - 10} मिलकर ${it.n}।`) : T(lang, `Stop when you say ${it.n}.`, `${it.n} बोलते ही रुक जाओ।`),
      T(lang, `Give ${it.n}.`, `${it.n} दो।`)][L - 1];
    case "bond": { const need = it.size - it.filled; return [
      T(lang, "Count the empty spaces.", "ख़ाली जगहें गिनो।"),
      T(lang, "Each empty space needs one laddoo.", "हर ख़ाली जगह में एक लड्डू।"),
      T(lang, `${it.filled} and how many make ${it.size}? Count on from ${it.filled}.`, `${it.filled} और कितने मिलकर ${it.size}? ${it.filled} से आगे गिनो।`),
      T(lang, `${it.filled} and ${need} make ${it.size}.`, `${it.filled} और ${need} मिलकर ${it.size}।`)][L - 1]; }
    case "arith1": { const r = it.op === "+" ? it.a + it.b : it.a - it.b; return [
      it.op === "+" ? T(lang, "Put them together and count all.", "सबको मिलाकर गिनो।") : T(lang, "Count the ones that are left.", "जो बचे हैं, उन्हें गिनो।"),
      T(lang, "Look at the laddoos in the picture.", "तस्वीर में लड्डू देखो।"),
      it.op === "+" ? T(lang, `Start at ${it.a} and count on ${it.b}.`, `${it.a} से शुरू करके ${it.b} आगे गिनो।`) : T(lang, `Start at ${it.a} and count back ${it.b}.`, `${it.a} से ${it.b} पीछे गिनो।`),
      T(lang, `${it.a} ${it.op === "+" ? "+" : "−"} ${it.b} = ${r}.`, `${it.a} ${it.op === "+" ? "+" : "−"} ${it.b} = ${r}।`)][L - 1]; }
    case "pick": switch (it.mode) {
      case "more": case "less": return [
        T(lang, "Count each basket.", "हर टोकरी गिनो।"),
        T(lang, "Line them up and see which row is longer.", "उन्हें कतार में रखो, कौन-सी कतार लंबी है?"),
        T(lang, `One has ${it.seq![0]}, the other has ${it.seq![1]}.`, `एक में ${it.seq![0]}, दूसरी में ${it.seq![1]}।`),
        T(lang, `This one has ${it.mode === "more" ? "more" : "less"}.`, `इसमें ${it.mode === "more" ? "ज़्यादा" : "कम"} है।`)][L - 1];
      case "position": { const pw = POS_WORD[it.answer as Pos]; return [
        T(lang, "Look where the cat is in each picture.", "हर तस्वीर में देखो बिल्ली कहाँ है।"),
        T(lang, `${pw.en}: ${it.answer === "on" ? "on top of" : it.answer === "under" ? "below" : it.answer === "inside" ? "in it" : it.answer === "near" ? "next to" : "at the back of"} it.`, `${pw.hi}: ${it.answer === "on" ? "उसके ऊपर" : it.answer === "under" ? "उसके नीचे" : it.answer === "inside" ? "उसके अंदर" : it.answer === "near" ? "उसके बगल में" : "उसके पीछे"}।`),
        T(lang, `Find the cat that is ${pw.en} ${PLACE_WORD[it.target].en}.`, `वह बिल्ली ढूँढो जो ${PLACE_WORD[it.target].hi} के ${pw.hi} है।`),
        T(lang, "It is the picture I am showing.", "यह वाली तस्वीर।")][L - 1]; }
      case "shape": case "shape_obj": { const s = (it.mode === "shape" ? it.answer : it.target) as Shape; const tip: Record<Shape, Record<Lang, string>> = {
        circle: { en: "A circle is round, with no corners.", hi: "गोला गोल होता है, कोई कोना नहीं।" },
        triangle: { en: "A triangle has 3 sides and 3 corners.", hi: "तिकोने की 3 भुजाएँ और 3 कोने होते हैं।" },
        square: { en: "A square has 4 sides, all the same length.", hi: "वर्ग की 4 भुजाएँ होती हैं, सब बराबर।" },
        rectangle: { en: "A rectangle has 4 sides: 2 long and 2 short.", hi: "आयत की 4 भुजाएँ: 2 लंबी, 2 छोटी।" } };
        return [T(lang, "Count the corners.", "कोने गिनो।"), tip[s][lang], tip[s][lang], T(lang, "It is this one.", "यह वाला।")][L - 1]; }
      case "pattern": return [
        T(lang, "Say the pattern out loud.", "पैटर्न ज़ोर से बोलो।"),
        T(lang, "Find the part that repeats.", "वह हिस्सा ढूँढो जो दोहराता है।"),
        T(lang, "After the last one, the repeating part starts again.", "आख़िरी के बाद दोहराने वाला हिस्सा फिर शुरू होता है।"),
        T(lang, `Next comes ${it.answer}.`, `अगला ${it.answer} है।`)][L - 1];
      case "pattern_fix": return [
        T(lang, "Say the pattern out loud and listen.", "पैटर्न ज़ोर से बोलो और सुनो।"),
        T(lang, "Find the part that repeats. Which one breaks it?", "दोहराने वाला हिस्सा ढूँढो। कौन उसे तोड़ता है?"),
        T(lang, "Check them one by one from the start.", "शुरू से एक-एक करके जाँचो।"),
        T(lang, `It is number ${Number(it.answer) + 1}.`, `यह नंबर ${Number(it.answer) + 1} है।`)][L - 1];
      case "colour": { const w = COLOUR_WORD[it.target as Colour][lang], th = THING_WORD[it.seq![0] as Thing][lang]; return [
        T(lang, "Look at all the colours.", "सब रंग देखो।"),
        T(lang, `Look for the ${th} that is ${w}.`, `${w} रंग का ${th} ढूँढो।`),
        T(lang, `Which one is ${w}?`, `कौन-सा ${w} है?`),
        T(lang, `It is the ${w} one.`, `यह ${w} वाला है।`)][L - 1]; }
      case "size": { const big = it.seq![0] === "big"; return [
        T(lang, "Look at all of them.", "सबको देखो।"),
        T(lang, "Which is the biggest? Which is the smallest?", "सबसे बड़ा कौन-सा है? सबसे छोटा कौन-सा?"),
        big ? T(lang, "We want the biggest one.", "हमें सबसे बड़ा चाहिए।") : T(lang, "We want the smallest one.", "हमें सबसे छोटा चाहिए।"),
        big ? T(lang, "It is the big one.", "यह बड़ा वाला है।") : T(lang, "It is the small one.", "यह छोटा वाला है।")][L - 1]; }
      case "num_match": { const n = it.answer; return [
        T(lang, "Touch each butterfly as you count.", "हर तितली को छूकर गिनो।"),
        T(lang, "Count slowly: 1, 2, 3…", "धीरे-धीरे गिनो: 1, 2, 3…"),
        T(lang, `Count them one by one up to ${n}.`, `एक-एक करके ${n} तक गिनो।`),
        T(lang, `There are ${n}.`, `${n} हैं।`)][L - 1]; }
      case "num_next": { const last = it.seq![2]; return [
        T(lang, "Say the numbers out loud.", "संख्याएँ ज़ोर से बोलो।"),
        T(lang, "Each number is one more than the one before.", "हर संख्या पिछली से एक ज़्यादा है।"),
        T(lang, `${last} and one more is…`, `${last} और एक ज़्यादा…`),
        T(lang, `Next comes ${it.answer}.`, `आगे ${it.answer} आएगा।`)][L - 1]; }
      case "rhyme": return [
        T(lang, "Listen to the end of the word.", "शब्द का आख़िरी हिस्सा सुनो।"),
        T(lang, "Say each word. Which one ends the same?", "हर शब्द बोलो। कौन आख़िर में एक जैसा है?"),
        T(lang, `${it.target} and ${it.answer} end with the same sound.`, `${it.target} और ${it.answer} की आख़िरी आवाज़ एक जैसी है।`),
        T(lang, `It is ${it.answer}.`, `यह ${it.answer} है।`)][L - 1];
      case "rhyme_odd": return [
        T(lang, "Say all three words.", "तीनों शब्द बोलो।"),
        T(lang, "Listen to the end of each word.", "हर शब्द का आख़िरी हिस्सा सुनो।"),
        T(lang, `${it.seq![0]} and ${it.seq![1]} sound the same at the end.`, `${it.seq![0]} और ${it.seq![1]} आख़िर में एक जैसे सुनाई देते हैं।`),
        T(lang, `It is ${it.answer}.`, `यह ${it.answer} है।`)][L - 1];
      case "first_sound": { const s = it.target.slice(0, 1); return [
        T(lang, `Say ${it.target} slowly. What do you hear first?`, `${it.target} धीरे बोलो। पहले क्या सुनाई देता है?`),
        T(lang, `Say each word: ${it.options.join(", ")}. Which starts the same?`, `हर शब्द बोलो: ${it.options.join(", ")}। कौन एक जैसा शुरू होता है?`),
        T(lang, `${it.target} starts like ${it.answer}.`, `${it.target} और ${it.answer} एक जैसे शुरू होते हैं।`),
        T(lang, `${it.answer}. Both start with ${s}.`, `${it.answer}। दोनों ${s} से शुरू होते हैं।`)][L - 1]; }
      case "letter_sound": return [
        T(lang, "Say each picture's name. Listen to the first sound.", "हर तस्वीर का नाम बोलो। पहली आवाज़ सुनो।"),
        T(lang, `The letter ${it.target} is the first sound in ${it.answer}.`, `अक्षर ${it.target} ${it.answer} की पहली आवाज़ है।`),
        T(lang, `${it.answer} starts with ${it.target}.`, `${it.answer}, ${it.target} से शुरू होता है।`),
        T(lang, `It is ${it.answer}.`, `यह ${it.answer} है।`)][L - 1];
      case "letter_pick": return [
        T(lang, `Say ${it.target} slowly. What is the first sound?`, `${it.target} धीरे बोलो। पहली आवाज़ क्या है?`),
        T(lang, "Look carefully at each letter.", "हर अक्षर ध्यान से देखो।"),
        T(lang, `${it.target} starts with the sound of ${it.answer}.`, `${it.target} की पहली आवाज़ ${it.answer} है।`),
        T(lang, `The letter is ${it.answer}.`, `अक्षर ${it.answer} है।`)][L - 1];
      case "read_word": return [
        T(lang, "Say the sound of each letter, then put them together.", "हर अक्षर की आवाज़ बोलो, फिर मिलाओ।"),
        T(lang, `The letters are ${it.answer.split("").join(", ")}.`, `अक्षर हैं ${it.answer.split("").join(", ")}।`),
        T(lang, `They make the word ${it.answer}.`, `इनसे शब्द बनता है ${it.answer}।`),
        T(lang, `It is ${it.answer}.`, `यह ${it.answer} है।`)][L - 1];
      case "build_word": return [
        T(lang, `Say ${it.target} slowly. What sound comes first?`, `${it.target} धीरे बोलो। पहले कौन-सी आवाज़ आती है?`),
        T(lang, `${it.target} starts with ${it.target[0]}.`, `${it.target}, ${it.target[0]} से शुरू होता है।`),
        T(lang, `Then the middle sound: ${it.target[1]}.`, `फिर बीच की आवाज़: ${it.target[1]}।`),
        T(lang, `${it.target} is ${it.target.split("").join(", ")}.`, `${it.target} है ${it.target.split("").join(", ")}।`)][L - 1];
      case "vocab": return [
        T(lang, `Listen again: ${it.target}.`, `फिर से सुनो: ${it.target}।`),
        T(lang, `${it.target} is in our book.`, `${it.target} हमारी किताब में है।`),
        T(lang, `Look for the ${it.target}.`, `${it.target} ढूँढो।`),
        T(lang, `This is the ${it.target}.`, `यह ${it.target} है।`)][L - 1];
      case "sentence": return [
        T(lang, `Listen again: ${it.target}`, `फिर से सुनो: ${it.target}`),
        T(lang, "Listen for the important words.", "ख़ास शब्द ध्यान से सुनो।"),
        T(lang, "Which picture shows all of it?", "कौन-सी तस्वीर पूरी बात दिखाती है?"),
        T(lang, "It is this picture.", "यह वाली तस्वीर।")][L - 1];
      case "sight": return [
        T(lang, `Listen: ${it.target}.`, `सुनो: ${it.target}।`),
        T(lang, `${it.target} has ${it.target.length} letter${it.target.length > 1 ? "s" : ""}.`, `${it.target} में ${it.target.length} अक्षर हैं।`),
        T(lang, `${it.target} starts with ${it.target[0]}.`, `${it.target}, ${it.target[0]} से शुरू होता है।`),
        T(lang, `It is ${it.target}.`, `यह ${it.target} है।`)][L - 1];
    }
  }
}

export function feedbackClass1(m: C1Mistake | undefined, lang: Lang): string {
  switch (m) {
    case "chose_opposite": return T(lang, "Listen again: more or less?", "फिर से सुनो: ज़्यादा या कम?");
    case "off_by_one": return T(lang, "So close! Count again carefully.", "बहुत पास! फिर से ध्यान से गिनो।");
    case "overfilled": return T(lang, "Oops, too many. The box is too full.", "अरे, ज़्यादा हो गए। डिब्बा ज़्यादा भर गया।");
    case "wrong_op": return T(lang, "Are we putting together or taking away?", "हम मिला रहे हैं या घटा रहे हैं?");
    case "end_sound": return T(lang, "That one ends the same. Listen to the start.", "वह आख़िर में एक जैसा है। शुरुआत सुनो।");
    case "letter_reversal": return T(lang, "Those letters look alike. Look at which way it faces.", "ये अक्षर मिलते-जुलते हैं। देखो किस तरफ़ मुड़ा है।");
    case "vowel_swap": return T(lang, "Listen to the middle sound.", "बीच की आवाज़ सुनो।");
    case "letters_out_of_order": return T(lang, "Right letters! Now put them in order.", "अक्षर सही हैं! अब क्रम से लगाओ।");
    case "near_word": return T(lang, "Look at every letter, not just the first.", "हर अक्षर देखो, सिर्फ़ पहला नहीं।");
    case "near_shape": return T(lang, "Check: are all four sides the same length?", "देखो: क्या चारों भुजाएँ बराबर हैं?");
    case "same_start": return T(lang, "That one starts the same. Rhymes sound the same at the end.", "वह शुरू में एक जैसा है। तुक आख़िर की आवाज़ से बनती है।");
    default: return T(lang, "Not yet. Try again.", "अभी नहीं। फिर कोशिश करो।");
  }
}

/** Home activities for the goodbye screen and parent report. */
export const HOME_C1: Record<string, Record<Lang, string>> = {
  sabzi: { en: "At the vegetable seller, let your child count the tomatoes into the bag.", hi: "सब्ज़ी वाले के पास बच्चे से टमाटर गिनकर थैले में डलवाएँ।" },
  laddoo: { en: "Use 10 spoons or pebbles. Hide some and ask: how many are hiding?", hi: "10 चम्मच या कंकड़ लें। कुछ छिपाएँ और पूछें: कितने छिपे हैं?" },
  cat: { en: "Play 'where is it?': put a toy on, under or behind the bed and ask your child to say where.", hi: "'कहाँ है?' खेलें: खिलौना पलंग के ऊपर, नीचे या पीछे रखें और बच्चे से पूछें।" },
  rangoli: { en: "Make a pattern with spoons and forks (spoon, fork, spoon, fork…) and ask what comes next.", hi: "चम्मच-काँटे से पैटर्न बनाएँ (चम्मच, काँटा, चम्मच…) और पूछें आगे क्या आएगा।" },
  colours: { en: "Go on a colour hunt at home: find three red things, then three big things and three small things.", hi: "घर में रंग ढूँढो: तीन लाल चीज़ें, फिर तीन बड़ी और तीन छोटी चीज़ें।" },
  butterfly: { en: "Count stairs, spoons or fruit together, then ask which number comes next.", hi: "सीढ़ियाँ, चम्मच या फल साथ गिनो, फिर पूछो कि आगे कौन-सी संख्या आएगी।" },
  rhyme: { en: "Say a word like 'cat' and take turns finding words that sound the same at the end (hat, bat).", hi: "'cat' जैसा कोई शब्द बोलें और बारी-बारी आख़िर में एक जैसे सुनाई देने वाले शब्द ढूँढें (hat, bat)।" },
  sounds: { en: "Play 'I spy': say 'I spy something that starts with mmm' and find it together.", hi: "'मैं देख रहा हूँ' खेलें: 'मुझे mmm से शुरू होने वाली चीज़ दिख रही है' कहकर साथ ढूँढें।" },
  caps: { en: "Write cat, cap and cup on paper. Read them together, sound by sound.", hi: "कागज़ पर cat, cap, cup लिखें। साथ में एक-एक आवाज़ करके पढ़ें।" },
  listen: { en: "Read a page of the Mridang book together and point to the pictures as you say the words.", hi: "मृदंग किताब का एक पन्ना साथ पढ़ें और शब्द बोलते हुए तस्वीरों पर उँगली रखें।" },
};
