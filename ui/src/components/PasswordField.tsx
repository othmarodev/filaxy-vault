import { useState } from "react";

export function PasswordField({
  value, onChange, readOnly, onCopy,
}: { value: string; onChange?: (v: string) => void; readOnly?: boolean; onCopy?: () => void }) {
  const [show, setShow] = useState(false);
  return (
    <div className="flex items-center gap-2">
      <input
        type={show ? "text" : "password"}
        value={value}
        readOnly={readOnly}
        onChange={(e) => onChange?.(e.target.value)}
        className="flex-1 px-3 py-2 rounded-lg border text-sm"
        style={{ background: "var(--fv-surface-2)", borderColor: "var(--fv-border)", color: "var(--fv-text)" }}
      />
      <button type="button" className="fv-icon-btn grid place-items-center w-9 h-9 rounded-lg hover:bg-black/5 dark:hover:bg-white/10" onClick={() => setShow((s) => !s)} aria-label="toggle">
        {show ? "🙈" : "👁"}
      </button>
      {onCopy && (
        <button type="button" className="fv-icon-btn grid place-items-center w-9 h-9 rounded-lg hover:bg-black/5 dark:hover:bg-white/10" onClick={onCopy} aria-label="copy">📋</button>
      )}
    </div>
  );
}
