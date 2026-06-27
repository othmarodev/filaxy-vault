import { useT } from "../i18n/I18nContext";
import { LangSwitch } from "./LangSwitch";
import { ThemeSwitch } from "./ThemeSwitch";
import { MenuBar } from "./MenuBar";
import { LockButton } from "./LockButton";

export function TopBar({ onLock }: { onLock?: () => void }) {
  const t = useT();
  return (
    <header
      className="flex items-center justify-between gap-4 px-5 py-2.5 border-b"
      style={{ borderColor: "var(--fv-border)", background: "var(--fv-surface)" }}
    >
      <div className="flex items-center gap-5 min-w-0">
        <span className="text-lg font-semibold bg-brand-grad bg-clip-text text-transparent whitespace-nowrap">{t("appName")}</span>
        <MenuBar unlocked={!!onLock} />
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <LangSwitch />
        <ThemeSwitch />
        {onLock && <LockButton onClick={onLock} />}
      </div>
    </header>
  );
}
