import { useEffect, useState } from "react";
import type { EntrySummary } from "../types";
import { Button } from "../components/Button";
import { useT } from "../i18n/I18nContext";
import * as api from "../api";

export function VaultList({
  onOpenEntry, onAdd, onImport, onSettings, reloadKey,
}: { onOpenEntry: (id: string) => void; onAdd: () => void; onImport: () => void; onSettings: () => void; reloadKey: number }) {
  const t = useT();
  const [q, setQ] = useState("");
  const [items, setItems] = useState<EntrySummary[]>([]);

  useEffect(() => {
    const run = () => (q ? api.searchEntries(q) : api.listEntries()).then(setItems).catch(() => {});
    const id = setTimeout(run, 150);
    return () => clearTimeout(id);
  }, [q, reloadKey]);

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-3">
      <div className="flex gap-2">
        <input placeholder={t("search")} value={q} onChange={(e) => setQ(e.target.value)}
          className="flex-1 px-3 py-2 rounded-lg border bg-transparent" style={{ borderColor: "var(--fv-border)" }} />
        <Button onClick={onAdd}>{t("add")}</Button>
        <Button variant="ghost" onClick={onImport}>{t("importTitle")}</Button>
        <Button variant="ghost" onClick={onSettings}>{t("settings")}</Button>
      </div>
      <ul className="space-y-2">
        {items.map((e) => (
          <li key={e.id}>
            <button onClick={() => onOpenEntry(e.id)}
              className="w-full text-left px-4 py-3 rounded-xl border hover:brightness-105 transition"
              style={{ borderColor: "var(--fv-border)", background: "var(--fv-surface)" }}>
              <div className="font-medium">{e.title || e.url || e.username}</div>
              <div className="text-sm" style={{ color: "var(--fv-muted)" }}>{e.username}{e.has_totp ? " · TOTP" : ""}</div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
