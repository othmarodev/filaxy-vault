import { useState } from "react";
import type { ImportPreview, Mapping } from "../types";
import { Button } from "../components/Button";
import { useT } from "../i18n/I18nContext";
import * as api from "../api";
import { open } from "@tauri-apps/plugin-dialog";

export function ImportWizard({ onDone }: { onDone: () => void }) {
  const t = useT();
  const [path, setPath] = useState("");
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [map, setMap] = useState<Mapping>({});
  const [count, setCount] = useState<number | null>(null);

  const pick = async () => {
    const sel = await open({ multiple: false, filters: [{ name: "Passwords", extensions: ["csv", "xlsx"] }] });
    if (typeof sel === "string") {
      setPath(sel);
      const pv = await api.importPreview(sel);
      setPreview(pv);
      // naive prefill: match common header names
      const h = pv.headers;
      const find = (...names: string[]) => h.find((x) => names.includes(x.toLowerCase()));
      setMap({
        title: find("name", "title", "account"),
        username: find("username", "login", "login_username", "login name"),
        password: find("password", "login_password"),
        url: find("url", "site", "login_uri", "web site"),
        notes: find("notes", "extra", "comments"),
      });
    }
  };

  const commit = async () => { const n = await api.importCommit(path, map); setCount(n); };

  if (count !== null) {
    return (
      <div className="max-w-lg mx-auto p-6 space-y-4 text-center">
        <p className="text-lg">✅ {count}</p>
        <p className="text-sm" style={{ color: "var(--fv-muted)" }}>
          {t("importTitle")} — remember to delete the original plaintext file.
        </p>
        <Button onClick={onDone}>{t("finish")}</Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-3">
      <h2 className="text-xl font-semibold">{t("importTitle")}</h2>
      {!preview ? (
        <Button onClick={pick}>{t("next")}</Button>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {(["title", "username", "password", "url", "notes"] as const).map((field) => (
              <label key={field} className="flex flex-col gap-1">
                <span style={{ color: "var(--fv-muted)" }}>{field}</span>
                <select value={map[field] ?? ""} onChange={(e) => setMap({ ...map, [field]: e.target.value || undefined })}
                  className="px-2 py-1 rounded border bg-transparent" style={{ borderColor: "var(--fv-border)" }}>
                  <option value="">—</option>
                  {preview.headers.map((h) => <option key={h} value={h}>{h}</option>)}
                </select>
              </label>
            ))}
          </div>
          <div className="text-xs" style={{ color: "var(--fv-muted)" }}>{preview.rows.length} rows · {preview.detected_preset ?? "?"}</div>
          <div className="flex gap-2">
            <Button onClick={commit}>{t("finish")}</Button>
            <Button variant="ghost" onClick={onDone}>{t("cancel")}</Button>
          </div>
        </>
      )}
    </div>
  );
}
