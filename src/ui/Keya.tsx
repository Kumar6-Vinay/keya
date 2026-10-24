import { useEffect, useState } from "preact/hooks";
import { onTalking } from "./voice";

/** Keya the myna: dark brown body, yellow beak and eye patch, as mynas look. Talks when the voice plays. */
export function Keya({ mood = "", size = 72 }: { mood?: "" | "cheer" | "think"; size?: number }) {
  const [talking, setTalking] = useState(false);
  useEffect(() => { onTalking(setTalking); }, []);
  return (
    <div class={`tara ${talking ? "talk" : ""} ${mood}`} style={{ width: size }} aria-hidden="true">
      <svg viewBox="0 0 100 110" width={size} height={size * 1.1}>
        <ellipse cx="50" cy="104" rx="26" ry="4" fill="#000" opacity=".12" />
        <path d="M30 98 l-6 8 M38 98 l-2 9 M62 98 l2 9 M70 98 l6 8" stroke="#e8a317" stroke-width="4" stroke-linecap="round" />
        <g class="body">
          <path d="M20 70 Q16 34 50 28 Q84 34 80 70 Q78 98 50 98 Q22 98 20 70 Z" fill="#4a3426" />
          <path d="M28 72 Q30 92 50 94 Q70 92 72 72 Q60 80 50 80 Q40 80 28 72 Z" fill="#6b4c37" />
          <path class="wing" d="M70 52 Q92 64 82 86 Q74 76 66 70 Z" fill="#3a281d" />
          <path d="M74 80 Q86 84 84 92 Q78 88 72 86 Z" fill="#f4f1ea" />
          <path d="M44 30 Q50 14 58 26" fill="#3a281d" />
          <ellipse cx="38" cy="50" rx="11" ry="10" fill="#f2c230" />
          <circle class="eye" cx="38" cy="50" r="6.5" fill="#fff" />
          <circle class="pupil" cx="39" cy="50" r="3.6" fill="#1d130c" />
          <circle cx="40.3" cy="48.6" r="1.2" fill="#fff" />
          <g class="beak">
            <path d="M22 56 L8 60 L22 62 Z" fill="#f2b705" stroke="#c48a00" stroke-width="1" />
            <path class="jaw" d="M22 62 L10 61 L22 66 Z" fill="#e0a100" />
          </g>
        </g>
        <g class="spark" fill="#ff9f1c">
          <path d="M84 18 l2.5 6 6 2.5 -6 2.5 -2.5 6 -2.5 -6 -6 -2.5 6 -2.5z" />
          <path d="M12 26 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z" />
        </g>
      </svg>
    </div>
  );
}
