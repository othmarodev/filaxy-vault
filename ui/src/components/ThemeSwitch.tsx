import { useTheme } from "../theme/ThemeContext";

function Sun() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function Moon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

/**
 * Elegant iOS-style light/dark switch with a sliding knob and crisp SVG icons.
 * Track turns into the brand gradient in dark mode.
 */
export function ThemeSwitch() {
  const { theme, toggle } = useTheme();
  const dark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Theme"
      aria-pressed={dark}
      className="relative inline-flex items-center rounded-full transition-colors duration-300 ease-out"
      style={{
        width: "3.25rem",
        height: "1.75rem",
        padding: "0.2rem",
        background: dark ? "linear-gradient(135deg,#7c3aed,#0ea5e9)" : "var(--fv-border)",
      }}
    >
      <span
        className="grid place-items-center rounded-full bg-white shadow-md transition-transform duration-300 ease-out"
        style={{
          width: "1.35rem",
          height: "1.35rem",
          transform: dark ? "translateX(1.5rem)" : "translateX(0)",
          color: dark ? "#0ea5e9" : "#f59e0b",
        }}
      >
        {dark ? <Moon /> : <Sun />}
      </span>
    </button>
  );
}
