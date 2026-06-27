import { useCallback, useEffect, useRef, useState } from "react";
import { appDataDir, join } from "@tauri-apps/api/path";
import { TopBar } from "./components/TopBar";
import { Footer } from "./components/Footer";
import { VaultBackdrop } from "./components/VaultBackdrop";
import { HelpModal, type HelpSection } from "./components/HelpModal";
import { Onboarding } from "./screens/Onboarding";
import { Unlock } from "./screens/Unlock";
import { VaultWorkspace } from "./screens/VaultWorkspace";
import { useLang } from "./i18n/I18nContext";
import { fvAction, onFvAction } from "./lib/actions";
import * as api from "./api";

type View = "loading" | "onboarding" | "unlock" | "vault";

export default function App() {
  const [view, setView] = useState<View>("loading");
  const [path, setPath] = useState("");
  const [help, setHelp] = useState<{ open: boolean; section: HelpSection }>({ open: false, section: "manual" });
  const lastTouch = useRef(0);
  const { lang } = useLang();

  const openHelp = useCallback((section: HelpSection) => setHelp({ open: true, section }), []);

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

  // keep the native menu bar in the current language
  useEffect(() => { api.setMenuLanguage(lang).catch(() => {}); }, [lang]);

  const lock = useCallback(async () => { await api.lockVault(); setView("unlock"); }, []);

  // bridge native OS menu events onto the in-app action bus
  useEffect(() => {
    const un = api.onMenu((id) => fvAction(id));
    return () => { un.then((f) => f()); };
  }, []);

  // global actions (help/about/lock) — from native menu OR in-window menu
  useEffect(() => {
    return onFvAction((id) => {
      if (id === "menu_manual") openHelp("manual");
      else if (id === "menu_shortcuts") openHelp("shortcuts");
      else if (id === "menu_about") openHelp("about");
      else if (id === "menu_lock") void lock();
    });
  }, [openHelp, lock]);

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

  return (
    <div className="h-full flex flex-col relative z-10">
      <VaultBackdrop />
      <TopBar onLock={unlocked ? lock : undefined} />
      <main className="flex-1 min-h-0">
        {view === "loading" && <div className="p-8 text-center" style={{ color: "var(--fv-muted)" }}>…</div>}
        {view === "onboarding" && <Onboarding path={path} onCreated={() => setView("vault")} />}
        {view === "unlock" && <Unlock path={path} onUnlocked={() => setView("vault")} />}
        {view === "vault" && <VaultWorkspace onLock={lock} onOpenHelp={openHelp} />}
      </main>
      <Footer />
      <HelpModal open={help.open} section={help.section} onClose={() => setHelp((h) => ({ ...h, open: false }))} onSection={(s) => setHelp({ open: true, section: s })} />
    </div>
  );
}
