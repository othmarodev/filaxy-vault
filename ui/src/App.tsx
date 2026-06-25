import { useCallback, useEffect, useRef, useState } from "react";
import { appDataDir, join } from "@tauri-apps/api/path";
import { TopBar } from "./components/TopBar";
import { Onboarding } from "./screens/Onboarding";
import { Unlock } from "./screens/Unlock";
import { VaultList } from "./screens/VaultList";
import { EntryEditor } from "./screens/EntryEditor";
import { ImportWizard } from "./screens/ImportWizard";
import { SettingsScreen } from "./screens/SettingsScreen";
import * as api from "./api";

type View = "loading" | "onboarding" | "unlock" | "list" | "editor" | "import" | "settings";

export default function App() {
  const [view, setView] = useState<View>("loading");
  const [path, setPath] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const lastTouch = useRef(0);

  useEffect(() => {
    (async () => {
      const dir = await appDataDir();
      const p = await join(dir, "filaxy.fvault");
      setPath(p);
      const exists = await api.vaultExists(p);
      if (!exists) { setView("onboarding"); return; }
      const locked = await api.isLocked();
      setView(locked ? "unlock" : "list");
    })();
  }, []);

  // activity + auto-lock loop (only while unlocked)
  const unlocked = view === "list" || view === "editor" || view === "import" || view === "settings";
  useEffect(() => {
    if (!unlocked) return;
    const onActivity = () => {
      const now = Date.now();
      if (now - lastTouch.current > 5000) { lastTouch.current = now; void api.touchActivity(); }
    };
    window.addEventListener("mousemove", onActivity);
    window.addEventListener("keydown", onActivity);
    const iv = setInterval(async () => {
      const locked = await api.checkAutolock();
      if (locked) setView("unlock");
    }, 30000);
    return () => {
      window.removeEventListener("mousemove", onActivity);
      window.removeEventListener("keydown", onActivity);
      clearInterval(iv);
    };
  }, [unlocked]);

  const lock = useCallback(async () => { await api.lockVault(); setView("unlock"); }, []);
  const reload = () => setReloadKey((k) => k + 1);

  return (
    <div className="min-h-full flex flex-col">
      <TopBar onLock={unlocked ? lock : undefined} />
      <main className="flex-1">
        {view === "loading" && <div className="p-8 text-center" style={{ color: "var(--fv-muted)" }}>…</div>}
        {view === "onboarding" && <Onboarding path={path} onCreated={() => setView("list")} />}
        {view === "unlock" && <Unlock path={path} onUnlocked={() => setView("list")} />}
        {view === "list" && (
          <VaultList reloadKey={reloadKey}
            onOpenEntry={(id) => { setEditId(id); setView("editor"); }}
            onAdd={() => { setEditId(null); setView("editor"); }}
            onImport={() => setView("import")}
            onSettings={() => setView("settings")} />
        )}
        {view === "editor" && <EntryEditor id={editId} onClose={() => { reload(); setView("list"); }} />}
        {view === "import" && <ImportWizard onDone={() => { reload(); setView("list"); }} />}
        {view === "settings" && <SettingsScreen onDone={() => setView("list")} />}
      </main>
    </div>
  );
}
