"use client";

import { useRef } from "react";
import { ChatIcon } from "./chat-icon";
import { ChatSidebar } from "./chat-sidebar";

export function MobileNavigation() {
  const dialogRef = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button
        type="button"
        aria-label="Abrir conversaciones"
        aria-haspopup="dialog"
        onClick={() => dialogRef.current?.showModal()}
        className="grid size-10 shrink-0 place-items-center rounded-lg text-foreground-secondary transition hover:bg-surface-elevated md:hidden"
      >
        <ChatIcon name="menu" />
      </button>
      <dialog
        ref={dialogRef}
        aria-label="Conversaciones de AquAI"
        className="mobile-navigation m-0 h-dvh max-h-none w-[min(320px,90vw)] max-w-none border-r border-border bg-surface text-foreground"
      >
        <button
          type="button"
          aria-label="Cerrar conversaciones"
          onClick={() => dialogRef.current?.close()}
          className="absolute right-3 top-3 grid size-9 place-items-center rounded-full text-foreground-secondary transition hover:bg-surface-elevated"
        >
          <ChatIcon name="close" className="size-[18px]" />
        </button>
        <ChatSidebar />
      </dialog>
    </>
  );
}
