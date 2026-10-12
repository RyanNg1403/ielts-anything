import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

/** A modal asking the learner to confirm a destructive action. Rendered on <body> so no transformed parent traps it. */
export function ConfirmDialog({
  title,
  children,
  action,
  onConfirm,
  onCancel,
}: {
  title: string;
  children: ReactNode;
  action: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [onCancel]);

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-scrim px-4" onClick={onCancel}>
      <div role="alertdialog" aria-modal aria-label={title} className="w-full max-w-sm rounded-2xl bg-surface p-6 shadow-[var(--shadow-float)]" onClick={(e) => e.stopPropagation()}>
        <p className="font-serif text-[20px] text-ink">{title}</p>
        <div className="mt-2 text-[14px] text-ink-soft">{children}</div>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onCancel} className="rounded-lg px-3.5 py-2 text-[14px] text-ink hover:bg-selected">
            Cancel
          </button>
          <button autoFocus onClick={onConfirm} className="rounded-lg bg-danger px-3.5 py-2 text-[14px] font-medium text-surface hover:opacity-90">
            {action}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
