import { Lang, SKILLS } from "../engine/skills";
import type { Child } from "../store";
import { PLACE_ICON } from "./Play";
import { say } from "./voice";

const built = (c: Child) =>
  SKILLS.filter(s => ["mastered", "secure"].includes(c.learner.skills[s.id]?.state ?? ""))
    .sort((a, b) => (c.learner.skills[a.id].masteredOn ?? "").localeCompare(c.learner.skills[b.id].masteredOn ?? "") || a.id.localeCompare(b.id));

/** The child's town as a little street: every skill mastered adds a place, newest last and highlighted.
 *  Tapping a place has Keya say what it is, so a child who cannot read yet can still explore it. */
export function TownView({ child, lang }: { child: Child; lang: Lang }) {
  const places = built(child);
  const total = SKILLS.filter(s => child.openClasses.includes(s.cls)).length;
  return (
    <section class="townview" aria-label={lang === "hi" ? "मेरा नगर" : "My town"}>
      <div class="sky" aria-hidden="true"><span class="sun">☀️</span><span class="cloud c1">☁️</span><span class="cloud c2">☁️</span></div>
      <div class="street">
        {places.length === 0 && <p class="emptytown">{lang === "hi" ? "खेलकर नगर बनाओ!" : "Play to build your town!"}</p>}
        {places.map((s, i) => (
          <button key={s.id} class={`place ${i === places.length - 1 ? "newest" : ""} ${i % 2 ? "up" : ""}`}
            onClick={() => say(s.place[lang], lang, true)} aria-label={s.place[lang]}>
            <span aria-hidden="true">{PLACE_ICON[s.id] ?? "🏠"}</span>
          </button>
        ))}
      </div>
      <div class="ground" aria-hidden="true" />
      <p class="townscore">🏘️ {places.length} / {total}</p>
    </section>
  );
}
