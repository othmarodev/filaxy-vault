/**
 * Gradient initial avatar for an entry. Derives a stable hue pair from the
 * title so each entry gets a consistent, distinct colored badge.
 */
function hue(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % 360;
  return h;
}

export function Avatar({ label, size = 36, icon }: { label: string; size?: number; icon?: string }) {
  if (icon) {
    // custom uploaded image (data: URL) vs emoji glyph
    if (icon.startsWith("data:") || icon.startsWith("http")) {
      return (
        <img
          src={icon}
          alt=""
          aria-hidden="true"
          className="rounded-xl shrink-0 object-cover"
          style={{ width: size, height: size }}
        />
      );
    }
    return (
      <span
        aria-hidden="true"
        className="grid place-items-center rounded-xl shrink-0"
        style={{ width: size, height: size, fontSize: size * 0.58, background: "var(--fv-surface-2)" }}
      >
        {icon}
      </span>
    );
  }
  const initial = (label.trim()[0] || "?").toUpperCase();
  const h = hue(label || "?");
  const bg = `linear-gradient(135deg, hsl(${h} 75% 55%), hsl(${(h + 40) % 360} 80% 50%))`;
  return (
    <span
      aria-hidden="true"
      className="grid place-items-center rounded-xl font-semibold text-white shrink-0 shadow-sm"
      style={{ width: size, height: size, background: bg, fontSize: size * 0.42 }}
    >
      {initial}
    </span>
  );
}
