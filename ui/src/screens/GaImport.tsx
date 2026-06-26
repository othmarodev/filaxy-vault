import { useRef, useState } from "react";
import { Button } from "../components/Button";
import { useT } from "../i18n/I18nContext";
import { decodeQrFromFile } from "../lib/qr";
import * as api from "../api";

export function GaImport({ onDone }: { onDone: () => void }) {
  const t = useT();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pasted, setPasted] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [imported, setImported] = useState<number | null>(null);

  const importUris = async (uris: string[]) => {
    let total = 0;
    for (const uri of uris) {
      if (!uri.toLowerCase().startsWith("otpauth-migration://")) continue;
      try { total += await api.importGoogleAuthenticator(uri); } catch { /* skip bad ones */ }
    }
    return total;
  };

  const onFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setBusy(true); setMsg(null);
    const uris: string[] = [];
    for (const file of Array.from(files)) {
      const data = await decodeQrFromFile(file);
      if (data) uris.push(data);
    }
    const total = await importUris(uris);
    setBusy(false);
    if (total > 0) setImported(total);
    else setMsg(t("gaNoneFound"));
  };

  const onPasteImport = async () => {
    setBusy(true); setMsg(null);
    const uris = pasted.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
    const total = await importUris(uris);
    setBusy(false);
    if (total > 0) setImported(total);
    else setMsg(t("gaNoneFound"));
  };

  if (imported !== null) {
    return (
      <div className="p-8 text-center space-y-4">
        <div className="text-4xl">✅</div>
        <p className="text-lg font-semibold" style={{ color: "var(--fv-text)" }}>{imported} {t("gaImported")}</p>
        <p className="text-xs mx-auto max-w-sm" style={{ color: "var(--fv-faint)" }}>⚠️ {t("totpSecurityNote")}</p>
        <Button onClick={onDone}>{t("finish")}</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col max-h-[85vh]">
      <div className="px-5 py-4 border-b flex items-center gap-2" style={{ borderColor: "var(--fv-border)" }}>
        <span className="text-xl">📷</span>
        <h2 className="text-lg font-semibold" style={{ color: "var(--fv-text)" }}>{t("gaImport")}</h2>
      </div>

      <div className="px-5 py-4 space-y-4 overflow-auto">
        <p className="text-sm leading-relaxed" style={{ color: "var(--fv-muted)" }}>{t("gaInstructions")}</p>

        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => onFiles(e.target.files)} />
        <Button onClick={() => fileRef.current?.click()} disabled={busy} className="w-full !py-3">
          {busy ? "…" : `📷 ${t("gaUpload")}`}
        </Button>

        <div>
          <label className="block text-xs uppercase tracking-wide mb-1" style={{ color: "var(--fv-faint)" }}>{t("gaOrPaste")}</label>
          <textarea
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
            placeholder="otpauth-migration://offline?data=…"
            rows={3}
            className="w-full px-3 py-2 rounded-lg border text-xs font-mono"
            style={{ background: "var(--fv-surface-2)", borderColor: "var(--fv-border)", color: "var(--fv-text)" }}
          />
          {pasted.trim() && <Button variant="ghost" onClick={onPasteImport} disabled={busy} className="mt-2">{t("importTitle")}</Button>}
        </div>

        {msg && <p className="text-sm" style={{ color: "#ef4444" }}>{msg}</p>}

        <div className="px-3 py-2 rounded-lg text-xs flex items-start gap-2" style={{ background: "var(--fv-surface-2)", color: "var(--fv-muted)" }}>
          <span>⚠️</span><span>{t("totpSecurityNote")}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 px-5 py-4 border-t" style={{ borderColor: "var(--fv-border)" }}>
        <Button variant="ghost" onClick={onDone}>{t("cancel")}</Button>
      </div>
    </div>
  );
}
