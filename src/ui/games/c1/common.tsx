import type { ComponentChildren } from "preact";
import { say } from "../../voice";

/** A big tappable choice card. `right` marks the answer when revealed or at hint level 4. */
export function Choice({ onPick, disabled, right, children, label }: {
  onPick: () => void; disabled: boolean; right?: boolean; children: ComponentChildren; label?: string;
}) {
  return (
    <button class={`choice c1 ${right ? "right" : ""}`} disabled={disabled} onClick={onPick} aria-label={label}>{children}</button>
  );
}

/** Small speaker that says an English word without choosing it. */
export function Hear({ word }: { word: string }) {
  return (
    <span role="button" tabIndex={0} class="hear" aria-label={`hear ${word}`}
      onClick={e => { e.stopPropagation(); say(word, "en", true); }}
      onKeyDown={e => { if (e.key === "Enter") { e.stopPropagation(); say(word, "en", true); } }}>🔊</span>
  );
}

export const Pic = ({ e, size = 48 }: { e: string; size?: number }) => <span class="pic" style={{ fontSize: `${size}px` }} aria-hidden="true">{e}</span>;
