import { useState } from "preact/hooks";
import type { Family } from "../store";
import { backup, cloudConfigured, cloudUser, deleteCloud, sendCode, signOut, verifyCode } from "../sync";

/** Parent-only cloud backup. Hidden entirely when this build has no backend configured. */
export function CloudBackup({ family, persist }: { family: Family; persist: () => void }) {
  const [email, setEmail] = useState(cloudUser() ?? "");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [user, setUser] = useState(cloudUser());
  if (!cloudConfigured()) return <p class="muted small">Cloud backup is not available in this version. Everything stays on this phone.</p>;

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true); setMsg("");
    try { await fn(); setMsg(ok); } catch (e) { setMsg(`Couldn't do that: ${(e as Error).message}`); } finally { setBusy(false); }
  };

  if (!user)
    return (
      <div class="cloud">
        <h4>Cloud backup (optional)</h4>
        <p class="muted small">Copies progress to our server so it survives a lost phone. Sign in with your email.</p>
        <label class="field">Email<input type="email" value={email} onInput={e => setEmail((e.target as HTMLInputElement).value)} /></label>
        {sent && <label class="field">Code from the email<input inputMode="numeric" value={code} onInput={e => setCode((e.target as HTMLInputElement).value)} /></label>}
        <button class="soft" disabled={busy || !email.includes("@") || (sent && code.length < 6)} onClick={() =>
          sent ? run(async () => { await verifyCode(email, code.trim()); setUser(email); }, "Signed in.")
               : run(async () => { await sendCode(email); setSent(true); }, "Code sent. Check your email.")}>
          {sent ? "Sign in" : "Send code"}</button>
        {msg && <p class="small">{msg}</p>}
      </div>
    );

  return (
    <div class="cloud">
      <h4>Cloud backup</h4>
      <p class="small">Signed in as {user}. {family.syncedAt ? `Last backup ${new Date(family.syncedAt).toLocaleString()}.` : "Not backed up yet."}</p>
      <div class="row">
        <button class="soft" disabled={busy} onClick={() => run(async () => { await backup(family); persist(); }, "Backed up.")}>Back up now</button>
        <button class="link" onClick={() => { signOut(); setUser(null); }}>Sign out</button>
        <button class="link danger-link" disabled={busy} onClick={() => run(deleteCloud, "Cloud copy deleted.")}>Delete cloud copy</button>
      </div>
      {msg && <p class="small">{msg}</p>}
    </div>
  );
}
