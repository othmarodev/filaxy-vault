import { useState } from "react";
import { Button } from "../components/Button";
import { PasswordField } from "../components/PasswordField";
import { useT } from "../i18n/I18nContext";
import * as api from "../api";

export function Unlock({ path, onUnlocked }: { path: string; onUnlocked: () => void }) {
  const t = useT();
  const [pw, setPw] = useState("");
  const [keyfile, setKeyfile] = useState("");
  const [totp, setTotp] = useState("");
  const [err, setErr] = useState("");

  const unlock = async () => {
    setErr("");
    try {
      await api.unlockVault(path, pw, keyfile || undefined, totp || undefined);
      onUnlocked();
    } catch { setErr(t("cannotOpen")); }
  };

  return (
    <div className="max-w-md mx-auto mt-24 space-y-4 p-6 rounded-2xl border" style={{ borderColor: "var(--fv-border)", background: "var(--fv-surface)" }}>
      <h2 className="text-xl font-semibold">{t("unlock")}</h2>
      <PasswordField value={pw} onChange={setPw} />
      <input placeholder={t("keyFile")} value={keyfile} onChange={(e) => setKeyfile(e.target.value)}
        className="w-full px-3 py-2 rounded-lg border bg-transparent" style={{ borderColor: "var(--fv-border)" }} />
      <input placeholder="TOTP" value={totp} onChange={(e) => setTotp(e.target.value)}
        className="w-full px-3 py-2 rounded-lg border bg-transparent" style={{ borderColor: "var(--fv-border)" }} />
      {err && <p className="text-sm" style={{ color: "#ef4444" }}>{err}</p>}
      <Button onClick={unlock} className="w-full">{t("unlock")}</Button>
    </div>
  );
}
