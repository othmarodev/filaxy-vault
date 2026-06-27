import { useLang, useT } from "../i18n/I18nContext";
import { fvAction } from "../lib/actions";
import * as api from "../api";

const VERSION = "0.1.0";
const REPO = "https://github.com/othmarodev/filaxy-vault";

/**
 * Website-style footer. Holds the Help/secondary links (Manual, Shortcuts,
 * About) plus brand + legal — all laid out horizontally. Readable in both
 * themes: solid surface background, high-contrast text, no faint colors.
 */
export function Footer() {
  const t = useT();
  const { lang } = useLang();
  const es = lang === "es";

  const links: { id: string; emoji: string; label: string }[] = [
    { id: "menu_manual", emoji: "📖", label: t("menuManual") },
    { id: "menu_shortcuts", emoji: "⌨️", label: t("menuShortcuts") },
    { id: "menu_about", emoji: "ℹ️", label: es ? "Acerca de" : "About" },
  ];

  return (
    <footer
      className="shrink-0 border-t px-5 py-3"
      style={{ borderColor: "var(--fv-border)", background: "var(--fv-surface)" }}
    >
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-baseline gap-2.5 min-w-0">
          <span className="text-sm font-semibold bg-brand-grad bg-clip-text text-transparent whitespace-nowrap">{t("appName")}</span>
          <span className="text-xs whitespace-nowrap" style={{ color: "var(--fv-muted)" }}>
            v{VERSION} · {es ? "Local-first · sin nube" : "Local-first · no cloud"}
          </span>
        </div>
        <nav className="flex items-center gap-0.5 flex-wrap">
          {links.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => fvAction(l.id)}
              className="fv-nav-link px-2.5 py-1.5 rounded-md text-sm font-medium"
              style={{ color: "var(--fv-muted)" }}
            >
              <span className="mr-1.5">{l.emoji}</span>{l.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => api.openUrl(REPO).catch(() => {})}
            className="fv-nav-link px-2.5 py-1.5 rounded-md text-sm font-medium"
            style={{ color: "var(--fv-muted)" }}
          >
            <span className="mr-1.5">🐙</span>GitHub
          </button>
        </nav>
      </div>
      <div className="mt-2 text-center text-xs" style={{ color: "var(--fv-muted)" }}>
        MIT · Filaxy™ Labs · Costa Rica 🇨🇷
      </div>
    </footer>
  );
}
