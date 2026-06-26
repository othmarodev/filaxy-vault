import { useEffect, useRef, useState } from "react";
import type { AttachmentInfo } from "../types";
import { useT } from "../i18n/I18nContext";
import { ConfirmDialog } from "./ConfirmDialog";
import * as api from "../api";

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const s = String(r.result);
      const i = s.indexOf("base64,");
      resolve(i >= 0 ? s.slice(i + 7) : "");
    };
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

function fmtSize(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function Attachments({ entryId }: { entryId: string }) {
  const t = useT();
  const [items, setItems] = useState<AttachmentInfo[]>([]);
  const [busy, setBusy] = useState(false);
  const [removeIdx, setRemoveIdx] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = () => api.listAttachments(entryId).then(setItems).catch(() => {});
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [entryId]);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      const b64 = await fileToBase64(file);
      await api.addAttachment(entryId, file.name, b64);
      await load();
    } catch { /* ignore */ }
    setBusy(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const download = async (index: number, name: string) => {
    try {
      const b64 = await api.getAttachment(entryId, index);
      const a = document.createElement("a");
      a.href = `data:application/octet-stream;base64,${b64}`;
      a.download = name;
      a.click();
    } catch { /* ignore */ }
  };

  const doRemove = async () => {
    if (removeIdx === null) return;
    try { await api.removeAttachment(entryId, removeIdx); await load(); } catch { /* ignore */ }
    setRemoveIdx(null);
  };

  return (
    <div className="py-3 border-t" style={{ borderColor: "var(--fv-border)" }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs uppercase tracking-wide" style={{ color: "var(--fv-faint)" }}>{t("attachments")}</span>
        <input ref={fileRef} type="file" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
        <button onClick={() => fileRef.current?.click()} disabled={busy} className="fv-btn rounded-lg px-3 py-1 text-xs font-medium" style={{ background: "var(--fv-surface-2)", color: "var(--fv-violet)" }}>
          {busy ? "…" : `📎 ${t("addFile")}`}
        </button>
      </div>
      <div className="space-y-1.5">
        {items.map((a, i) => (
          <div key={i} className="fv-row group flex items-center gap-2 px-2.5 py-1.5 rounded-lg" style={{ background: "var(--fv-surface-2)" }}>
            <span className="text-base">📄</span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm" style={{ color: "var(--fv-text)" }}>{a.name}</div>
              <div className="text-xs" style={{ color: "var(--fv-faint)" }}>{fmtSize(a.size)}</div>
            </div>
            <button onClick={() => download(i, a.name)} title={t("download")} className="fv-icon-btn grid place-items-center w-7 h-7 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10" style={{ color: "var(--fv-muted)" }}>⬇</button>
            <button onClick={() => setRemoveIdx(i)} title={t("removeIcon")} className="fv-icon-btn grid place-items-center w-7 h-7 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-500/10" style={{ color: "#ef4444" }}>✕</button>
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={removeIdx !== null}
        message={t("confirmRemoveAttachment")}
        confirmLabel={t("removeIcon")}
        onConfirm={doRemove}
        onCancel={() => setRemoveIdx(null)}
      />
    </div>
  );
}
