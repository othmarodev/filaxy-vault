import { useT } from "../i18n/I18nContext";

/**
 * Lock action with a look of its own — deliberately different from the solid
 * "+ New" button. A rotating violet→sky gradient ring frames a glass center,
 * and the padlock snaps shut on hover. Spins faster + glows when hovered.
 */
export function LockButton({ onClick }: { onClick: () => void }) {
  const t = useT();
  return (
    <button type="button" onClick={onClick} aria-label={t("lock")} className="fv-lockbtn fv-lockbtn-ring">
      <span aria-hidden="true" className="ring-spin" />
      <span className="ring-inner">
        <svg
          className="fv-lock-ico"
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="4" y="11" width="16" height="9" rx="2" />
          <path className="fv-lock-shackle" d="M8 11V8a4 4 0 0 1 8 0v3" />
        </svg>
        {t("lock")}
      </span>
    </button>
  );
}
