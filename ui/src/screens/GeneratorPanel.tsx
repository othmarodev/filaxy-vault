import { useEffect } from "react";
import { useGenerator } from "../hooks/useGenerator";
import { EntropyMeter } from "../components/EntropyMeter";
import { PasswordField } from "../components/PasswordField";
import { Button } from "../components/Button";
import { useT } from "../i18n/I18nContext";

export function GeneratorPanel({ onUse }: { onUse?: (pw: string) => void }) {
  const t = useT();
  const { opts, setOpts, value, bits, regenerate } = useGenerator();
  useEffect(() => { void regenerate(); /* initial */ // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="space-y-3 p-4 rounded-xl border" style={{ borderColor: "var(--fv-border)", background: "var(--fv-surface)" }}>
      <PasswordField value={value} readOnly onCopy={() => navigator.clipboard?.writeText(value)} />
      <EntropyMeter bits={bits} />
      <label className="flex items-center gap-2 text-sm">
        {t("length")}: {opts.length}
        <input type="range" min={8} max={64} value={opts.length}
          onChange={(e) => setOpts({ ...opts, length: Number(e.target.value) })} className="flex-1" />
      </label>
      <div className="flex gap-4 text-sm flex-wrap">
        <label className="flex items-center gap-1"><input type="checkbox" checked={opts.digits} onChange={(e) => setOpts({ ...opts, digits: e.target.checked })} />{t("digits")}</label>
        <label className="flex items-center gap-1"><input type="checkbox" checked={opts.symbols} onChange={(e) => setOpts({ ...opts, symbols: e.target.checked })} />{t("symbols")}</label>
        <label className="flex items-center gap-1"><input type="checkbox" checked={opts.upper} onChange={(e) => setOpts({ ...opts, upper: e.target.checked })} />A-Z</label>
        <label className="flex items-center gap-1"><input type="checkbox" checked={opts.lower} onChange={(e) => setOpts({ ...opts, lower: e.target.checked })} />a-z</label>
      </div>
      <div className="flex gap-2">
        <Button onClick={() => void regenerate()}>{t("generate")}</Button>
        {onUse && value && <Button variant="ghost" onClick={() => onUse(value)}>{t("save")}</Button>}
      </div>
    </div>
  );
}
