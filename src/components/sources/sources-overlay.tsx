"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { SourceManager } from "./source-manager";

//
// Muestra el administrador de fuentes en un diálogo a pantalla completa sobre el chat.
//
export function SourcesOverlay() {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    dialog.showModal();
    dialog.querySelector<HTMLButtonElement>("button")?.focus({ preventScroll: true });

    return () => { dialog.close(); };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-label="Administrar fuentes"
      closedby="closerequest"
      onCancel={(event) => {
        if (event.target !== event.currentTarget) return;
        event.preventDefault();
        router.back();
      }}
      className="fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none overflow-hidden border-0 bg-background p-0 text-foreground backdrop:bg-background"
    >
      <SourceManager onBack={() => router.back()} />
    </dialog>
  );
}
