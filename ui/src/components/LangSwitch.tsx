import { useLang } from "../i18n/I18nContext";

/**
 * Elegant segmented language toggle (EN | ES) with a sliding brand-gradient
 * indicator behind the active option. Tier Apple/Linear aesthetic.
 */
export function LangSwitch() {
  const { lang, setLang } = useLang();
  const isEn = lang === "en";

  return (
    <div
      className="relative inline-flex items-center rounded-full p-1 select-none text-xs font-semibold"
      style={{ background: "var(--fv-border)" }}
      role="group"
      aria-label="Language"
    >
      {/* sliding indicator */}
      <span
        aria-hidden="true"
        className="absolute inset-y-1 rounded-full bg-brand-grad shadow-sm transition-transform duration-300 ease-out"
        style={{
          width: "calc(50% - 0.25rem)",
          left: "0.25rem",
          transform: isEn ? "translateX(0)" : "translateX(100%)",
        }}
      />
      {(["en", "es"] as const).map((code) => {
        const active = lang === code;
        return (
          <button
            key={code}
            type="button"
            onClick={() => setLang(code)}
            aria-pressed={active}
            className="relative z-10 px-3 py-1 rounded-full transition-colors duration-200"
            style={{ color: active ? "#fff" : "var(--fv-muted)", minWidth: "2.25rem" }}
          >
            {code.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}
