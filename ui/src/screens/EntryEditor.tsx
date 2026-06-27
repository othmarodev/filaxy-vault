import { useEffect, useState } from "react";
import type { EntrySummary, CustomField } from "../types";
import { Button } from "../components/Button";
import { PasswordField } from "../components/PasswordField";
import { GeneratorPanel } from "./GeneratorPanel";
import { IconPicker } from "../components/IconPicker";
import { useT } from "../i18n/I18nContext";
import type { Dict } from "../i18n/en";
import * as api from "../api";

export type ItemKind = "login" | "note" | "card" | "identity";

function toDateInput(unix: number | null): string {
  if (!unix) return "";
  const d = new Date(unix * 1000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function fromDateInput(s: string): number | null {
  if (!s) return null;
  const ms = new Date(`${s}T23:59:59`).getTime();
  return Number.isNaN(ms) ? null : Math.floor(ms / 1000);
}

// Pre-seeded field templates for card / identity items (labels are i18n keys).
const TEMPLATES: Record<"card" | "identity", { key: keyof Dict; protected: boolean }[]> = {
  card: [
    { key: "fldCardholder", protected: false },
    { key: "fldCardNumber", protected: false },
    { key: "fldExpiry", protected: false },
    { key: "fldCvv", protected: true },
    { key: "fldPin", protected: true },
  ],
  identity: [
    { key: "fldFullName", protected: false },
    { key: "fldEmail", protected: false },
    { key: "fldPhone", protected: false },
    { key: "fldAddress", protected: false },
    { key: "fldDob", protected: false },
    { key: "fldIdNumber", protected: true },
  ],
};

export function EntryEditor({
  id,
  entry,
  kind = "login",
  onClose,
}: {
  id: string | null;
  entry?: EntrySummary;
  kind?: ItemKind;
  onClose: () => void;
}) {
  const t = useT();
  const isLogin = kind === "login";
  const [title, setTitle] = useState(entry?.title ?? "");
  const [username, setUsername] = useState(entry?.username ?? "");
  const [password, setPassword] = useState("");
  const [url, setUrl] = useState(entry?.url ?? "");
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState(entry?.tags.join(", ") ?? "");
  const [group, setGroup] = useState(entry?.group ?? "");
  const [totpSecret, setTotpSecret] = useState("");
  const [icon, setIcon] = useState(entry?.icon ?? "");
  const [expiresOn, setExpiresOn] = useState(toDateInput(entry?.expires_at ?? null));
  const [fields, setFields] = useState<CustomField[]>(
    !id && (kind === "card" || kind === "identity")
      ? TEMPLATES[kind].map((f) => ({ label: t(f.key), value: "", protected: f.protected }))
      : [],
  );
  const [showGen, setShowGen] = useState(false);

  useEffect(() => {
    if (!id) return;
    api.getEntrySecret(id).then((s) => { setPassword(s.password); setNotes(s.notes); setFields(s.custom_fields); }).catch(() => {});
  }, [id]);

  const setField = (i: number, patch: Partial<CustomField>) =>
    setFields((f) => f.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  const addField = () => setFields((f) => [...f, { label: "", value: "", protected: false }]);
  const removeField = (i: number) => setFields((f) => f.filter((_, idx) => idx !== i));

  const save = async () => {
    const tagArr = tags.split(",").map((s) => s.trim()).filter(Boolean);
    const totp = isLogin ? (totpSecret.trim() || undefined) : undefined;
    const grp = group.trim();
    const cf = fields.filter((f) => f.label.trim() || f.value.trim());
    const exp = isLogin ? fromDateInput(expiresOn) : null;
    if (id) await api.updateEntry(id, title, isLogin ? username : "", isLogin ? password : "", isLogin ? url : "", notes, tagArr, totp, grp, cf, exp, icon);
    else await api.addEntry(title, isLogin ? username : "", isLogin ? password : "", isLogin ? url : "", notes, tagArr, totp, grp, cf, exp, icon, kind);
    onClose();
  };

  const typeLabel = kind === "note" ? t("itemNote") : kind === "card" ? t("itemCard") : kind === "identity" ? t("itemIdentity") : t("newEntry");
  const titlePlaceholder = kind === "card" ? "Visa ••1234" : kind === "identity" ? "Passport" : kind === "note" ? "Wi-Fi, recovery codes…" : "Gmail, GitHub…";

  const inputCls = "w-full px-3 py-2 rounded-lg border text-sm transition-shadow";
  const inputStyle = { background: "var(--fv-surface-2)", borderColor: "var(--fv-border)", color: "var(--fv-text)" } as const;
  const labelCls = "block text-xs uppercase tracking-wide mb-1";
  const labelStyle = { color: "var(--fv-faint)" } as const;

  return (
    <div className="flex flex-col max-h-[85vh]">
      <div className="px-5 py-4 border-b" style={{ borderColor: "var(--fv-border)" }}>
        <h2 className="text-lg font-semibold" style={{ color: "var(--fv-text)" }}>
          {id ? t("edit") : `+ ${typeLabel}`}
        </h2>
      </div>

      <div className="px-5 py-4 space-y-3 overflow-auto">
        <div>
          <label className={labelCls} style={labelStyle}>{t("titleField")}</label>
          <input autoFocus placeholder={titlePlaceholder} value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} style={inputStyle} />
        </div>

        {/* icon picker */}
        <div>
          <label className={labelCls} style={labelStyle}>{t("iconField")}</label>
          <IconPicker value={icon} onChange={setIcon} />
        </div>

        {isLogin && (
          <>
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls} style={labelStyle}>TOTP (base32)</label>
                <input placeholder={t("empty")} value={totpSecret} onChange={(e) => setTotpSecret(e.target.value)} className={`${inputCls} font-mono`} style={inputStyle} />
              </div>
              <div>
                <label className={labelCls} style={labelStyle}>{t("expiration")}</label>
                <input type="date" value={expiresOn} onChange={(e) => setExpiresOn(e.target.value)} className={inputCls} style={inputStyle} />
              </div>
            </div>
          </>
        )}

        <div>
          <label className={labelCls} style={labelStyle}>{t("notes")}</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls} style={inputStyle} rows={kind === "note" ? 8 : 3} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls} style={labelStyle}>{t("tags")}</label>
            <input placeholder="dev, personal" value={tags} onChange={(e) => setTags(e.target.value)} className={inputCls} style={inputStyle} />
          </div>
          <div>
            <label className={labelCls} style={labelStyle}>{t("folder")}</label>
            <input placeholder="Work, Banking…" value={group} onChange={(e) => setGroup(e.target.value)} className={inputCls} style={inputStyle} />
          </div>
        </div>

        {/* custom fields */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className={labelCls + " mb-0"} style={labelStyle}>{t("customFields")}</label>
            <button onClick={addField} className="fv-btn text-xs font-medium rounded-md px-2 py-1" style={{ color: "var(--fv-violet)" }}>+ {t("addField")}</button>
          </div>
          <div className="space-y-2">
            {fields.map((f, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <input placeholder={t("fieldLabel")} value={f.label} onChange={(e) => setField(i, { label: e.target.value })} className={`${inputCls} flex-1`} style={inputStyle} />
                <input placeholder={t("fieldValue")} type={f.protected ? "password" : "text"} value={f.value} onChange={(e) => setField(i, { value: e.target.value })} className={`${inputCls} flex-1`} style={inputStyle} />
                <button onClick={() => setField(i, { protected: !f.protected })} title="protect" className="fv-icon-btn grid place-items-center w-8 h-8 rounded-lg shrink-0" style={{ color: f.protected ? "var(--fv-violet)" : "var(--fv-faint)" }}>{f.protected ? "🔒" : "🔓"}</button>
                <button onClick={() => removeField(i)} className="fv-icon-btn grid place-items-center w-8 h-8 rounded-lg shrink-0 hover:bg-red-500/10" style={{ color: "#ef4444" }}>✕</button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 px-5 py-4 border-t" style={{ borderColor: "var(--fv-border)" }}>
        <Button onClick={save} disabled={!title.trim()}>{t("save")}</Button>
        <Button variant="ghost" onClick={onClose}>{t("cancel")}</Button>
      </div>
    </div>
  );
}
