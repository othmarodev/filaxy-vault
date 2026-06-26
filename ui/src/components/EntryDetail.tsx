import { useEffect, useState, type ReactNode } from "react";
import type { EntrySummary, EntrySecret } from "../types";
import { useT } from "../i18n/I18nContext";
import { Avatar } from "./Avatar";
import { Button } from "./Button";
import * as api from "../api";

function Field({
  label,
  value,
  mono,
  onCopy,
  trailing,
}: {
  label: string;
  value: string;
  mono?: boolean;
  onCopy?: () => void;
  trailing?: ReactNode;
}) {
  if (!value) return null;
  return (
    <div className="group flex items-start justify-between gap-3 py-3 border-b" style={{ borderColor: "var(--fv-border)" }}>
      <div className="min-w-0">
        <div className="text-xs uppercase tracking-wide mb-0.5" style={{ color: "var(--fv-faint)" }}>{label}</div>
        <div className={`break-all ${mono ? "font-mono text-sm" : ""}`} style={{ color: "var(--fv-text)" }}>{value}</div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {trailing}
        {onCopy && (
          <button
            onClick={onCopy}
            className="fv-icon-btn opacity-0 group-hover:opacity-100 rounded-md px-2 py-1 text-xs hover:bg-black/5 dark:hover:bg-white/10"
            style={{ color: "var(--fv-muted)" }}
          >
            ⧉
          </button>
        )}
      </div>
    </div>
  );
}

export function EntryDetail({
  entry,
  onEdit,
  onDelete,
}: {
  entry: EntrySummary;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const t = useT();
  const [secret, setSecret] = useState<EntrySecret | null>(null);
  const [show, setShow] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    setSecret(null);
    setShow(false);
    api.getEntrySecret(entry.id).then(setSecret).catch(() => {});
  }, [entry.id]);

  const flashMsg = (m: string) => {
    setFlash(m);
    setTimeout(() => setFlash(null), 1400);
  };
  const copyPw = async () => { await api.copySecret(entry.id); flashMsg(t("copied")); };
  const copyText = async (v: string) => { try { await navigator.clipboard.writeText(v); flashMsg(t("copied")); } catch { /* ignore */ } };

  return (
    <div className="fv-fade-in h-full flex flex-col">
      {/* header */}
      <div className="flex items-center gap-3 p-5 border-b" style={{ borderColor: "var(--fv-border)" }}>
        <Avatar label={entry.title || entry.url || entry.username} size={48} icon={entry.icon || undefined} />
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold truncate" style={{ color: "var(--fv-text)" }}>
            {entry.title || entry.url || entry.username || t("empty")}
          </h2>
          {entry.url && <div className="text-sm truncate" style={{ color: "var(--fv-muted)" }}>{entry.url}</div>}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={onEdit}>{t("edit")}</Button>
        </div>
      </div>

      {/* body */}
      <div className="flex-1 overflow-auto px-5">
        <Field label={t("username")} value={entry.username} onCopy={entry.username ? () => copyText(entry.username) : undefined} />
        <Field
          label={t("password")}
          value={secret ? (show ? secret.password : "••••••••••••") : "••••••••"}
          mono
          onCopy={copyPw}
          trailing={
            <button
              onClick={() => setShow((s) => !s)}
              className="rounded-md px-2 py-1 text-xs hover:bg-black/5 dark:hover:bg-white/10"
              style={{ color: "var(--fv-muted)" }}
            >
              {show ? t("hide") : t("reveal")}
            </button>
          }
        />
        {secret?.totp_code && (
          <Field label="TOTP" value={secret.totp_code} mono onCopy={() => copyText(secret.totp_code!)} />
        )}
        <Field label={t("url")} value={entry.url} onCopy={entry.url ? () => copyText(entry.url) : undefined} />
        {/* custom fields */}
        {secret?.custom_fields.map((f, i) => (
          <Field
            key={i}
            label={f.label || t("fieldValue")}
            value={f.protected ? (show ? f.value : "••••••••") : f.value}
            mono={f.protected}
            onCopy={f.value ? () => copyText(f.value) : undefined}
          />
        ))}
        {entry.expires_at && (
          <div className="flex items-center justify-between gap-3 py-3 border-b" style={{ borderColor: "var(--fv-border)" }}>
            <div>
              <div className="text-xs uppercase tracking-wide mb-0.5" style={{ color: "var(--fv-faint)" }}>{t("expiration")}</div>
              <div style={{ color: "var(--fv-text)" }}>{new Date(entry.expires_at * 1000).toLocaleDateString()}</div>
            </div>
            {entry.expires_at * 1000 < Date.now() && (
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: "rgba(239,68,68,0.12)", color: "#ef4444" }}>{t("expired")}</span>
            )}
          </div>
        )}
        <Field label={t("notes")} value={secret?.notes || ""} />
        {entry.tags.length > 0 && (
          <div className="py-3">
            <div className="text-xs uppercase tracking-wide mb-1.5" style={{ color: "var(--fv-faint)" }}>{t("tags")}</div>
            <div className="flex flex-wrap gap-1.5">
              {entry.tags.map((tg) => (
                <span key={tg} className="fv-tag inline-block px-2 py-0.5 rounded-full text-xs cursor-default" style={{ background: "var(--fv-surface-2)", color: "var(--fv-muted)" }}>{tg}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* footer */}
      <div className="flex items-center justify-between p-4 border-t" style={{ borderColor: "var(--fv-border)" }}>
        <span className="text-xs h-4" style={{ color: "var(--fv-sky)" }}>{flash}</span>
        <button
          onClick={onDelete}
          className="fv-btn rounded-lg px-3 py-1.5 text-sm hover:bg-red-500/10"
          style={{ color: "#ef4444" }}
        >
          {t("delete")}
        </button>
      </div>
    </div>
  );
}
