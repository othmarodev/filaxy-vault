import { useT } from "../i18n/I18nContext";
import { Button } from "./Button";
import { LangSwitch } from "./LangSwitch";
import { ThemeSwitch } from "./ThemeSwitch";

export function TopBar({ onLock }: { onLock?: () => void }) {
  const t = useT();
  return (
    <header
      className="flex items-center justify-between px-5 py-3 border-b"
      style={{ borderColor: "var(--fv-border)", background: "var(--fv-surface)" }}
    >
      <span className="text-lg font-semibold bg-brand-grad bg-clip-text text-transparent">{t("appName")}</span>
      <div className="flex items-center gap-3">
        <LangSwitch />
        <ThemeSwitch />
        {onLock && <Button variant="ghost" onClick={onLock}>{t("lock")}</Button>}
      </div>
    </header>
  );
}
