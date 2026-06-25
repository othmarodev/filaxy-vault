import { useEffect, useMemo, useState } from "react";
import type { EntrySummary } from "../types";
import { useT } from "../i18n/I18nContext";
import { Avatar } from "../components/Avatar";
import { Button } from "../components/Button";
import { Modal } from "../components/Modal";
import { EntryDetail } from "../components/EntryDetail";
import { EntryEditor } from "./EntryEditor";
import { ImportWizard } from "./ImportWizard";
import { SettingsScreen } from "./SettingsScreen";
import * as api from "../api";

type Filter = { kind: "all" | "tag"; tag?: string };

function NavItem({
  label,
  icon,
  active,
  soon,
  onClick,
}: {
  label: string;
  icon: string;
  active?: boolean;
  soon?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={soon}
      className="fv-row w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-left disabled:opacity-50 disabled:hover:translate-x-0"
      style={{
        background: active ? "var(--fv-hover)" : "transparent",
        color: active ? "var(--fv-text)" : "var(--fv-muted)",
        fontWeight: active ? 600 : 500,
      }}
      onMouseEnter={(e) => { if (!active && !soon) e.currentTarget.style.background = "var(--fv-hover)"; }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
    >
      <span className="w-5 text-center">{icon}</span>
      <span className="flex-1 truncate">{label}</span>
      {soon && <span className="text-[10px] uppercase px-1.5 py-0.5 rounded-full" style={{ background: "var(--fv-surface-2)", color: "var(--fv-faint)" }}>soon</span>}
    </button>
  );
}

export function VaultWorkspace({ onLock }: { onLock: () => void }) {
  const t = useT();
  const [entries, setEntries] = useState<EntrySummary[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>({ kind: "all" });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [editing, setEditing] = useState<{ id: string | null } | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    const run = () => (query ? api.searchEntries(query) : api.listEntries()).then(setEntries).catch(() => {});
    const id = setTimeout(run, 120);
    return () => clearTimeout(id);
  }, [query, reloadKey]);

  const reload = () => setReloadKey((k) => k + 1);

  const tags = useMemo(() => {
    const set = new Set<string>();
    entries.forEach((e) => e.tags.forEach((tg) => set.add(tg)));
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [entries]);

  const visible = useMemo(() => {
    if (filter.kind === "tag" && filter.tag) return entries.filter((e) => e.tags.includes(filter.tag!));
    return entries;
  }, [entries, filter]);

  const selected = visible.find((e) => e.id === selectedId) ?? entries.find((e) => e.id === selectedId) ?? null;

  const inputStyle = { background: "var(--fv-surface-2)", borderColor: "var(--fv-border)" } as const;

  return (
    <div className="h-full grid" style={{ gridTemplateColumns: "240px 340px 1fr" }}>
      {/* ── Sidebar ── */}
      <aside className="flex flex-col border-r" style={{ borderColor: "var(--fv-border)", background: "var(--fv-surface)" }}>
        <div className="p-3">
          <Button onClick={() => setEditing({ id: null })} className="w-full">+ {t("newEntry")}</Button>
        </div>
        <nav className="px-2 space-y-0.5">
          <NavItem label={t("allItems")} icon="◆" active={filter.kind === "all"} onClick={() => setFilter({ kind: "all" })} />
          <NavItem label={t("favorites")} icon="★" soon />
          <NavItem label="Crypto" icon="🪙" soon />
          <NavItem label={t("trash")} icon="🗑" soon />
        </nav>
        {tags.length > 0 && (
          <div className="px-2 mt-4 flex-1 overflow-auto">
            <div className="px-3 mb-1 text-[11px] uppercase tracking-wide" style={{ color: "var(--fv-faint)" }}>{t("tags")}</div>
            <div className="space-y-0.5">
              {tags.map((tg) => (
                <NavItem
                  key={tg}
                  label={tg}
                  icon="#"
                  active={filter.kind === "tag" && filter.tag === tg}
                  onClick={() => setFilter({ kind: "tag", tag: tg })}
                />
              ))}
            </div>
          </div>
        )}
        <div className="mt-auto p-2 border-t space-y-0.5" style={{ borderColor: "var(--fv-border)" }}>
          <NavItem label={t("importTitle")} icon="📥" onClick={() => setShowImport(true)} />
          <NavItem label={t("settings")} icon="⚙" onClick={() => setShowSettings(true)} />
          <NavItem label={t("lock")} icon="🔒" onClick={onLock} />
        </div>
      </aside>

      {/* ── Entry list ── */}
      <section className="flex flex-col border-r min-h-0" style={{ borderColor: "var(--fv-border)", background: "var(--fv-surface)" }}>
        <div className="p-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`🔍  ${t("search")}`}
            className="w-full px-3 py-2 rounded-lg border text-sm"
            style={inputStyle}
          />
        </div>
        <div className="flex-1 overflow-auto px-2 pb-2">
          {visible.length === 0 ? (
            <div className="h-full grid place-items-center text-center px-6" style={{ color: "var(--fv-faint)" }}>
              <div>
                <div className="text-3xl mb-2">🗝️</div>
                <div className="font-medium" style={{ color: "var(--fv-muted)" }}>{t("noEntries")}</div>
                <div className="text-sm mt-1">{t("noEntriesHint")}</div>
              </div>
            </div>
          ) : (
            <ul className="space-y-1">
              {visible.map((e) => {
                const active = e.id === selectedId;
                return (
                  <li key={e.id}>
                    <button
                      onClick={() => setSelectedId(e.id)}
                      className="fv-row w-full flex items-center gap-3 px-2.5 py-2 rounded-xl text-left"
                      style={{ background: active ? "var(--fv-hover)" : "transparent" }}
                      onMouseEnter={(ev) => { if (!active) ev.currentTarget.style.background = "var(--fv-hover)"; }}
                      onMouseLeave={(ev) => { if (!active) ev.currentTarget.style.background = "transparent"; }}
                    >
                      <Avatar label={e.title || e.url || e.username} size={34} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium text-sm" style={{ color: "var(--fv-text)" }}>
                          {e.title || e.url || e.username || t("empty")}
                        </div>
                        <div className="truncate text-xs" style={{ color: "var(--fv-muted)" }}>
                          {e.username || e.url}{e.has_totp ? " · TOTP" : ""}
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      {/* ── Detail ── */}
      <section className="min-h-0" style={{ background: "transparent" }}>
        {selected ? (
          <EntryDetail
            key={`${selected.id}:${reloadKey}`}
            entry={selected}
            onEdit={() => setEditing({ id: selected.id })}
            onDelete={async () => {
              if (!confirm(t("confirmDelete"))) return;
              await api.deleteEntry(selected.id);
              setSelectedId(null);
              reload();
            }}
          />
        ) : (
          <div className="h-full grid place-items-center text-center px-8" style={{ color: "var(--fv-faint)" }}>
            <div>
              <div className="text-4xl mb-3">🔐</div>
              <div className="font-medium" style={{ color: "var(--fv-muted)" }}>{t("selectEntry")}</div>
              <div className="text-sm mt-1">{t("selectEntryHint")}</div>
            </div>
          </div>
        )}
      </section>

      {/* ── Modals ── */}
      <Modal open={!!editing} onClose={() => setEditing(null)} maxWidth="36rem">
        {editing && (
          <EntryEditor
            id={editing.id}
            entry={editing.id ? entries.find((e) => e.id === editing.id) : undefined}
            onClose={() => {
              if (editing.id) setSelectedId(editing.id);
              setEditing(null);
              reload();
            }}
          />
        )}
      </Modal>
      <Modal open={showImport} onClose={() => setShowImport(false)} maxWidth="44rem">
        <ImportWizard onDone={() => { setShowImport(false); reload(); }} />
      </Modal>
      <Modal open={showSettings} onClose={() => setShowSettings(false)} maxWidth="30rem">
        <SettingsScreen onDone={() => setShowSettings(false)} />
      </Modal>
    </div>
  );
}
