/** Today's visit with Keya: which game she suggests, and how far the day's goal has got.
 *  The goal is a small number of short games, never a streak: missing a day costs nothing. */
import type { Child } from "../store";
import { dueReviews, rec } from "./learner";
import { GameId, GAMES, skill as skillOf, skillsFor } from "./skills";

export const DAILY_GOAL = 2;          // games to play today
const MIN_ITEMS = 3;                  // a game counts once the child has answered a few items

export const gamesToday = (c: Child, day: string) => c.sessions.filter(s => s.date === day && s.items >= MIN_ITEMS).length;
export const goalMet = (c: Child, day: string) => gamesToday(c, day) >= DAILY_GOAL;

const done = (c: Child, game: GameId) => skillsFor(game).every(s => ["mastered", "secure"].includes(rec(c.learner, s.id).state));
const inProgress = (c: Child, game: GameId) => skillsFor(game).some(s => ["learning", "practised"].includes(rec(c.learner, s.id).state));
const subjectOf = (g: GameId) => GAMES.find(x => x.id === g)!.subject;

/** The game Keya suggests. A visitor who needs help comes first; then a game already begun, so work gets finished;
 *  then the next new one. Games played today and the same subject as the last game are put off while others remain. */
export function pickGame(c: Child, day: string): GameId {
  const due = dueReviews(c.learner, day);
  if (due.length) return skillOf(due[0]).game;

  const open = GAMES.filter(g => c.openClasses.includes(g.cls)).sort((a, b) => (a.cls === c.cls ? 0 : 1) - (b.cls === c.cls ? 0 : 1));
  let pool = open.filter(g => !done(c, g.id));
  if (!pool.length) pool = open;
  const playedToday = new Set(c.sessions.filter(s => s.date === day).map(s => s.game));
  const fresh = pool.filter(g => !playedToday.has(g.id));
  if (fresh.length) pool = fresh;
  const last = c.sessions[c.sessions.length - 1];
  if (last) {
    const other = pool.filter(g => g.subject !== subjectOf(last.game));
    if (other.length) pool = other;
  }
  return (pool.find(g => inProgress(c, g.id)) ?? pool[0]).id;
}
