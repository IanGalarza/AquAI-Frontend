"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { ChatIcon } from "../chat/chat-icon";

type SourceDetailModalProps = {
  children: ReactNode;
  onClose: () => void;
  onRefresh: () => void;
  refreshing: boolean;
};

export function SourceDetailModal({ children, onClose, onRefresh, refreshing }: SourceDetailModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const outsidePointerRef = useRef<number | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    closeRef.current?.focus({ preventScroll: true });
    return () => { dialog.close(); };
  }, []);

  function isOutside(x: number, y: number) {
    const bounds = dialogRef.current?.getBoundingClientRect();
    return bounds && (x < bounds.left || x > bounds.right || y < bounds.top || y > bounds.bottom);
  }

  function closeModal() {
    dialogRef.current?.close();
    onClose();
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="source-detail-title"
      closedby="closerequest"
      onCancel={(event) => {
        event.preventDefault();
        event.stopPropagation();
        closeModal();
      }}
      onPointerDown={(event) => {
        outsidePointerRef.current = event.isPrimary && event.button === 0 &&
          event.target === event.currentTarget && isOutside(event.clientX, event.clientY)
          ? event.pointerId : null;
      }}
      onPointerUp={(event) => {
        const startedOutside = outsidePointerRef.current === event.pointerId;
        outsidePointerRef.current = null;
        if (startedOutside && isOutside(event.clientX, event.clientY)) closeModal();
      }}
      onPointerCancel={() => { outsidePointerRef.current = null; }}
      className="fixed inset-0 m-auto h-[85dvh] max-h-[900px] w-[92vw] max-w-[960px] overflow-hidden rounded-3xl border-0 bg-background p-0 text-foreground shadow-2xl backdrop:bg-black/55 backdrop:backdrop-blur-sm"
    >
      <div className="flex h-full flex-col">
        <header className="flex shrink-0 items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex min-w-0 items-center gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><ChatIcon name="file" className="size-5" /></span><h2 id="source-detail-title" className="text-sm font-semibold tracking-[-0.02em] sm:text-base">Detalle de la fuente</h2></div>
          <div className="flex shrink-0 items-center gap-1">
            <button type="button" onClick={onRefresh} disabled={refreshing} aria-label="Actualizar fuente" title="Actualizar fuente" className="grid size-10 place-items-center rounded-lg text-foreground-secondary transition enabled:hover:bg-surface-elevated enabled:hover:text-foreground disabled:opacity-45"><ChatIcon name="refresh" className={`size-[18px] ${refreshing ? "animate-spin motion-reduce:animate-none" : ""}`} /></button>
            <button ref={closeRef} type="button" onClick={closeModal} aria-label="Cerrar detalle" title="Cerrar detalle" className="grid size-10 place-items-center rounded-lg text-foreground-secondary transition hover:bg-surface-elevated hover:text-foreground"><ChatIcon name="close" className="size-5" /></button>
          </div>
        </header>
        <div className="min-h-0 flex-1 space-y-4 overflow-x-hidden overflow-y-auto overscroll-y-contain p-4 sm:p-6">{children}</div>
      </div>
    </dialog>
  );
}
