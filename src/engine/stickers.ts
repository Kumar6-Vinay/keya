/** Stickers for Keya's home. One arrives when a day's games are done; they can never be lost, and a missed day costs nothing.
 *  Also the skill path a child sees: which levels of a game are built, which is next, and which are still shut. */
import type { Child } from "../store";
import { rec, unlocked } from "./learner";
import { GameId, Lang, Skill, skillsFor } from "./skills";

export interface Sticker { id: string; icon: string; name: Record<Lang, string> }

export const STICKERS: Sticker[] = [
  { id: "sun", icon: "🌞", name: { en: "Sunshine", hi: "धूप" } },
  { id: "kite", icon: "🪁", name: { en: "Kite", hi: "पतंग" } },
  { id: "mango", icon: "🥭", name: { en: "Mango", hi: "आम" } },
  { id: "peacock", icon: "🦚", name: { en: "Peacock", hi: "मोर" } },
  { id: "lamp", icon: "🪔", name: { en: "Diya", hi: "दीया" } },
  { id: "elephant", icon: "🐘", name: { en: "Elephant", hi: "हाथी" } },
  { id: "flower", icon: "🌼", name: { en: "Flower", hi: "फूल" } },
  { id: "rain", icon: "🌈", name: { en: "Rainbow", hi: "इंद्रधनुष" } },
  { id: "drum", icon: "🥁", name: { en: "Drum", hi: "ढोल" } },
  { id: "fish", icon: "🐠", name: { en: "Fish", hi: "मछली" } },
  { id: "moon", icon: "🌙", name: { en: "Moon", hi: "चाँद" } },
  { id: "bee", icon: "🐝", name: { en: "Bee", hi: "मधुमक्खी" } },
  { id: "boat", icon: "⛵", name: { en: "Boat", hi: "नाव" } },
  { id: "tree", icon: "🌳", name: { en: "Tree", hi: "पेड़" } },
  { id: "cow", icon: "🐄", name: { en: "Cow", hi: "गाय" } },
  { id: "balloon", icon: "🎈", name: { en: "Balloon", hi: "गुब्बारा" } },
  { id: "tiger", icon: "🐯", name: { en: "Tiger", hi: "बाघ" } },
  { id: "star", icon: "⭐", name: { en: "Star", hi: "तारा" } },
  { id: "parrot", icon: "🦜", name: { en: "Parrot", hi: "तोता" } },
  { id: "lotus", icon: "🪷", name: { en: "Lotus", hi: "कमल" } },
];

export const stickerById = (id: string) => STICKERS.find(s => s.id === id);

/** Give today's sticker, once. Returns it, or null if one was already given today. When every sticker is owned, the
 *  day is still marked (so the home does not change) and nothing new is shown. */
export function grantDailySticker(c: Child, day: string): Sticker | null {
  if (c.stickers.some(s => s.day === day)) return null;
  const owned = new Set(c.stickers.map(s => s.id));
  const next = STICKERS.find(s => !owned.has(s.id));
  if (!next) return null;
  c.stickers.push({ id: next.id, day });
  return next;
}

export type NodeState = "built" | "next" | "shut";
export interface PathNode { skill: Skill; state: NodeState }

/** The levels of one game in order: built ones, the one to play next, and those still shut. */
export function skillPath(c: Child, game: GameId): PathNode[] {
  let nextGiven = false;
  return skillsFor(game).map(skill => {
    if (["mastered", "secure"].includes(rec(c.learner, skill.id).state)) return { skill, state: "built" as const };
    if (!nextGiven && unlocked(c.learner, skill.id)) { nextGiven = true; return { skill, state: "next" as const }; }
    return { skill, state: "shut" as const };
  });
}
