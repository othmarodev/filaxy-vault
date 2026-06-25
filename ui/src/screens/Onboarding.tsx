import { useState } from "react";
import { Button } from "../components/Button";
import { PasswordField } from "../components/PasswordField";
import { useT } from "../i18n/I18nContext";
import * as api from "../api";

export function Onboarding({ path, onCreated }: { path: string; onCreated: () => void }) {
  const t = useT();
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [keyfile, setKeyfile] = useState("");
  const [err, setErr] = useState("");

  const create = async () => {
    if (pw.length < 8) { setErr("min 8"); return; }
    if (pw !== confirm) { setErr("mismatch"); return; }
    try {
      await api.createVault(path, pw, keyfile || undefined);
      await api.unlockVault(path, pw, keyfile || undefined);
      onCreated();
    } catch { setErr(t("cannotOpen")); }
  };

  return (
    <div className="max-w-md mx-auto mt-16 space-y-4 p-6 rounded-2xl border" style={{ borderColor: "var(--fv-border)", background: "var(--fv-surface)" }}>
      <h2 className="text-xl font-semibold">{t("createVault")}</h2>
      <PasswordField value={pw} onChange={setPw} />
      <PasswordField value={confirm} onChange={setConfirm} />
      <input placeholder={t("keyFile")} value={keyfile} onChange={(e) => setKeyfile(e.target.value)}
        className="w-full px-3 py-2 rounded-lg border bg-transparent" style={{ borderColor: "var(--fv-border)" }} />
      {err && <p className="text-sm" style={{ color: "#ef4444" }}>{err}</p>}
      <Button onClick={create} className="w-full">{t("createVault")}</Button>
    </div>
  );
}
