import { useState } from "preact/hooks";
import { dismissMisconception, today } from "../engine/learner";
import { MISTAKE_TEXT } from "../engine/items";
import { Cls, GAMES } from "../engine/skills";
import { addChild, AVATARS, Family, exportJson, reportText, weeklyReport, wipe } from "../store";
import { HOME } from "./i18n";
import { CloudBackup } from "./Cloud";
import { testVoice, voiceStatus } from "./voice";
import { useEffect } from "preact/hooks";

export interface PinGate { remaining: () => number; fail: () => void; ok: () => void }

/** 4-digit PIN entry. onPin returns false to show "try again"; a gate slows down repeated wrong tries. */
export function PinPad({ title, onPin, onCancel, gate }: { title: string; onPin: (pin: string) => Promise<boolean>; onCancel?: () => void; gate?: PinGate }) {
  const [pin, setPin] = useState("");
  const [bad, setBad] = useState(false);
  const [wait, setWait] = useState(() => gate?.remaining() ?? 0);
  useEffect(() => {
    if (!wait) return;
    const id = setInterval(() => setWait(gate!.remaining()), 500);
    return () => clearInterval(id);
  }, [wait > 0]);
  const press = async (k: string) => {
    if (wait > 0) return;
    if (k === "del") { setPin(p => p.slice(0, -1)); return; }
    const next = (pin + k).slice(0, 4);
    setPin(next); setBad(false);
    if (next.length === 4) {
      const ok = await onPin(next); setPin("");
      if (ok) gate?.ok(); else { gate?.fail(); setBad(true); setWait(gate?.remaining() ?? 0); }
    }
  };
  return (
    <div class="screen pin">
      <h2>{title}</h2>
      <div class="dots" aria-label={`${pin.length} of 4`}>{[0, 1, 2, 3].map(i => <span key={i} class={i < pin.length ? "on" : ""} />)}</div>
      {wait > 0 && <p class="err" role="alert">Too many tries. Wait {Math.ceil(wait / 1000)} s · बहुत कोशिशें हो गईं। {Math.ceil(wait / 1000)} सेकंड रुकें।</p>}
      {bad && wait === 0 && <p class="err">That didn't match. Try again. · मेल नहीं खाया, फिर कोशिश करें।</p>}
      <div class="keys pinkeys">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "del", "0"].map(k => <button key={k} disabled={wait > 0} class={k === "del" ? "key soft" : "key"} onClick={() => press(k)} aria-label={k === "del" ? "delete" : k}>{k === "del" ? "⌫" : k}</button>)}
        {onCancel && <button class="key soft" onClick={onCancel}>✕</button>}
      </div>
    </div>
  );
}

