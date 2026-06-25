import { useEffect, type ReactNode } from "react";

/**
 * Centered modal overlay with backdrop blur and a refined surface card.
 */
export function Modal({
  open,
  onClose,
  children,
  maxWidth = "32rem",
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  maxWidth?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center p-4"
      style={{ background: "rgba(8, 11, 22, 0.45)", backdropFilter: "blur(6px)" }}
      onMouseDown={onClose}
    >
      <div
        className="fv-fade-in w-full rounded-2xl border overflow-hidden"
        style={{
          maxWidth,
          background: "var(--fv-surface)",
          borderColor: "var(--fv-border)",
          boxShadow: "var(--fv-shadow)",
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
