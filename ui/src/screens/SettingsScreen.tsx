import { useEffect, useState } from "react";
import { Button } from "../components/Button";
import { useT } from "../i18n/I18nContext";
import * as api from "../api";

export function SettingsScreen({ onDone }: { onDone: () => void }) {
  const t = useT();
  const [lockMin, setLockMin] = useState(5);
  const [clipSec, setClipSec] = useState(20);

  // device unlock / Touch ID
  const [remembered, setRemembered] = useState(false);
  const [bioAvail, setBioAvail] = useState(false);
  const [busy, setBusy] = useState(false);
  const [devErr, setDevErr] = useState("");

  useEffect(() => {
    api.getSettings().then((s) => { setLockMin(Math.round(s.autolock_secs / 60)); setClipSec(s.clipboard_clear_secs); }).catch(() => {});
    api.isDeviceRemembered().then(setRemembered).catch(() => {});
    api.biometricAvailable().then(setBioAvail).catch(() => {});
  }, []);

  const toggleDevice = async () => {
    setDevErr("");
    setBusy(true);
    try {
      if (remembered) {
        await api.forgetDevice();
        setRemembered(false);
      } else {
        await api.rememberOnDevice();
        // verify it actually persisted
        const ok = await api.isDeviceRemembered();
        setRemembered(ok);
        if (!ok) setDevErr(t("deviceError"));
      }
    } catch {
      setDevErr(t("deviceError"));
    } finally {
      setBusy(false);
    }
  };

  const save = async () => { await api.setSettings(lockMin * 60, clipSec); onDone(); };

  const numStyle = { borderColor: "var(--fv-border)", background: "var(--fv-surface-2)", color: "var(--fv-text)" } as const;

  return (
    <div className="max-w-md mx-auto p-6 space-y-5">
      <h2 className="text-xl font-semibold" style={{ color: "var(--fv-text)" }}>{t("settings")}</h2>

      <label className="flex items-center justify-between gap-3 text-sm" style={{ color: "var(--fv-text)" }}>
        {t("autoLockMin")}
        <input type="number" min={1} value={lockMin} onChange={(e) => setLockMin(Number(e.target.value))}
          className="w-24 px-2 py-1 rounded-lg border" style={numStyle} />
      </label>
      <label className="flex items-center justify-between gap-3 text-sm" style={{ color: "var(--fv-text)" }}>
        {t("clipboardClear")}
        <input type="number" min={1} value={clipSec} onChange={(e) => setClipSec(Number(e.target.value))}
          className="w-24 px-2 py-1 rounded-lg border" style={numStyle} />
      </label>

      {/* device unlock / Touch ID toggle */}
      <div className="rounded-xl border p-3.5" style={{ borderColor: "var(--fv-border)", background: "var(--fv-surface-2)" }}>
        <button
          type="button"
          onClick={() => void toggleDevice()}
          disabled={busy}
          className="w-full flex items-center justify-between gap-3 text-left disabled:opacity-60"
        >
          <span className="min-w-0">
            <span className="flex items-center gap-1.5 text-sm font-medium" style={{ color: "var(--fv-text)" }}>
              {bioAvail && <span aria-hidden="true">👆</span>}
              {bioAvail ? t("deviceUnlock") : t("deviceUnlockNoBio")}
            </span>
            <span className="block text-xs mt-0.5" style={{ color: "var(--fv-muted)" }}>{t("deviceUnlockHint")}</span>
          </span>
          {/* switch */}
          <span
            className="shrink-0 inline-flex items-center rounded-full transition-colors"
            style={{ width: 42, height: 24, padding: 2, background: remembered ? "linear-gradient(90deg,#7c3aed,#0ea5e9)" : "var(--fv-border)" }}
          >
            <span
              className="rounded-full bg-white transition-transform"
              style={{ width: 20, height: 20, transform: remembered ? "translateX(18px)" : "translateX(0)" }}
            />
          </span>
        </button>
        {remembered && <div className="text-xs mt-2 font-medium" style={{ color: "#22c55e" }}>✓ {t("deviceEnabled")}</div>}
        {devErr && <div className="text-xs mt-2" style={{ color: "#ef4444" }}>{devErr}</div>}
      </div>

      <div className="flex gap-2">
        <Button onClick={save}>{t("save")}</Button>
        <Button variant="ghost" onClick={onDone}>{t("cancel")}</Button>
      </div>
    </div>
  );
}
