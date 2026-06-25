import { createContext, useContext, useState, type ReactNode } from "react";
import { en, type Dict } from "./en";
import { es } from "./es";

type Lang = "en" | "es";
const dicts: Record<Lang, Dict> = { en, es };

const Ctx = createContext<{ lang: Lang; setLang: (l: Lang) => void; t: (k: keyof Dict) => string } | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const saved = localStorage.getItem("fv-lang");
    return saved === "es" ? "es" : "en";
  });
  const setLang = (l: Lang) => {
    localStorage.setItem("fv-lang", l);
    setLangState(l);
  };
  const t = (k: keyof Dict) => dicts[lang][k];
  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>;
}

export function useT() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useT must be used within I18nProvider");
  return c.t;
}
export function useLang() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useLang must be used within I18nProvider");
  return { lang: c.lang, setLang: c.setLang };
}
