"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

type ConfirmDialogProps = {
  title: string;
  children: ReactNode;
  busy?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
};

//
// Muestra un diálogo modal de confirmación con acciones de aceptar y cancelar.
//
export function ConfirmDialog({ title, children, busy = false, error, onConfirm, onCancel }: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const messageId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    return () => { dialog.close(); };
  }, []);

  const close = () => dialogRef.current?.close();

  return createPortal(
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={messageId}
      closedby="closerequest"
      onCancel={(event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!busy) close();
      }}
      onClose={(event) => {
        if (!event.currentTarget.open) onCancel();
      }}
      className="fixed inset-0 m-auto h-fit w-[92vw] max-w-[420px] rounded-md border border-border bg-background p-6 text-foreground shadow-2xl backdrop:bg-black/55"
    >
      <h2 id={titleId} className="text-base font-semibold tracking-[-0.02em]">{title}</h2>
      <p id={messageId} className="mt-2 text-sm leading-relaxed text-foreground-secondary [overflow-wrap:anywhere]">{children}</p>
      {error && <p role="alert" className="mt-3 text-xs leading-relaxed text-error">{error}</p>}
      <div className="mt-6 flex justify-end gap-2">
        <button type="button" onClick={close} disabled={busy} className="min-h-10 rounded-sm border border-border px-5 text-sm font-medium transition enabled:hover:bg-surface-elevated disabled:opacity-50">No</button>
        <button type="button" onClick={onConfirm} disabled={busy} className="min-h-10 rounded-sm border border-error/40 bg-error/10 px-5 text-sm font-semibold text-error transition enabled:hover:bg-error/20 disabled:opacity-50">Sí</button>
      </div>
    </dialog>,
    document.body,
  );
}
