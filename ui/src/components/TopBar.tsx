import { useLang } from "../i18n/I18nContext";
import { useTheme } from "../theme/ThemeContext";
import { useT } from "../i18n/I18nContext";
import { Button } from "./Button";

export function TopBar({ onLock }: { onLock?: () => void }) {
  const { lang, setLang } = useLang();
  const { theme, toggle } = useTheme();
  const t = useT();
  return (
    <header
      className="flex items-center justify-between px-5 py-3 border-b"
      style={{ borderColor: "var(--fv-border)", background: "var(--fv-surface)" }}
    >
      <span className="text-lg font-semibold bg-brand-grad bg-clip-text text-transparent">{t("appName")}</span>
      <div className="flex items-center gap-2">
        <button
          className="px-2 py-1 rounded hover:bg-black/5 dark:hover:bg-white/10"
          onClick={() => setLang(lang === "en" ? "es" : "en")}
          aria-label={t("language")}
        >
          {lang === "en" ? "EN" : "ES"}
        </button>
        <button
          className="px-2 py-1 rounded hover:bg-black/5 dark:hover:bg-white/10"
          onClick={toggle}
          aria-label={t("theme")}
        >
          {theme === "dark" ? "☾" : "☀"}
        </button>
        {onLock && <Button variant="ghost" onClick={onLock}>{t("lock")}</Button>}
      </div>
    </header>
  );
}
