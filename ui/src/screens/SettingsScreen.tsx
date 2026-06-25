import { useEffect, useState } from "react";
import { Button } from "../components/Button";
import { useT } from "../i18n/I18nContext";
import * as api from "../api";

export function SettingsScreen({ onDone }: { onDone: () => void }) {
  const t = useT();
  const [lockMin, setLockMin] = useState(5);
  const [clipSec, setClipSec] = useState(20);

  useEffect(() => {
    api.getSettings().then((s) => { setLockMin(Math.round(s.autolock_secs / 60)); setClipSec(s.clipboard_clear_secs); }).catch(() => {});
  }, []);

  const save = async () => { await api.setSettings(lockMin * 60, clipSec); onDone(); };

  return (
    <div className="max-w-md mx-auto p-6 space-y-4">
      <h2 className="text-xl font-semibold">{t("settings")}</h2>
      <label className="flex items-center justify-between gap-3">
        Auto-lock (min)
        <input type="number" min={1} value={lockMin} onChange={(e) => setLockMin(Number(e.target.value))}
          className="w-24 px-2 py-1 rounded border bg-transparent" style={{ borderColor: "var(--fv-border)" }} />
      </label>
      <label className="flex items-center justify-between gap-3">
        Clipboard clear (s)
        <input type="number" min={1} value={clipSec} onChange={(e) => setClipSec(Number(e.target.value))}
          className="w-24 px-2 py-1 rounded border bg-transparent" style={{ borderColor: "var(--fv-border)" }} />
      </label>
      <div className="flex gap-2 flex-wrap">
        <Button variant="ghost" onClick={() => void api.rememberOnDevice()}>Remember device</Button>
        <Button variant="ghost" onClick={() => void api.forgetDevice()}>Forget device</Button>
      </div>
      <div className="flex gap-2">
        <Button onClick={save}>{t("save")}</Button>
        <Button variant="ghost" onClick={onDone}>{t("cancel")}</Button>
      </div>
    </div>
  );
}
