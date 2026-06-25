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
        className="flex-1 px-3 py-2 rounded-lg border bg-transparent"
        style={{ borderColor: "var(--fv-border)", color: "var(--fv-text)" }}
      />
      <button className="px-2 py-1 rounded hover:bg-black/5 dark:hover:bg-white/10" onClick={() => setShow((s) => !s)} aria-label="toggle">
        {show ? "🙈" : "👁"}
      </button>
      {onCopy && (
        <button className="px-2 py-1 rounded hover:bg-black/5 dark:hover:bg-white/10" onClick={onCopy} aria-label="copy">📋</button>
      )}
    </div>
  );
}
