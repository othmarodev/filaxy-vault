import { useState } from "react";
import { Button } from "../components/Button";
import { PasswordField } from "../components/PasswordField";
import { Logo } from "../components/Logo";
import { useT } from "../i18n/I18nContext";
import * as api from "../api";

export function Onboarding({ path, onCreated }: { path: string; onCreated: () => void }) {
  const t = useT();
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [keyfile, setKeyfile] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [err, setErr] = useState("");

  const create = async () => {
    setErr("");
    if (pw.length < 8) { setErr(t("minChars")); return; }
    if (pw !== confirm) { setErr(t("passMismatch")); return; }
    try {
      await api.createVault(path, pw, keyfile || undefined);
      await api.unlockVault(path, pw, keyfile || undefined);
      onCreated();
    } catch { setErr(t("cannotOpen")); }
  };

  const inputCls = "w-full px-3 py-2.5 rounded-xl border text-sm";
  const inputStyle = { background: "var(--fv-surface-2)", borderColor: "var(--fv-border)", color: "var(--fv-text)" } as const;
  const labelCls = "block text-xs uppercase tracking-wide mb-1";
  const labelStyle = { color: "var(--fv-faint)" } as const;

  return (
    <div className="h-full grid place-items-center p-6">
      <div
        className="fv-fade-in w-full max-w-md rounded-3xl border p-8"
        style={{ background: "var(--fv-surface)", borderColor: "var(--fv-border)", boxShadow: "var(--fv-shadow)" }}
      >
        <div className="flex justify-center mb-6"><Logo /></div>
        <h1 className="text-2xl font-bold text-center" style={{ color: "var(--fv-text)" }}>{t("createVault")}</h1>
        <p className="text-sm text-center mt-1 mb-6" style={{ color: "var(--fv-muted)" }}>{t("onboardSubtitle")}</p>

        <div className="space-y-4">
          <div>
            <label className={labelCls} style={labelStyle}>{t("masterPassword")}</label>
            <PasswordField value={pw} onChange={setPw} />
          </div>
          <div>
            <label className={labelCls} style={labelStyle}>{t("confirmPassword")}</label>
            <PasswordField value={confirm} onChange={setConfirm} />
          </div>

          <button className="text-xs font-medium" style={{ color: "var(--fv-violet)" }} onClick={() => setShowAdvanced((s) => !s)}>
            {showAdvanced ? "▾" : "▸"} {t("advanced")}
          </button>
          {showAdvanced && (
            <div>
              <label className={labelCls} style={labelStyle}>{t("keyFile")}</label>
              <input placeholder="/path/to/keyfile" value={keyfile} onChange={(e) => setKeyfile(e.target.value)} className={inputCls} style={inputStyle} />
            </div>
          )}

          {err && <p className="text-sm" style={{ color: "#ef4444" }}>{err}</p>}
          <Button onClick={create} className="w-full !py-2.5">{t("createVault")}</Button>
        </div>

        <p className="text-xs text-center mt-5" style={{ color: "var(--fv-faint)" }}>{t("onboardFootnote")}</p>
      </div>
    </div>
  );
}
