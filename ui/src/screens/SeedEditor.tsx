import { useEffect, useState, type ClipboardEvent } from "react";
import type { EntrySummary } from "../types";
import { Button } from "../components/Button";
import { IconPicker } from "../components/IconPicker";
import { useT } from "../i18n/I18nContext";
import * as api from "../api";

const WORD_COUNTS = [12, 15, 18, 21, 24];
const NETWORKS = ["Bitcoin", "Ethereum", "Solana", "Cardano", "Polkadot", "BNB Chain", "Cosmos", "Other"];

function resize(words: string[], n: number): string[] {
  const next = words.slice(0, n);
  while (next.length < n) next.push("");
  return next;
}

export function SeedEditor({
  id,
  entry,
  onClose,
}: {
  id: string | null;
  entry?: EntrySummary;
  onClose: () => void;
}) {
  const t = useT();
  const [title, setTitle] = useState(entry?.title ?? "");
  const [network, setNetwork] = useState("Bitcoin");
  const [count, setCount] = useState(entry?.word_count && entry.word_count >= 12 ? entry.word_count : 12);
  const [words, setWords] = useState<string[]>(() => resize([], entry?.word_count || 12));
  const [derivationPath, setDerivationPath] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState(entry?.tags.join(", ") ?? "");
  const [icon, setIcon] = useState(entry?.icon ?? "");

  useEffect(() => {
    if (!id) return;
    api.getSeedSecret(id).then((s) => {
      const n = s.words.length >= 12 ? s.words.length : 12;
      setCount(n);
      setWords(resize(s.words, n));
      setNetwork(s.network || "Bitcoin");
      setDerivationPath(s.derivation_path);
      setPassphrase(s.passphrase);
      setNotes(s.notes);
    }).catch(() => {});
  }, [id]);

  const setWord = (i: number, v: string) => {
    setWords((w) => { const next = [...w]; next[i] = v; return next; });
  };

  const onPasteWord = (i: number, e: ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text").trim();
    const tokens = text.split(/[\s,;]+/).filter(Boolean);
    if (tokens.length <= 1) return; // single word: let default paste happen
    e.preventDefault();
    setWords((w) => {
      const next = [...w];
      for (let k = 0; k < tokens.length && i + k < next.length; k++) next[i + k] = tokens[k].toLowerCase();
      return next;
    });
  };

  const changeCount = (n: number) => { setCount(n); setWords((w) => resize(w, n)); };

  const filled = words.filter((w) => w.trim()).length;

  const save = async () => {
    const cleaned = words.map((w) => w.trim()).filter(Boolean);
    const tagArr = tags.split(",").map((s) => s.trim()).filter(Boolean);
    if (id) await api.updateSeedEntry(id, title, network, cleaned, derivationPath, passphrase, notes, tagArr, icon);
    else await api.addSeedEntry(title, network, cleaned, derivationPath, passphrase, notes, tagArr, icon);
    onClose();
  };

  const inputCls = "w-full px-3 py-2 rounded-lg border text-sm";
  const inputStyle = { background: "var(--fv-surface-2)", borderColor: "var(--fv-border)", color: "var(--fv-text)" } as const;
  const labelCls = "block text-xs uppercase tracking-wide mb-1";
  const labelStyle = { color: "var(--fv-faint)" } as const;

  return (
    <div className="flex flex-col max-h-[88vh]">
      <div className="px-5 py-4 border-b flex items-center gap-2" style={{ borderColor: "var(--fv-border)" }}>
        <span className="text-xl">🪙</span>
        <h2 className="text-lg font-semibold" style={{ color: "var(--fv-text)" }}>
          {id ? t("edit") : t("newSeedTitle")}
        </h2>
      </div>

      {/* warning */}
      <div className="mx-5 mt-4 px-3 py-2 rounded-lg text-xs flex items-start gap-2" style={{ background: "rgba(239,68,68,0.10)", color: "#ef4444" }}>
        <span>⚠️</span><span>{t("seedWarning")}</span>
      </div>

      <div className="px-5 py-4 space-y-3 overflow-auto">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls} style={labelStyle}>{t("walletName")}</label>
            <input autoFocus placeholder="Ledger, MetaMask…" value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} style={inputStyle} />
          </div>
          <div>
            <label className={labelCls} style={labelStyle}>{t("network")}</label>
            <input list="fv-networks" value={network} onChange={(e) => setNetwork(e.target.value)} className={inputCls} style={inputStyle} />
            <datalist id="fv-networks">{NETWORKS.map((n) => <option key={n} value={n} />)}</datalist>
          </div>
        </div>

        <div>
          <label className={labelCls} style={labelStyle}>{t("iconField")}</label>
          <IconPicker value={icon} onChange={setIcon} />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className={labelCls + " mb-0"} style={labelStyle}>{t("wordCount")} · {filled}/{count}</label>
            <div className="flex gap-1">
              {WORD_COUNTS.map((n) => (
                <button
                  key={n}
                  onClick={() => changeCount(n)}
                  className="fv-icon-btn px-2 py-0.5 rounded-md text-xs"
                  style={n === count ? { background: "var(--fv-violet)", color: "#fff" } : { background: "var(--fv-surface-2)", color: "var(--fv-muted)" }}
                >{n}</button>
              ))}
            </div>
          </div>
          <p className="text-xs mb-2" style={{ color: "var(--fv-faint)" }}>{t("pasteSeedHint")}</p>
          <div className="grid grid-cols-3 gap-2">
            {words.map((w, i) => (
              <div key={i} className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg border" style={inputStyle}>
                <span className="text-xs w-5 text-right shrink-0 font-mono" style={{ color: "var(--fv-faint)" }}>{i + 1}</span>
                <input
                  value={w}
                  onChange={(e) => setWord(i, e.target.value)}
                  onPaste={(e) => onPasteWord(i, e)}
                  className="w-full bg-transparent text-sm font-mono outline-none"
                  style={{ color: "var(--fv-text)" }}
                  autoComplete="off" autoCorrect="off" spellCheck={false}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls} style={labelStyle}>{t("derivationPath")}</label>
            <input placeholder="m/84'/0'/0'" value={derivationPath} onChange={(e) => setDerivationPath(e.target.value)} className={`${inputCls} font-mono`} style={inputStyle} />
          </div>
          <div>
            <label className={labelCls} style={labelStyle}>{t("passphraseField")}</label>
            <input value={passphrase} onChange={(e) => setPassphrase(e.target.value)} className={inputCls} style={inputStyle} />
          </div>
        </div>
        <div>
          <label className={labelCls} style={labelStyle}>{t("notes")}</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls} style={inputStyle} rows={2} />
        </div>
        <div>
          <label className={labelCls} style={labelStyle}>{t("tags")}</label>
          <input placeholder="cold, savings" value={tags} onChange={(e) => setTags(e.target.value)} className={inputCls} style={inputStyle} />
        </div>
      </div>

      <div className="flex items-center gap-2 px-5 py-4 border-t" style={{ borderColor: "var(--fv-border)" }}>
        <Button onClick={save} disabled={!title.trim() || filled === 0}>{t("save")}</Button>
        <Button variant="ghost" onClick={onClose}>{t("cancel")}</Button>
      </div>
    </div>
  );
}
