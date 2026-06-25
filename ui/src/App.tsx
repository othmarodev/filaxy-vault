import { useCallback, useEffect, useRef, useState } from "react";
import { appDataDir, join } from "@tauri-apps/api/path";
import { TopBar } from "./components/TopBar";
import { VaultBackdrop } from "./components/VaultBackdrop";
import { Onboarding } from "./screens/Onboarding";
import { Unlock } from "./screens/Unlock";
import { VaultWorkspace } from "./screens/VaultWorkspace";
import * as api from "./api";

type View = "loading" | "onboarding" | "unlock" | "vault";

export default function App() {
  const [view, setView] = useState<View>("loading");
  const [path, setPath] = useState("");
  const lastTouch = useRef(0);

  useEffect(() => {
    (async () => {
      const dir = await appDataDir();
      const p = await join(dir, "filaxy.fvault");
      setPath(p);
      const exists = await api.vaultExists(p);
      if (!exists) { setView("onboarding"); return; }
      const locked = await api.isLocked();
      setView(locked ? "unlock" : "vault");
    })();
  }, []);

  // activity + auto-lock loop (only while unlocked)
  const unlocked = view === "vault";
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

  return (
    <div className="h-full flex flex-col relative z-10">
      <VaultBackdrop />
      <TopBar onLock={unlocked ? lock : undefined} />
      <main className="flex-1 min-h-0">
        {view === "loading" && <div className="p-8 text-center" style={{ color: "var(--fv-muted)" }}>…</div>}
        {view === "onboarding" && <Onboarding path={path} onCreated={() => setView("vault")} />}
        {view === "unlock" && <Unlock path={path} onUnlocked={() => setView("vault")} />}
        {view === "vault" && <VaultWorkspace onLock={lock} />}
      </main>
    </div>
  );
}
