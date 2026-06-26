import { useEffect, useRef, useState } from "react";
import type { EntrySummary } from "../types";
import { useT } from "../i18n/I18nContext";
import { Avatar } from "./Avatar";
import { Button } from "./Button";
import * as api from "../api";

const R = 26;
const CIRC = 2 * Math.PI * R;

function nowSec() {
  return Math.floor(Date.now() / 1000);
}

export function TotpDetail({
  entry,
  onEdit,
  onDelete,
}: {
  entry: EntrySummary;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const t = useT();
  const period = entry.totp_period || 30;
  const digits = entry.totp_digits || 6;
  const [code, setCode] = useState("-".repeat(digits));
  const [remaining, setRemaining] = useState(period);
  const [secret, setSecret] = useState<string | null>(null);
  const [showSecret, setShowSecret] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const windowRef = useRef(-1);

  useEffect(() => {
    setSecret(null);
    setShowSecret(false);
    windowRef.current = -1;
    const tick = () => {
      const s = nowSec();
      setRemaining(period - (s % period));
      const win = Math.floor(s / period);
      if (win !== windowRef.current) {
        windowRef.current = win;
        api.totpCodeFor(entry.id).then(setCode).catch(() => setCode("-".repeat(digits)));
      }
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [entry.id, period, digits]);

  const copyCode = async () => {
    try { await navigator.clipboard.writeText(code); setFlash(t("copied")); setTimeout(() => setFlash(null), 1200); } catch { /* ignore */ }
  };
  const revealSecret = async () => {
    if (!secret) { try { setSecret(await api.getTotpSecret(entry.id)); } catch { /* ignore */ } }
    setShowSecret((s) => !s);
  };

  const pretty =
    code.length === 8 ? `${code.slice(0, 4)} ${code.slice(4)}`
    : code.length === 6 ? `${code.slice(0, 3)} ${code.slice(3)}`
    : code;
  const ringColor = remaining <= 5 ? "#ef4444" : "var(--fv-violet)";

  return (
    <div className="fv-fade-in h-full flex flex-col">
      <div className="flex items-center gap-3 p-5 border-b" style={{ borderColor: "var(--fv-border)" }}>
        <Avatar label={`⏱ ${entry.title}`} size={48} icon={entry.icon || undefined} />
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold truncate" style={{ color: "var(--fv-text)" }}>{entry.title || "2FA"}</h2>
          <div className="text-sm truncate" style={{ color: "var(--fv-muted)" }}>{entry.username || "—"}</div>
        </div>
        <Button variant="ghost" onClick={onEdit}>{t("edit")}</Button>
      </div>

      <div className="flex-1 overflow-auto px-5 py-6">
        {/* live code + ring */}
        <div className="flex items-center justify-center gap-6 py-6">
          <button onClick={copyCode} className="fv-btn text-4xl font-mono font-semibold tracking-[0.15em]" style={{ color: "var(--fv-text)" }} title={t("copy")}>
            {pretty}
          </button>
          <div className="relative" style={{ width: 64, height: 64 }}>
            <svg width="64" height="64" viewBox="0 0 64 64" style={{ transform: "rotate(-90deg)" }}>
              <circle cx="32" cy="32" r={R} fill="none" stroke="var(--fv-border)" strokeWidth="5" />
              <circle
                cx="32" cy="32" r={R} fill="none" stroke={ringColor} strokeWidth="5" strokeLinecap="round"
                strokeDasharray={CIRC}
                strokeDashoffset={CIRC * (1 - remaining / period)}
                style={{ transition: "stroke-dashoffset 1s linear, stroke .3s ease" }}
              />
            </svg>
            <span className="absolute inset-0 grid place-items-center text-sm font-mono" style={{ color: "var(--fv-muted)" }}>{remaining}</span>
          </div>
        </div>

        <div className="flex justify-center gap-2 mb-6">
          <Button onClick={copyCode}>📋 {t("copy")}</Button>
        </div>

        {/* backup key */}
        <div className="border-t pt-4" style={{ borderColor: "var(--fv-border)" }}>
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wide" style={{ color: "var(--fv-faint)" }}>{t("backupKey")}</span>
            <button onClick={revealSecret} className="fv-btn rounded-lg px-3 py-1 text-xs font-medium" style={{ background: "var(--fv-surface-2)", color: "var(--fv-violet)" }}>
              {showSecret ? `🙈 ${t("hide")}` : `👁 ${t("reveal")}`}
            </button>
          </div>
          <div className="mt-2 font-mono text-sm break-all" style={{ color: "var(--fv-text)", filter: showSecret ? "none" : "blur(6px)", transition: "filter .2s ease" }}>
            {secret ?? "••••••••••••••••"}
          </div>
        </div>

        {entry.tags.length > 0 && (
          <div className="mt-4">
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
        <button onClick={onDelete} className="fv-btn rounded-lg px-3 py-1.5 text-sm hover:bg-red-500/10" style={{ color: "#ef4444" }}>{t("delete")}</button>
      </div>
    </div>
  );
}
