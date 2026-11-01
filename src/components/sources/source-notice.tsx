"use client";

import { useEffect, useRef } from "react";
import type { Notice } from "../../hooks/use-transient-notice";
import { ChatIcon } from "../chat/chat-icon";

//
// Muestra una notificación transitoria como ventana emergente que se puede cerrar.
//
export function SourceNotice({ notice, onDismiss }: { notice: Notice | null; onDismiss: () => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element || !notice) return;
    let active = true;
    queueMicrotask(() => {
      if (active && element.isConnected) element.showPopover();
    });
    return () => {
      active = false;
      if (element.matches(":popover-open")) element.hidePopover();
    };
  }, [notice]);

  const error = notice?.tone === "error";
  const color = error ? "text-error" : notice?.tone === "info" ? "text-primary" : "text-success";

  return (
    <div ref={ref} popover="manual" role={error ? "alert" : "status"} aria-live={error ? "assertive" : "polite"} aria-atomic="true"
      className="fixed inset-auto right-4 top-4 m-0 w-[calc(100vw-2rem)] max-w-sm rounded-sm border border-border bg-surface p-3.5 text-foreground shadow-lg shadow-black/20 sm:right-6 sm:top-6">
      {notice && <div className="flex items-start gap-3">
        <ChatIcon name={error ? "alert-circle" : notice.tone === "info" ? "message" : "check-circle"} className={`mt-0.5 size-5 shrink-0 ${color}`} />
        <p className="min-w-0 flex-1 text-sm leading-6">{notice.message}</p>
        <button type="button" onClick={onDismiss} aria-label="Cerrar notificación" className="grid size-7 shrink-0 place-items-center rounded-sm text-foreground-secondary transition-colors hover:bg-surface-elevated hover:text-foreground"><ChatIcon name="close" className="size-4" /></button>
      </div>}
    </div>
  );
}
