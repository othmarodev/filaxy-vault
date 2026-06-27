import { useEffect, useMemo, useState } from "react";
import type { EntrySummary } from "../types";
import { useT } from "../i18n/I18nContext";
import { Avatar } from "../components/Avatar";
import { Button } from "../components/Button";
import { Modal } from "../components/Modal";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { EntryDetail } from "../components/EntryDetail";
import { SeedDetail } from "../components/SeedDetail";
import { TotpDetail } from "../components/TotpDetail";
import { EntryEditor } from "./EntryEditor";
import { SeedEditor } from "./SeedEditor";
import { TotpEditor } from "./TotpEditor";
import { ImportWizard } from "./ImportWizard";
import { GaImport } from "./GaImport";
import { HealthView } from "./HealthView";
import { SettingsScreen } from "./SettingsScreen";
import { onFvAction } from "../lib/actions";
import * as api from "../api";

type Filter = { kind: "all" | "favorites" | "crypto" | "totp" | "health" | "trash" | "tag" | "group"; tag?: string; group?: string };
type Editing = { id: string | null; kind: "login" | "seed" | "totp" };

function NavItem({
  label, icon, active, soon, onClick,
}: {
  label: string; icon: string; active?: boolean; soon?: boolean; onClick?: () => void;
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

export function VaultWorkspace({ onLock, onOpenHelp }: { onLock: () => void; onOpenHelp: (s: "manual" | "shortcuts" | "about") => void }) {
  const t = useT();
  const [entries, setEntries] = useState<EntrySummary[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>({ kind: "all" });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [reloadKey, setReloadKey] = useState(0);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [newMenu, setNewMenu] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showGa, setShowGa] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [confirmDlg, setConfirmDlg] = useState<{ message: string; onConfirm: () => void } | null>(null);

  useEffect(() => {
    const run = () => (query ? api.searchEntries(query) : api.listEntries()).then(setEntries).catch(() => {});
    const id = setTimeout(run, 120);
    return () => clearTimeout(id);
  }, [query, reloadKey]);

  const reload = () => setReloadKey((k) => k + 1);

  // vault actions from the menu bus (native menu OR in-window menu)
  useEffect(() => {
    return onFvAction((id) => {
      if (id === "menu_settings") setShowSettings(true);
      else if (id === "menu_import") setShowImport(true);
      else if (id === "menu_new") setEditing({ id: null, kind: "login" });
    });
  }, []);

  const tags = useMemo(() => {
    const set = new Set<string>();
    entries.forEach((e) => { if (!e.trashed) e.tags.forEach((tg) => set.add(tg)); });
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [entries]);

  const groups = useMemo(() => {
    const set = new Set<string>();
    entries.forEach((e) => { if (!e.trashed && e.group) set.add(e.group); });
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [entries]);

  const trashCount = useMemo(() => entries.filter((e) => e.trashed).length, [entries]);
  const inTrash = filter.kind === "trash";
  const inHealth = filter.kind === "health";

  const visible = useMemo(() => {
    if (filter.kind === "trash") return entries.filter((e) => e.trashed);
    const live = entries.filter((e) => !e.trashed);
    if (filter.kind === "favorites") return live.filter((e) => e.favorite);
    if (filter.kind === "crypto") return live.filter((e) => e.kind === "seed");
    if (filter.kind === "totp") return live.filter((e) => e.kind === "totp");
    if (filter.kind === "tag" && filter.tag) return live.filter((e) => e.tags.includes(filter.tag!));
    if (filter.kind === "group" && filter.group) return live.filter((e) => e.group === filter.group);
    return live;
  }, [entries, filter]);

  const selected = visible.find((e) => e.id === selectedId) ?? entries.find((e) => e.id === selectedId) ?? null;
  const editingEntry = editing?.id ? entries.find((e) => e.id === editing.id) : undefined;

  const inputStyle = { background: "var(--fv-surface-2)", borderColor: "var(--fv-border)" } as const;

  const startNew = (kind: "login" | "seed" | "totp") => { setNewMenu(false); setEditing({ id: null, kind }); };

  // ── multi-select / bulk delete ──
  const toggleCheck = (id: string) => setChecked((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const allVisibleChecked = visible.length > 0 && visible.every((e) => checked.has(e.id));
  const toggleAll = () => setChecked(() => allVisibleChecked ? new Set<string>() : new Set(visible.map((e) => e.id)));
  const clearChecked = () => setChecked(new Set());

  // Centralized destructive-delete: ALWAYS goes through the confirm popup.
  const requestDelete = (ids: string[], message: string) => {
    if (ids.length === 0) return;
    setConfirmDlg({
      message,
      onConfirm: async () => {
        for (const id of ids) { try { await api.deleteEntry(id); } catch { /* ignore */ } }
        if (selectedId && ids.includes(selectedId)) setSelectedId(null);
        setChecked((prev) => { const n = new Set(prev); ids.forEach((i) => n.delete(i)); return n; });
        setConfirmDlg(null);
        reload();
      },
    });
  };
  const deleteChecked = () => requestDelete([...checked], t("confirmDeleteMany"));

  const toggleFav = async (id: string) => { try { await api.toggleFavorite(id); reload(); } catch { /* ignore */ } };

  const restoreIds = async (ids: string[]) => {
    for (const id of ids) { try { await api.restoreEntry(id); } catch { /* ignore */ } }
    clearChecked();
    reload();
  };

  const requestDeleteForever = (ids: string[]) => {
    if (ids.length === 0) return;
    setConfirmDlg({
      message: t("confirmDeleteMany"),
      onConfirm: async () => {
        for (const id of ids) { try { await api.deleteForever(id); } catch { /* ignore */ } }
        if (selectedId && ids.includes(selectedId)) setSelectedId(null);
        setChecked((prev) => { const n = new Set(prev); ids.forEach((i) => n.delete(i)); return n; });
        setConfirmDlg(null);
        reload();
      },
    });
  };

  const requestEmptyTrash = () => setConfirmDlg({
    message: t("confirmEmptyTrash"),
    onConfirm: async () => { await api.emptyTrash(); setSelectedId(null); clearChecked(); setConfirmDlg(null); reload(); },
  });

  // delete from a detail view: soft-delete normally, permanent when already in trash
  const deleteFromDetail = (id: string) => inTrash ? requestDeleteForever([id]) : requestDelete([id], t("confirmDelete"));
  // clear selection when switching category/search
  useEffect(() => { setChecked(new Set()); }, [filter, query]);

  return (
    <div className="h-full grid" style={{ gridTemplateColumns: "240px 340px 1fr" }}>
      {/* ── Sidebar ── */}
      <aside className="flex flex-col border-r" style={{ borderColor: "var(--fv-border)", background: "var(--fv-surface)" }}>
        <div className="p-3 relative">
          <Button onClick={() => setNewMenu((v) => !v)} className="w-full">+ {t("newEntry")}</Button>
          {newMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setNewMenu(false)} />
              <div className="fv-fade-in absolute left-3 right-3 mt-1 z-20 rounded-xl border overflow-hidden" style={{ background: "var(--fv-surface)", borderColor: "var(--fv-border)", boxShadow: "var(--fv-shadow)" }}>
                <button className="fv-row w-full text-left px-3 py-2.5 text-sm flex items-center gap-2" style={{ color: "var(--fv-text)" }} onClick={() => startNew("login")}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--fv-hover)")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                  🔑 {t("newPassword")}
                </button>
                <button className="fv-row w-full text-left px-3 py-2.5 text-sm flex items-center gap-2" style={{ color: "var(--fv-text)" }} onClick={() => startNew("seed")}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--fv-hover)")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                  🪙 {t("seedPhrase")}
                </button>
                <button className="fv-row w-full text-left px-3 py-2.5 text-sm flex items-center gap-2" style={{ color: "var(--fv-text)" }} onClick={() => startNew("totp")}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--fv-hover)")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                  ⏱️ {t("newTotp")}
                </button>
                <div className="border-t" style={{ borderColor: "var(--fv-border)" }} />
                <button className="fv-row w-full text-left px-3 py-2.5 text-sm flex items-center gap-2" style={{ color: "var(--fv-text)" }} onClick={() => { setNewMenu(false); setShowGa(true); }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--fv-hover)")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                  📷 {t("gaImport")}
                </button>
              </div>
            </>
          )}
        </div>
        <nav className="px-2 space-y-0.5">
          <NavItem label={t("allItems")} icon="◆" active={filter.kind === "all"} onClick={() => setFilter({ kind: "all" })} />
          <NavItem label={t("favorites")} icon="★" active={filter.kind === "favorites"} onClick={() => setFilter({ kind: "favorites" })} />
          <NavItem label={t("crypto")} icon="🪙" active={filter.kind === "crypto"} onClick={() => setFilter({ kind: "crypto" })} />
          <NavItem label={t("authenticator")} icon="⏱️" active={filter.kind === "totp"} onClick={() => setFilter({ kind: "totp" })} />
          <NavItem label={t("health")} icon="🩺" active={filter.kind === "health"} onClick={() => setFilter({ kind: "health" })} />
          <NavItem label={`${t("trash")}${trashCount ? ` (${trashCount})` : ""}`} icon="🗑" active={filter.kind === "trash"} onClick={() => setFilter({ kind: "trash" })} />
        </nav>
        {groups.length > 0 && (
          <div className="px-2 mt-4">
            <div className="px-3 mb-1 text-[11px] uppercase tracking-wide" style={{ color: "var(--fv-faint)" }}>{t("folders")}</div>
            <div className="space-y-0.5">
              {groups.map((g) => (
                <NavItem key={g} label={g} icon="🗂" active={filter.kind === "group" && filter.group === g} onClick={() => setFilter({ kind: "group", group: g })} />
              ))}
            </div>
          </div>
        )}
        {tags.length > 0 && (
          <div className="px-2 mt-4 flex-1 overflow-auto">
            <div className="px-3 mb-1 text-[11px] uppercase tracking-wide" style={{ color: "var(--fv-faint)" }}>{t("tags")}</div>
            <div className="space-y-0.5">
              {tags.map((tg) => (
                <NavItem key={tg} label={tg} icon="#" active={filter.kind === "tag" && filter.tag === tg} onClick={() => setFilter({ kind: "tag", tag: tg })} />
              ))}
            </div>
          </div>
        )}
        <div className="mt-auto p-2 border-t space-y-0.5" style={{ borderColor: "var(--fv-border)" }}>
          <NavItem label={t("importTitle")} icon="📥" onClick={() => setShowImport(true)} />
          <NavItem label={t("settings")} icon="⚙" onClick={() => setShowSettings(true)} />
          <NavItem label={t("helpMenu")} icon="?" onClick={() => onOpenHelp("manual")} />
          <NavItem label={t("lock")} icon="🔒" onClick={onLock} />
        </div>
      </aside>

      {inHealth ? (
        <section className="min-h-0" style={{ gridColumn: "2 / 4", background: "transparent" }}>
          <HealthView onOpenEntry={(id) => { setFilter({ kind: "all" }); setSelectedId(id); }} />
        </section>
      ) : (
       <>
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
        {inTrash && visible.length > 0 && checked.size === 0 && (
          <div className="mx-3 mb-2">
            <Button variant="danger" onClick={requestEmptyTrash} className="w-full !py-1.5 text-sm">🗑 {t("emptyTrash")}</Button>
          </div>
        )}
        {checked.size > 0 && (
          <div className="mx-3 mb-2 px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 fv-fade-in" style={{ background: "var(--fv-surface-2)" }}>
            <span className="text-sm font-medium flex-1 min-w-0 truncate" style={{ color: "var(--fv-text)" }}>
              {checked.size} {t("selected")}
            </span>
            <button
              onClick={toggleAll}
              title={t("selectAll")}
              aria-label={t("selectAll")}
              className="fv-icon-btn grid place-items-center w-8 h-8 rounded-lg hover:bg-black/5 dark:hover:bg-white/10"
              style={{ color: "var(--fv-violet)" }}
            >▣</button>
            {inTrash ? (
              <>
                <Button variant="ghost" onClick={() => void restoreIds([...checked])} className="!px-3 !py-1.5 text-sm">↩ {t("restore")}</Button>
                <Button variant="danger" onClick={() => requestDeleteForever([...checked])} className="!px-2.5 !py-1.5 text-sm" title={t("deleteForever")}>🗑</Button>
              </>
            ) : (
              <Button variant="danger" onClick={() => void deleteChecked()} className="!px-3 !py-1.5 text-sm">🗑 {t("delete")}</Button>
            )}
            <button
              onClick={clearChecked}
              title={t("clearSel")}
              aria-label={t("clearSel")}
              className="fv-icon-btn grid place-items-center w-8 h-8 rounded-lg hover:bg-black/5 dark:hover:bg-white/10"
              style={{ color: "var(--fv-muted)" }}
            >✕</button>
          </div>
        )}
        <div className="flex-1 overflow-auto px-2 pb-2">
          {visible.length === 0 ? (
            <div className="h-full grid place-items-center text-center px-6" style={{ color: "var(--fv-faint)" }}>
              <div>
                <div className="text-3xl mb-2">{filter.kind === "crypto" ? "🪙" : filter.kind === "totp" ? "⏱️" : filter.kind === "trash" ? "🗑" : filter.kind === "favorites" ? "★" : "🗝️"}</div>
                <div className="font-medium" style={{ color: "var(--fv-muted)" }}>{filter.kind === "crypto" ? t("noSeeds") : filter.kind === "totp" ? t("noTotp") : filter.kind === "trash" ? t("trashEmpty") : t("noEntries")}</div>
                <div className="text-sm mt-1">{filter.kind === "crypto" ? t("noSeedsHint") : filter.kind === "totp" ? t("noTotpHint") : filter.kind === "trash" ? "" : t("noEntriesHint")}</div>
                {filter.kind === "totp" && (
                  <div className="mt-4">
                    <Button onClick={() => setShowGa(true)}>📷 {t("gaImport")}</Button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <ul className="space-y-1">
              {visible.map((e) => {
                const active = e.id === selectedId;
                const isChecked = checked.has(e.id);
                const anyChecked = checked.size > 0;
                const isSeed = e.kind === "seed";
                const isTotp = e.kind === "totp";
                const prefix = isSeed ? "🪙 " : isTotp ? "⏱ " : "";
                const subtitle = isSeed
                  ? `🪙 ${e.word_count} ${t("wordCount").toLowerCase()}`
                  : isTotp
                    ? `⏱️ ${e.username || "2FA"}`
                    : `${e.username || e.url}${e.has_totp ? " · TOTP" : ""}`;
                const hl = active || isChecked;
                return (
                  <li key={e.id}>
                    <div
                      className="fv-row group flex items-center gap-2 pl-2 pr-2.5 py-2 rounded-xl"
                      style={{ background: hl ? "var(--fv-hover)" : "transparent" }}
                      onMouseEnter={(ev) => { if (!hl) ev.currentTarget.style.background = "var(--fv-hover)"; }}
                      onMouseLeave={(ev) => { if (!hl) ev.currentTarget.style.background = "transparent"; }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleCheck(e.id)}
                        className={`shrink-0 w-4 h-4 cursor-pointer transition-opacity ${isChecked || anyChecked ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
                        style={{ accentColor: "#7c3aed" }}
                        aria-label="select"
                      />
                      <button onClick={() => setSelectedId(e.id)} className="flex items-center gap-3 min-w-0 flex-1 text-left">
                        <Avatar label={prefix + (e.title || e.url || e.username)} size={34} icon={e.icon || undefined} />
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-medium text-sm" style={{ color: "var(--fv-text)" }}>
                            {e.title || e.url || e.username || t("empty")}
                          </div>
                          <div className="truncate text-xs" style={{ color: "var(--fv-muted)" }}>{subtitle}</div>
                        </div>
                      </button>
                      {inTrash ? (
                        <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => void restoreIds([e.id])} title={t("restore")} aria-label={t("restore")}
                            className="fv-icon-btn grid place-items-center w-7 h-7 rounded-lg hover:bg-black/5 dark:hover:bg-white/10" style={{ color: "var(--fv-violet)" }}>↩</button>
                          <button onClick={() => requestDeleteForever([e.id])} title={t("deleteForever")} aria-label={t("deleteForever")}
                            className="fv-icon-btn grid place-items-center w-7 h-7 rounded-lg hover:bg-red-500/10" style={{ color: "#ef4444" }}>🗑</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => void toggleFav(e.id)}
                          title={t("favorites")}
                          aria-label={t("favorites")}
                          className={`fv-icon-btn grid place-items-center w-7 h-7 rounded-lg shrink-0 transition-opacity ${e.favorite ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
                          style={{ color: e.favorite ? "#f59e0b" : "var(--fv-faint)" }}
                        >{e.favorite ? "★" : "☆"}</button>
                      )}
                    </div>
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
          selected.kind === "seed" ? (
            <SeedDetail
              key={`${selected.id}:${reloadKey}`}
              entry={selected}
              onEdit={() => setEditing({ id: selected.id, kind: "seed" })}
              onDelete={() => deleteFromDetail(selected.id)}
            />
          ) : selected.kind === "totp" ? (
            <TotpDetail
              key={`${selected.id}:${reloadKey}`}
              entry={selected}
              onEdit={() => setEditing({ id: selected.id, kind: "totp" })}
              onDelete={() => deleteFromDetail(selected.id)}
            />
          ) : (
            <EntryDetail
              key={`${selected.id}:${reloadKey}`}
              entry={selected}
              onEdit={() => setEditing({ id: selected.id, kind: "login" })}
              onDelete={() => deleteFromDetail(selected.id)}
            />
          )
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
       </>
      )}

      {/* ── Modals ── */}
      <Modal open={!!editing} onClose={() => setEditing(null)} maxWidth={editing?.kind === "seed" ? "42rem" : "36rem"}>
        {editing && (editing.kind === "seed" ? (
          <SeedEditor
            id={editing.id}
            entry={editingEntry}
            onClose={() => { if (editing.id) setSelectedId(editing.id); setEditing(null); reload(); }}
          />
        ) : editing.kind === "totp" ? (
          <TotpEditor
            id={editing.id}
            entry={editingEntry}
            onClose={() => { if (editing.id) setSelectedId(editing.id); setEditing(null); reload(); }}
          />
        ) : (
          <EntryEditor
            id={editing.id}
            entry={editingEntry}
            onClose={() => { if (editing.id) setSelectedId(editing.id); setEditing(null); reload(); }}
          />
        ))}
      </Modal>
      <Modal open={showImport} onClose={() => setShowImport(false)} maxWidth="44rem">
        <ImportWizard onDone={() => { setShowImport(false); reload(); }} />
      </Modal>
      <Modal open={showGa} onClose={() => setShowGa(false)} maxWidth="34rem">
        <GaImport onDone={() => { setShowGa(false); reload(); }} />
      </Modal>
      <Modal open={showSettings} onClose={() => setShowSettings(false)} maxWidth="30rem">
        <SettingsScreen onDone={() => setShowSettings(false)} />
      </Modal>
      <ConfirmDialog
        open={!!confirmDlg}
        message={confirmDlg?.message ?? ""}
        onConfirm={() => confirmDlg?.onConfirm()}
        onCancel={() => setConfirmDlg(null)}
      />
    </div>
  );
}
