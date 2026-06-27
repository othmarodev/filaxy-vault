import { useT } from "../i18n/I18nContext";
import { fvAction } from "../lib/actions";

/**
 * Horizontal in-window nav. Every command is laid out flat and visible — like a
 * website's top navigation — no dropdowns. Mirrors the native OS menu via the
 * shared action bus, so it works on every platform and in fullscreen too.
 */
export function MenuBar({ unlocked }: { unlocked: boolean }) {
  const t = useT();
  if (!unlocked) return null;

  const items: { id: string; label: string }[] = [
    { id: "menu_import", label: t("menuImport") },
    { id: "menu_settings", label: t("settings") },
  ];

  return (
    <nav className="flex items-center gap-0.5">
      {items.map((it) => (
        <button
          key={it.id}
          type="button"
          onClick={() => fvAction(it.id)}
          className="fv-nav-link px-2.5 py-1.5 rounded-md text-sm font-medium whitespace-nowrap"
          style={{ color: "var(--fv-muted)" }}
        >
          {it.label}
        </button>
      ))}
    </nav>
  );
}
