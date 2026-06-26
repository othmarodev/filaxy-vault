import { Modal } from "./Modal";
import { Button } from "./Button";
import { useT } from "../i18n/I18nContext";

/**
 * Reusable confirmation popup for destructive actions. ALWAYS use this before
 * deleting anything — never a silent delete or the native browser confirm().
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const t = useT();
  return (
    <Modal open={open} onClose={onCancel} maxWidth="24rem">
      <div className="p-6 text-center">
        <div className="grid place-items-center mx-auto mb-3 w-12 h-12 rounded-full" style={{ background: "rgba(239,68,68,0.12)" }}>
          <span className="text-2xl">⚠️</span>
        </div>
        <h3 className="text-lg font-semibold mb-1" style={{ color: "var(--fv-text)" }}>{title ?? t("confirmTitle")}</h3>
        <p className="text-sm mb-5" style={{ color: "var(--fv-muted)" }}>{message}</p>
        <div className="flex gap-2 justify-center">
          <Button variant="ghost" onClick={onCancel}>{t("cancel")}</Button>
          <Button variant="danger" onClick={onConfirm} autoFocus>🗑 {confirmLabel ?? t("delete")}</Button>
        </div>
      </div>
    </Modal>
  );
}
