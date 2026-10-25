import { useEffect, useState } from "preact/hooks";
import type { Lang } from "../engine/skills";
import { getNotice, NoticeKind, onNotice, retryNow } from "./voice";

const TEXT: Record<NoticeKind, Record<Lang, string>> = {
  blocked: {
    en: "Sound is blocked here. If this page is inside a preview frame, open it in its own browser tab.",
    hi: "यहाँ आवाज़ रोकी गई है। अगर यह पन्ना किसी प्रीव्यू फ़्रेम में है, तो इसे अलग ब्राउज़र टैब में खोलें।",
  },
  stuck: { en: "Keya's voice did not start.", hi: "केया की आवाज़ शुरू नहीं हुई।" },
  unsupported: { en: "This browser cannot speak. Keya's words show as text.", hi: "यह ब्राउज़र बोल नहीं सकता। केया की बातें लिखी दिखेंगी।" },
  "no-hindi": {
    en: "This phone has no Hindi voice, so Hindi lines may stay silent. Add one in the phone's text-to-speech settings.",
    hi: "इस फ़ोन में हिंदी आवाज़ नहीं है, इसलिए हिंदी की बातें शायद न सुनाई दें। फ़ोन की टेक्स्ट-टू-स्पीच सेटिंग में हिंदी जोड़ें।",
  },
};

/** A small visible notice when Keya cannot speak, so a silent screen is never a mystery. */
export function SpeechNotice({ lang }: { lang: Lang }) {
  const [kind, setKind] = useState<NoticeKind | null>(getNotice());
  const [hidden, setHidden] = useState<NoticeKind | null>(null);
  useEffect(() => onNotice(setKind), []);
  if (!kind || hidden === kind) return null;
  const retry = kind === "blocked" || kind === "stuck";
  return (
    <div class="speech-notice" role="status" data-notice={kind}>
      <span>🔇 {TEXT[kind][lang]}</span>
      {retry && <button class="soft" onClick={() => retryNow()}>🔊 {lang === "hi" ? "फिर कोशिश" : "Try again"}</button>}
      <button class="ghost" aria-label="close" onClick={() => setHidden(kind)}>✕</button>
    </div>
  );
}
