import { useRef, useMemo } from "react";
import { useT } from "../i18n/I18nContext";
import { BRANDS, brandDataUrl } from "./brands";

/** Big built-in icon grid (covers KeePassXC's set and more) — emoji, cross-platform, zero assets. */
const ICONS = [
  "🔑", "🔐", "🔒", "🔓", "🛡️", "🗝️", "🆔", "👤", "👥", "⚙️", "🔧", "🔨", "🛠️", "🧰", "🔌", "🔋",
  "🌐", "🖥️", "💻", "📱", "⌨️", "🖨️", "🖱️", "💾", "💿", "📀", "🗄️", "🗂️", "📁", "📂", "🗃️", "📡",
  "🛰️", "☁️", "📧", "✉️", "📨", "💬", "📞", "☎️", "📲", "📢", "🔔", "📷", "📸", "🎥", "📽️", "🎬",
  "🎵", "🎧", "🎮", "📺", "🖼️", "🎨", "🏦", "💳", "💰", "💵", "🪙", "💸", "📈", "📊", "🧾", "🛒",
  "🛍️", "📋", "📝", "🗒️", "📄", "📑", "📚", "📕", "📗", "🔖", "✏️", "🖊️", "📌", "📎", "🏠", "🏢",
  "🏥", "🏫", "✈️", "🚗", "🌍", "🗺️", "⭐", "❤️", "🔥", "💡", "🎯", "🏆", "🎁", "☕", "🍎", "⚠️",
  "❗", "❓", "✅", "❌", "👁️", "🐧", "🤖", "🪟", "📦", "🗑️", "⏰", "🕹️", "🧩", "🌟",
];

function fileToIcon(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const size = 64;
      const c = document.createElement("canvas");
      c.width = size; c.height = size;
      const ctx = c.getContext("2d");
      if (!ctx) { URL.revokeObjectURL(url); return resolve(null); }
      // contain-fit, centered
      const scale = Math.min(size / img.width, size / img.height);
      const w = img.width * scale, h = img.height * scale;
      ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/png"));
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    img.src = url;
  });
}

export function IconPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const t = useT();
  const fileRef = useRef<HTMLInputElement>(null);
  const isCustom = value.startsWith("data:") || value.startsWith("http");
  const brands = useMemo(() => BRANDS.map((b) => ({ name: b.name, url: brandDataUrl(b.inner) })), []);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    const data = await fileToIcon(file);
    if (data) onChange(data);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {/* current selection preview */}
        <span className="grid place-items-center w-10 h-10 rounded-lg border shrink-0 overflow-hidden" style={{ borderColor: "var(--fv-border)", background: "var(--fv-surface-2)" }}>
          {isCustom ? <img src={value} alt="" className="w-full h-full object-cover" /> : <span className="text-xl">{value || "—"}</span>}
        </span>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
        <button onClick={() => fileRef.current?.click()} className="fv-btn text-xs font-medium rounded-lg px-3 py-1.5 border" style={{ borderColor: "var(--fv-border)", color: "var(--fv-violet)" }}>
          🖼 {t("addCustomIcon")}
        </button>
        {value && (
          <button onClick={() => onChange("")} className="fv-btn text-xs rounded-lg px-3 py-1.5" style={{ color: "var(--fv-muted)" }}>
            {t("removeIcon")}
          </button>
        )}
      </div>

      <div className="text-[11px] uppercase tracking-wide" style={{ color: "var(--fv-faint)" }}>{t("brands")}</div>
      <div className="grid grid-cols-9 gap-1 max-h-40 overflow-auto p-2 rounded-lg border" style={{ borderColor: "var(--fv-border)", background: "var(--fv-surface-2)" }}>
        {brands.map((b) => (
          <button
            key={b.name}
            onClick={() => onChange(b.url)}
            title={b.name}
            className="fv-icon-btn grid place-items-center w-8 h-8 rounded-lg overflow-hidden"
            style={{ boxShadow: value === b.url ? "0 0 0 2px var(--fv-ring)" : "none" }}
          >
            <img src={b.url} alt={b.name} className="w-7 h-7" />
          </button>
        ))}
      </div>

      <div className="text-[11px] uppercase tracking-wide" style={{ color: "var(--fv-faint)" }}>{t("defaultIcons")}</div>
      <div className="grid grid-cols-10 gap-1 max-h-40 overflow-auto p-2 rounded-lg border" style={{ borderColor: "var(--fv-border)", background: "var(--fv-surface-2)" }}>
        {ICONS.map((ic) => (
          <button
            key={ic}
            onClick={() => onChange(ic)}
            title={ic}
            className="fv-icon-btn grid place-items-center w-8 h-8 rounded-lg text-lg"
            style={{ background: value === ic ? "var(--fv-hover)" : "transparent", boxShadow: value === ic ? "0 0 0 2px var(--fv-ring)" : "none" }}
          >
            {ic}
          </button>
        ))}
      </div>
    </div>
  );
}
