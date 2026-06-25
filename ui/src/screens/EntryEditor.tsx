import { useEffect, useState } from "react";
import type { EntrySummary } from "../types";
import { Button } from "../components/Button";
import { PasswordField } from "../components/PasswordField";
import { GeneratorPanel } from "./GeneratorPanel";
import { useT } from "../i18n/I18nContext";
import * as api from "../api";

export function EntryEditor({
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
  const [username, setUsername] = useState(entry?.username ?? "");
  const [password, setPassword] = useState("");
  const [url, setUrl] = useState(entry?.url ?? "");
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState(entry?.tags.join(", ") ?? "");
  const [totpSecret, setTotpSecret] = useState("");
  const [showGen, setShowGen] = useState(false);

  useEffect(() => {
    if (!id) return;
    // secret fields (password/notes) are fetched on demand; summary fields come via props
    api.getEntrySecret(id).then((s) => { setPassword(s.password); setNotes(s.notes); }).catch(() => {});
  }, [id]);

  const save = async () => {
    const tagArr = tags.split(",").map((s) => s.trim()).filter(Boolean);
    const totp = totpSecret.trim() || undefined;
    if (id) await api.updateEntry(id, title, username, password, url, notes, tagArr, totp);
    else await api.addEntry(title, username, password, url, notes, tagArr, totp);
    onClose();
  };

  const inputCls = "w-full px-3 py-2 rounded-lg border text-sm transition-shadow";
  const inputStyle = { background: "var(--fv-surface-2)", borderColor: "var(--fv-border)", color: "var(--fv-text)" } as const;
  const labelCls = "block text-xs uppercase tracking-wide mb-1";
  const labelStyle = { color: "var(--fv-faint)" } as const;

  return (
    <div className="flex flex-col max-h-[85vh]">
      <div className="px-5 py-4 border-b" style={{ borderColor: "var(--fv-border)" }}>
        <h2 className="text-lg font-semibold" style={{ color: "var(--fv-text)" }}>
          {id ? t("edit") : `+ ${t("newEntry")}`}
        </h2>
      </div>

      <div className="px-5 py-4 space-y-3 overflow-auto">
        <div>
          <label className={labelCls} style={labelStyle}>{t("titleField")}</label>
          <input autoFocus placeholder="Gmail, GitHub…" value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} style={inputStyle} />
        </div>
        <div>
          <label className={labelCls} style={labelStyle}>{t("username")}</label>
          <input value={username} onChange={(e) => setUsername(e.target.value)} className={inputCls} style={inputStyle} />
        </div>
        <div>
          <label className={labelCls} style={labelStyle}>{t("password")}</label>
          <PasswordField value={password} onChange={setPassword} />
          <button className="mt-1.5 text-xs font-medium" style={{ color: "var(--fv-violet)" }} onClick={() => setShowGen((s) => !s)}>
            ✦ {t("generate")}
          </button>
          {showGen && <div className="mt-2"><GeneratorPanel onUse={(pw) => { setPassword(pw); setShowGen(false); }} /></div>}
        </div>
        <div>
          <label className={labelCls} style={labelStyle}>{t("url")}</label>
          <input value={url} onChange={(e) => setUrl(e.target.value)} className={inputCls} style={inputStyle} />
        </div>
        <div>
          <label className={labelCls} style={labelStyle}>TOTP (base32)</label>
          <input placeholder={t("empty")} value={totpSecret} onChange={(e) => setTotpSecret(e.target.value)} className={`${inputCls} font-mono`} style={inputStyle} />
        </div>
        <div>
          <label className={labelCls} style={labelStyle}>{t("notes")}</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls} style={inputStyle} rows={3} />
        </div>
        <div>
          <label className={labelCls} style={labelStyle}>{t("tags")}</label>
          <input placeholder="dev, personal" value={tags} onChange={(e) => setTags(e.target.value)} className={inputCls} style={inputStyle} />
        </div>
      </div>

      <div className="flex items-center gap-2 px-5 py-4 border-t" style={{ borderColor: "var(--fv-border)" }}>
        <Button onClick={save} disabled={!title.trim()}>{t("save")}</Button>
        <Button variant="ghost" onClick={onClose}>{t("cancel")}</Button>
      </div>
    </div>
  );
}
