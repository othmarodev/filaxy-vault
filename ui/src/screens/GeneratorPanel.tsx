import { useEffect, useState } from "react";
import { useGenerator } from "../hooks/useGenerator";
import { EntropyMeter } from "../components/EntropyMeter";
import { PasswordField } from "../components/PasswordField";
import { Button } from "../components/Button";
import { useT } from "../i18n/I18nContext";
import type { PassphraseOpts } from "../types";
import { generatePassphrase, passphraseEntropy } from "../api";

type Mode = "password" | "passphrase";
const SEPARATORS = ["-", ".", "_", " "];

export function GeneratorPanel({ onUse }: { onUse?: (pw: string) => void }) {
  const t = useT();
  const [mode, setMode] = useState<Mode>("password");

  // password mode
  const { opts, setOpts, value, bits, regenerate } = useGenerator();

  // passphrase mode
  const [pp, setPp] = useState<PassphraseOpts>({ words: 5, separator: "-", capitalize: false, include_number: false });
  const [ppValue, setPpValue] = useState("");
  const [ppBits, setPpBits] = useState(0);
  const regenPp = async () => setPpValue(await generatePassphrase(pp));

  useEffect(() => { void regenerate(); /* initial password */ // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { passphraseEntropy(pp).then(setPpBits).catch(() => {}); }, [pp]);
  useEffect(() => { if (mode === "passphrase" && !ppValue) void regenPp(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const current = mode === "password" ? value : ppValue;

  return (
    <div className="space-y-3 p-4 rounded-xl border" style={{ borderColor: "var(--fv-border)", background: "var(--fv-surface)" }}>
      <div className="inline-flex p-0.5 rounded-lg" style={{ background: "var(--fv-surface-2)", border: "1px solid var(--fv-border)" }}>
        {(["password", "passphrase"] as Mode[]).map((m) => (
          <button key={m} type="button" onClick={() => setMode(m)}
            className="px-3 py-1 text-sm rounded-md transition-colors"
            style={{ background: mode === m ? "var(--fv-surface)" : "transparent", color: mode === m ? "var(--fv-text)" : "var(--fv-muted)", fontWeight: mode === m ? 600 : 500, boxShadow: mode === m ? "0 1px 2px rgba(0,0,0,.08)" : "none" }}>
            {m === "password" ? t("genPassword") : t("genPassphrase")}
          </button>
        ))}
      </div>

      <PasswordField value={current} readOnly onCopy={() => navigator.clipboard?.writeText(current)} />
      <EntropyMeter bits={mode === "password" ? bits : ppBits} />

      {mode === "password" ? (
        <>
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
        </>
      ) : (
        <>
          <label className="flex items-center gap-2 text-sm">
            {t("wordCount")}: {pp.words}
            <input type="range" min={3} max={10} value={pp.words}
              onChange={(e) => setPp({ ...pp, words: Number(e.target.value) })} className="flex-1" />
          </label>
          <div className="flex items-center gap-4 text-sm flex-wrap">
            <label className="flex items-center gap-1">
              {t("separator")}
              <select value={pp.separator} onChange={(e) => setPp({ ...pp, separator: e.target.value })}
                className="rounded-md px-1.5 py-0.5" style={{ background: "var(--fv-surface-2)", border: "1px solid var(--fv-border)", color: "var(--fv-text)" }}>
                {SEPARATORS.map((s) => <option key={s} value={s}>{s === " " ? "␣" : s}</option>)}
              </select>
            </label>
            <label className="flex items-center gap-1"><input type="checkbox" checked={pp.capitalize} onChange={(e) => setPp({ ...pp, capitalize: e.target.checked })} />{t("capitalize")}</label>
            <label className="flex items-center gap-1"><input type="checkbox" checked={pp.include_number} onChange={(e) => setPp({ ...pp, include_number: e.target.checked })} />{t("addNumber")}</label>
          </div>
        </>
      )}

      <div className="flex gap-2">
        <Button onClick={() => void (mode === "password" ? regenerate() : regenPp())}>{t("generate")}</Button>
        {onUse && current && <Button variant="ghost" onClick={() => onUse(current)}>{t("save")}</Button>}
      </div>
    </div>
  );
}
