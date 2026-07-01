import { useEffect, useState } from "react";
import { Button } from "../components/Button";
import { PasswordField } from "../components/PasswordField";
import { Logo } from "../components/Logo";
import { useT } from "../i18n/I18nContext";
import * as api from "../api";

export function Unlock({ path, onUnlocked }: { path: string; onUnlocked: () => void }) {
  const t = useT();
  const [pw, setPw] = useState("");
  const [keyfile, setKeyfile] = useState("");
  const [totp, setTotp] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [err, setErr] = useState("");
  const [touchId, setTouchId] = useState(false);

  // Offer Touch ID only when the vault key is remembered on this device AND biometrics work.
  useEffect(() => {
    let alive = true;
    Promise.all([api.hasDeviceKey(path), api.biometricAvailable()])
      .then(([has, bio]) => { if (alive) setTouchId(has && bio); })
      .catch(() => {});
    return () => { alive = false; };
  }, [path]);

  const unlock = async () => {
    setErr("");
    try {
      await api.unlockVault(path, pw, keyfile || undefined, totp || undefined);
      onUnlocked();
    } catch { setErr(t("cannotOpen")); }
  };

  const unlockTouchId = async () => {
    setErr("");
    try {
      await api.unlockWithDevice(path); // triggers the Touch ID prompt in the backend
      onUnlocked();
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
        <h1 className="text-2xl font-bold text-center" style={{ color: "var(--fv-text)" }}>{t("unlock")}</h1>
        <p className="text-sm text-center mt-1 mb-6" style={{ color: "var(--fv-muted)" }}>{t("unlockSubtitle")}</p>

        {touchId && (
          <div className="mb-5">
            <Button type="button" className="w-full !py-2.5 inline-flex items-center justify-center gap-2" onClick={() => void unlockTouchId()}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 11c0 3 0 5-1 7" /><path d="M8 11a4 4 0 0 1 8 0c0 2 0 4-.5 6" />
                <path d="M5 12a7 7 0 0 1 12-5" /><path d="M19 12c0 2 0 4-.5 6" />
                <path d="M8.5 18.5c.4-1.2.5-2.5.5-4" />
              </svg>
              {t("unlockTouchId")}
            </Button>
            <div className="text-center text-xs mt-3" style={{ color: "var(--fv-faint)" }}>{t("orUsePassword")}</div>
          </div>
        )}

        <form
          className="space-y-4"
          onSubmit={(e) => { e.preventDefault(); void unlock(); }}
        >
          <div>
            <label className={labelCls} style={labelStyle}>{t("masterPassword")}</label>
            <PasswordField value={pw} onChange={setPw} />
          </div>

          <button type="button" className="text-xs font-medium" style={{ color: "var(--fv-violet)" }} onClick={() => setShowAdvanced((s) => !s)}>
            {showAdvanced ? "▾" : "▸"} {t("advanced")}
          </button>
          {showAdvanced && (
            <div className="space-y-4">
              <div>
                <label className={labelCls} style={labelStyle}>{t("keyFile")}</label>
                <input placeholder="/path/to/keyfile" value={keyfile} onChange={(e) => setKeyfile(e.target.value)} className={inputCls} style={inputStyle} />
              </div>
              <div>
                <label className={labelCls} style={labelStyle}>TOTP</label>
                <input placeholder="000000" value={totp} onChange={(e) => setTotp(e.target.value)} className={`${inputCls} font-mono`} style={inputStyle} />
              </div>
            </div>
          )}

          {err && <p className="text-sm" style={{ color: "#ef4444" }}>{err}</p>}
          <Button type="submit" className="w-full !py-2.5">{t("unlock")}</Button>
        </form>
      </div>
    </div>
  );
}
