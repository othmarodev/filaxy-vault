import { useEffect, useState } from "react";
import type { EntrySummary, SeedSecret } from "../types";
import { useT } from "../i18n/I18nContext";
import { Avatar } from "./Avatar";
import { Button } from "./Button";
import * as api from "../api";

export function SeedDetail({
  entry,
  onEdit,
  onDelete,
}: {
  entry: EntrySummary;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const t = useT();
  const [seed, setSeed] = useState<SeedSecret | null>(null);
  const [show, setShow] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    setSeed(null);
    setShow(false);
    api.getSeedSecret(entry.id).then(setSeed).catch(() => {});
  }, [entry.id]);

  const copyWord = async (w: string) => {
    try { await navigator.clipboard.writeText(w); setFlash(t("copied")); setTimeout(() => setFlash(null), 1200); } catch { /* ignore */ }
  };

  return (
    <div className="fv-fade-in h-full flex flex-col">
      {/* header */}
      <div className="flex items-center gap-3 p-5 border-b" style={{ borderColor: "var(--fv-border)" }}>
        <Avatar label={`🪙 ${entry.title}`} size={48} />
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold truncate" style={{ color: "var(--fv-text)" }}>
            {entry.title || t("seedPhrase")}
          </h2>
          <div className="text-sm truncate" style={{ color: "var(--fv-muted)" }}>
            🪙 {seed?.network || t("seedPhrase")} · {entry.word_count} {t("wordCount").toLowerCase()}
          </div>
        </div>
        <Button variant="ghost" onClick={onEdit}>{t("edit")}</Button>
      </div>

      {/* warning */}
      <div className="mx-5 mt-4 px-3 py-2 rounded-lg text-xs flex items-start gap-2" style={{ background: "rgba(239,68,68,0.10)", color: "#ef4444" }}>
        <span>⚠️</span><span>{t("seedWarning")}</span>
      </div>

      <div className="flex-1 overflow-auto px-5 py-4 space-y-4">
        {/* the phrase */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase tracking-wide" style={{ color: "var(--fv-faint)" }}>{t("seedPhrase")}</span>
            <button
              onClick={() => setShow((s) => !s)}
              className="fv-btn rounded-lg px-3 py-1 text-xs font-medium"
              style={{ background: "var(--fv-surface-2)", color: "var(--fv-violet)" }}
            >
              {show ? `🙈 ${t("hideSeed")}` : `👁 ${t("revealSeed")}`}
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2" style={{ filter: show ? "none" : "blur(7px)", transition: "filter .2s ease" }}>
            {(seed?.words ?? []).map((w, i) => (
              <button
                key={i}
                onClick={() => show && copyWord(w)}
                disabled={!show}
                className="fv-row flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-left"
                style={{ background: "var(--fv-surface-2)", borderColor: "var(--fv-border)" }}
                title={show ? t("copy") : ""}
              >
                <span className="text-xs w-5 text-right shrink-0 font-mono" style={{ color: "var(--fv-faint)" }}>{i + 1}</span>
                <span className="text-sm font-mono truncate" style={{ color: "var(--fv-text)" }}>{w}</span>
              </button>
            ))}
          </div>
        </div>

        {/* meta */}
        {seed?.derivation_path && (
          <Meta label={t("derivationPath")} value={seed.derivation_path} mono />
        )}
        {seed?.passphrase && <Meta label={t("passphraseField")} value={show ? seed.passphrase : "••••••••"} mono />}
        {seed?.notes && <Meta label={t("notes")} value={seed.notes} />}
        {entry.tags.length > 0 && (
          <div>
            <div className="text-xs uppercase tracking-wide mb-1.5" style={{ color: "var(--fv-faint)" }}>{t("tags")}</div>
            <div className="flex flex-wrap gap-1.5">
              {entry.tags.map((tg) => (
                <span key={tg} className="fv-tag inline-block px-2 py-0.5 rounded-full text-xs cursor-default" style={{ background: "var(--fv-surface-2)", color: "var(--fv-muted)" }}>{tg}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between p-4 border-t" style={{ borderColor: "var(--fv-border)" }}>
        <span className="text-xs h-4" style={{ color: "var(--fv-sky)" }}>{flash}</span>
        <button onClick={onDelete} className="fv-btn rounded-lg px-3 py-1.5 text-sm hover:bg-red-500/10" style={{ color: "#ef4444" }}>
          {t("delete")}
        </button>
      </div>
    </div>
  );
}

function Meta({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="py-2 border-t" style={{ borderColor: "var(--fv-border)" }}>
      <div className="text-xs uppercase tracking-wide mb-0.5" style={{ color: "var(--fv-faint)" }}>{label}</div>
      <div className={`break-all ${mono ? "font-mono text-sm" : ""}`} style={{ color: "var(--fv-text)" }}>{value}</div>
    </div>
  );
}
