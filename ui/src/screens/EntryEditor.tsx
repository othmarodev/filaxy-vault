import { useEffect, useState } from "react";
import { Button } from "../components/Button";
import { PasswordField } from "../components/PasswordField";
import { GeneratorPanel } from "./GeneratorPanel";
import { useT } from "../i18n/I18nContext";
import * as api from "../api";

export function EntryEditor({ id, onClose }: { id: string | null; onClose: () => void }) {
  const t = useT();
  const [title, setTitle] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [url, setUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState("");
  const [showGen, setShowGen] = useState(false);

  useEffect(() => {
    if (!id) return;
    // summary fields come from the list; secret fields fetched on demand
    api.getEntrySecret(id).then((s) => { setPassword(s.password); setNotes(s.notes); }).catch(() => {});
  }, [id]);

  const save = async () => {
    const tagArr = tags.split(",").map((s) => s.trim()).filter(Boolean);
    if (id) await api.updateEntry(id, title, username, password, url, notes, tagArr);
    else await api.addEntry(title, username, password, url, notes, tagArr);
    onClose();
  };
  const remove = async () => { if (id) { await api.deleteEntry(id); onClose(); } };

  const inputCls = "w-full px-3 py-2 rounded-lg border bg-transparent";
  const inputStyle = { borderColor: "var(--fv-border)" } as const;

  return (
    <div className="max-w-xl mx-auto p-4 space-y-3">
      <input placeholder={t("appName")} value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} style={inputStyle} />
      <input placeholder={t("username")} value={username} onChange={(e) => setUsername(e.target.value)} className={inputCls} style={inputStyle} />
      <PasswordField value={password} onChange={setPassword} onCopy={id ? () => void api.copySecret(id) : undefined} />
      <button className="text-sm underline" style={{ color: "var(--fv-muted)" }} onClick={() => setShowGen((s) => !s)}>{t("generate")}</button>
      {showGen && <GeneratorPanel onUse={(pw) => { setPassword(pw); setShowGen(false); }} />}
      <input placeholder={t("url")} value={url} onChange={(e) => setUrl(e.target.value)} className={inputCls} style={inputStyle} />
      <textarea placeholder={t("notes")} value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls} style={inputStyle} rows={3} />
      <input placeholder={t("tags")} value={tags} onChange={(e) => setTags(e.target.value)} className={inputCls} style={inputStyle} />
      <div className="flex gap-2">
        <Button onClick={save}>{t("save")}</Button>
        <Button variant="ghost" onClick={onClose}>{t("cancel")}</Button>
        {id && <Button variant="ghost" onClick={remove} className="ml-auto" style={{ color: "#ef4444" }}>{t("delete")}</Button>}
      </div>
    </div>
  );
}