/** Parent area: weekly report, what we noticed, settings, data. Parent-facing text is English with Hindi labels. */
export function Parent({ family, persist, onExit, onWiped }: { family: Family; persist: () => void; onExit: () => void; onWiped: () => void }) {
  const [sel, setSel] = useState(family.children[0]?.id ?? "");
  const [confirm, setConfirm] = useState<"" | "child" | "all">("");
  const [showData, setShowData] = useState(false);
  const [copied, setCopied] = useState(false);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState(""), [cls, setCls] = useState<Cls>(1);
  const child = family.children.find(c => c.id === sel);
  const day = today(family.tz);
  const r = child ? weeklyReport(child, day, "en") : null;
  const [voiceLines, setVoiceLines] = useState<string[] | null>(null);
  const [noHindi, setNoHindi] = useState(false);
  useEffect(() => { voiceStatus().then(st => setNoHindi(st.supported && !st.hindi)); }, []);

  return (
    <div class="screen parent">
      <div class="phead"><h2>Grown-ups · बड़ों के लिए</h2><button class="ghost" onClick={onExit}>Close ✕</button></div>
      <div class="tabs">
        {family.children.map(c => <button key={c.id} aria-pressed={c.id === sel} onClick={() => { setSel(c.id); setConfirm(""); }}>{c.avatar} {c.nickname}</button>)}
        <button onClick={() => setAdding(a => !a)}>+ Add child</button>
      </div>

      {adding && (
        <div class="card">
          <label class="field">Nickname<input value={name} maxLength={16} onInput={e => setName((e.target as HTMLInputElement).value)} /></label>
          <div class="field">Class<div class="seg">{([1, 2, 3] as const).map(c => <button key={c} aria-pressed={cls === c} onClick={() => setCls(c)}>{c}</button>)}</div></div>
          <button class="primary" disabled={!name.trim()} onClick={() => { const c = addChild(family, name, cls, "hi", AVATARS[family.children.length % AVATARS.length]); persist(); setSel(c.id); setAdding(false); setName(""); }}>Add</button>
        </div>
      )}

      {child && r && (
        <>
          <div class="card report">
            <h3>This week · {r.from} to {r.to}</h3>
            <dl class="kv">
              <dt>Time played</dt><dd>{r.minutes} min in {r.sessions} session{r.sessions === 1 ? "" : "s"}</dd>
              <dt>Done alone</dt><dd>{r.aloneShare === null ? "—" : `${r.aloneShare}% of problems, right first time with no help`}</dd>
            </dl>
            <h4>Learned this week</h4>
            {r.learned.length ? <ul>{r.learned.map(x => <li key={x.id}><b>{x.name}</b>: {x.canDo}</li>)}</ul> : <p class="muted">Nothing new mastered yet this week.</p>}
            <h4>Needs more practice</h4>
            {r.practise.length ? <ul>{r.practise.map(x => <li key={x.id}>{x.name} <span class="muted">({x.state.replace("_", " ")})</span></li>)}</ul> : <p class="muted">Nothing flagged.</p>}
            <h4>Things we noticed</h4>
            {r.noticed.length ? (
              <ul>{r.noticed.map(n => (
                <li key={n.skill + n.mistake}>{MISTAKE_TEXT[n.mistake].en} <span class="muted">· {n.skillName} · {n.confirmed ? `seen on ${n.items} problems` : "seen once, may be a slip"}</span>
                  <button class="link" onClick={() => { dismissMisconception(child.learner, n.skill, n.mistake); persist(); }}>This is wrong, remove it</button></li>
              ))}</ul>
            ) : <p class="muted">Nothing to flag.</p>}
            <h4>Try at home</h4>
            <p>{r.home ? HOME[r.home].en : HOME[GAMES.find(g => child.openClasses.includes(g.cls))?.id ?? "beads"].en}</p>
            <div class="row">
              <button class="soft" onClick={async () => {
                const text = reportText(child, r);
                try { if (navigator.share) { await navigator.share({ text }); return; } } catch { return; }       // closing the share sheet is not an error
                window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
              }}>📤 Share this week · भेजें</button>
              <button class="soft" onClick={async () => { try { await navigator.clipboard.writeText(reportText(child, r)); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* clipboard blocked */ } }}>
                {copied ? "Copied ✓" : "Copy"}</button>
            </div>
            <p class="muted small">Observations disappear after 30 days unless seen again. Mastery means right without help on fresh problems; it is checked again after 2 and 7 days.</p>
          </div>

          <div class="card">
            <h3>Settings for {child.nickname}</h3>
            <div class="field">Keya speaks<div class="seg">
              <button aria-pressed={child.lang === "hi"} onClick={() => { child.lang = "hi"; persist(); }}>हिंदी</button>
              <button aria-pressed={child.lang === "en"} onClick={() => { child.lang = "en"; persist(); }}>English</button></div></div>
            <div class="field">Games open<div class="seg">
              {[1, 2, 3].map(c => <button key={c} aria-pressed={child.openClasses.includes(c)} onClick={() => {
                child.openClasses = child.openClasses.includes(c) ? child.openClasses.filter(x => x !== c) : [...child.openClasses, c];
                if (!child.openClasses.length) child.openClasses = [child.cls];
                persist();
              }}>Class {c}</button>)}</div></div>
            {confirm === "child" ? (
              <div class="danger">Delete {child.nickname} and all their progress? This can't be undone.
                <div class="row"><button class="danger-btn" onClick={() => { family.children = family.children.filter(c => c.id !== child.id); persist(); setSel(family.children[0]?.id ?? ""); setConfirm(""); }}>Delete</button>
                  <button class="soft" onClick={() => setConfirm("")}>Keep</button></div></div>
            ) : <button class="link danger-link" onClick={() => setConfirm("child")}>Delete {child.nickname}</button>}
          </div>
        </>
      )}

      <div class="card">
        <h3>Keya's voice · केया की आवाज़</h3>
        {noHindi && family.children.some(c => c.lang === "hi") && (
          <p class="warnbox">This phone has no Hindi voice, so Keya's Hindi lines will show as text only. Install a Hindi text-to-speech voice in the phone's settings, or switch Keya to English.</p>
        )}
        <button class="soft" onClick={async () => { setVoiceLines(["Testing…"]); setVoiceLines(await testVoice()); }}>🔊 Test Keya's voice</button>
        {voiceLines && <ul class="small">{voiceLines.map(l => <li key={l}>{l}</li>)}</ul>}
      </div>

      <div class="card">
        <h3>Family settings</h3>
        <div class="field">Daily time limit<div class="seg">{[8, 12, 15, 20].map(m => <button key={m} aria-pressed={family.limitMin === m} onClick={() => { family.limitMin = m; persist(); }}>{m} min</button>)}</div></div>
        <CloudBackup family={family} persist={persist} />
        <button class="soft" onClick={() => setShowData(s => !s)}>{showData ? "Hide my data" : "See all stored data"}</button>
        {showData && <textarea class="data" readOnly value={exportJson(family)} />}
        {confirm === "all" ? (
          <div class="danger">Delete everything on this phone, including all children and progress?
            <div class="row"><button class="danger-btn" onClick={() => { wipe(); onWiped(); }}>Delete everything</button><button class="soft" onClick={() => setConfirm("")}>Keep</button></div></div>
        ) : <button class="link danger-link" onClick={() => setConfirm("all")}>Delete all data</button>}
      </div>
    </div>
  );
}
