"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { ChatIcon } from "../chat/chat-icon";
import type { SourceDetail, SourceListItem } from "@/types/sources";
import { formatBytes } from "@/utils/sources";

type SourceDetailModalProps = {
  children: ReactNode;
  source: SourceDetail | SourceListItem | null;
  onClose: () => void;
  onRefresh: () => void;
  refreshing: boolean;
};

//
// Muestra el detalle de una fuente en un diálogo modal con acciones de actualizar y cerrar.
//
export function SourceDetailModal({ children, source, onClose, onRefresh, refreshing }: SourceDetailModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const outsidePointerRef = useRef<number | null>(null);
  const filename = source && ("original_filename" in source ? source.original_filename : source.name);

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
      className="fixed inset-0 m-auto h-[85dvh] max-h-[900px] w-[92vw] max-w-[960px] overflow-hidden rounded-md border border-border bg-background p-0 text-foreground shadow-2xl backdrop:bg-black/55 "
    >
      <div className="flex h-full flex-col">
        <header className="flex shrink-0 items-start justify-between gap-3 px-4 pb-3 pt-4 sm:px-6 sm:pt-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-sm bg-primary/10 text-primary"><ChatIcon name="file" className="size-6" /></span>
            <div className="min-w-0">
              <h2 id="source-detail-title" className="break-words text-base font-semibold leading-snug tracking-[-0.02em] [overflow-wrap:anywhere] sm:text-lg">{filename || "Consultando la fuente…"}</h2>
              {source && <p className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-foreground-secondary"><span className="rounded-md bg-surface-elevated/70 px-1.5 py-0.5 font-medium">{source.file_type.toUpperCase()}</span><span>{formatBytes(source.file_size_bytes)}</span></p>}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button type="button" onClick={onRefresh} disabled={refreshing} aria-label="Actualizar fuente" title="Actualizar fuente" className="grid size-10 place-items-center rounded-sm text-foreground-secondary transition enabled:hover:bg-surface-elevated enabled:hover:text-foreground disabled:opacity-45"><ChatIcon name="refresh" className={`size-[18px] ${refreshing ? "animate-spin motion-reduce:animate-none" : ""}`} /></button>
            <button ref={closeRef} type="button" onClick={closeModal} aria-label="Cerrar detalle" title="Cerrar detalle" className="grid size-10 place-items-center rounded-sm text-foreground-secondary transition hover:bg-surface-elevated hover:text-foreground"><ChatIcon name="close" className="size-5" /></button>
          </div>
        </header>
        <div className="min-h-0 flex-1 space-y-4 overflow-x-hidden overflow-y-auto overscroll-y-contain px-4 pb-4 pt-2 sm:px-6 sm:pb-6 sm:pt-3">{children}</div>
      </div>
    </dialog>
  );
}
