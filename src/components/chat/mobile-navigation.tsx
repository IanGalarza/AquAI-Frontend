"use client";

import { motion, useAnimationControls, type Variants } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChatIcon } from "./chat-icon";
import { ChatSidebar } from "./chat-sidebar";

const DESKTOP_QUERY = "(min-width: 768px)";
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

const panelVariants: Variants = {
  closed: { x: "-100%" },
  open: { x: "0%" },
};

const backdropVariants: Variants = {
  closed: { opacity: 0 },
  open: { opacity: 1 },
};

export function MobileNavigation() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const outsidePointerRef = useRef<number | null>(null);
  const transitionIdRef = useRef(0);
  const openRef = useRef(false);
  const [isOpen, setIsOpen] = useState(false);
  const controls = useAnimationControls();

  const closeImmediately = useCallback(() => {
    transitionIdRef.current += 1;
    openRef.current = false;
    outsidePointerRef.current = null;
    controls.stop();
    controls.set("closed");
    setIsOpen(false);
    dialogRef.current?.close();
  }, [controls]);

  useEffect(() => {
    const desktop = window.matchMedia(DESKTOP_QUERY);
    const reducedMotion = window.matchMedia(REDUCED_MOTION_QUERY);
    const dialog = dialogRef.current;
    const handleViewportChange = () => {
      if (desktop.matches) closeImmediately();
    };
    const handleMotionChange = () => {
      if (!reducedMotion.matches || !dialog?.open) return;

      if (openRef.current) {
        transitionIdRef.current += 1;
        controls.stop();
        controls.set("open");
      } else {
        closeImmediately();
      }
    };

    desktop.addEventListener("change", handleViewportChange);
    reducedMotion.addEventListener("change", handleMotionChange);

    return () => {
      desktop.removeEventListener("change", handleViewportChange);
      reducedMotion.removeEventListener("change", handleMotionChange);
      transitionIdRef.current += 1;
      controls.stop();
      dialog?.close();
    };
  }, [closeImmediately, controls]);

  function openNavigation() {
    const dialog = dialogRef.current;
    if (!dialog || openRef.current || window.matchMedia(DESKTOP_QUERY).matches) return;

    transitionIdRef.current += 1;
    openRef.current = true;
    setIsOpen(true);
    if (!dialog.open) dialog.showModal();
    const reducedMotion = window.matchMedia(REDUCED_MOTION_QUERY).matches;
    void controls.start("open", reducedMotion ? { type: "tween", duration: 0 } : undefined);
  }

  function closeNavigation() {
    if (!dialogRef.current?.open || !openRef.current) return;
    if (window.matchMedia(REDUCED_MOTION_QUERY).matches) {
      closeImmediately();
      return;
    }

    const transitionId = ++transitionIdRef.current;
    openRef.current = false;
    outsidePointerRef.current = null;
    setIsOpen(false);

    // Una salida anterior nunca debe cerrar una reapertura o un cambio de pantalla.
    void controls.start("closed").then(() => {
      if (transitionId === transitionIdRef.current && !openRef.current) {
        dialogRef.current?.close();
      }
    });
  }

  function isOutsidePanel(x: number, y: number) {
    const bounds = panelRef.current?.getBoundingClientRect();
    return bounds && (x < bounds.left || x > bounds.right || y < bounds.top || y > bounds.bottom);
  }

  return (
    <>
      <button
        type="button"
        aria-label="Abrir conversaciones"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls="mobile-conversations"
        onClick={openNavigation}
        className="grid size-10 shrink-0 place-items-center rounded-lg text-foreground-secondary transition hover:bg-surface-elevated md:hidden"
      >
        <ChatIcon name="menu" />
      </button>
      <dialog
        ref={dialogRef}
        id="mobile-conversations"
        closedby="closerequest"
        aria-label="Conversaciones de AquAI"
        onCancel={(event) => {
          event.preventDefault();
          closeNavigation();
        }}
        onPointerDown={(event) => {
          outsidePointerRef.current = event.isPrimary && event.button === 0 &&
            event.target instanceof HTMLElement && event.target.hasAttribute("data-mobile-backdrop") &&
            isOutsidePanel(event.clientX, event.clientY)
            ? event.pointerId
            : null;
        }}
        onPointerUp={(event) => {
          const startedOutside = outsidePointerRef.current === event.pointerId;
          outsidePointerRef.current = null;

          if (startedOutside && isOutsidePanel(event.clientX, event.clientY)) {
            closeNavigation();
          }
        }}
        onPointerCancel={() => { outsidePointerRef.current = null; }}
        className="mobile-navigation fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none overflow-hidden border-0 bg-transparent p-0 text-foreground backdrop:bg-transparent"
      >
        <motion.div
          data-mobile-backdrop
          aria-hidden="true"
          initial="closed"
          animate={controls}
          variants={backdropVariants}
          transition={{ duration: 0.28, ease: "easeInOut" }}
          className="absolute inset-0 bg-background/65 will-change-[opacity]"
        />
        <motion.div
          ref={panelRef}
          data-mobile-panel
          initial="closed"
          animate={controls}
          variants={panelVariants}
          transition={{ type: "spring", duration: 0.34, bounce: 0 }}
          className="absolute inset-y-0 left-0 w-[min(320px,90vw)] border-r border-border bg-surface will-change-transform"
        >
          <button
            type="button"
            aria-label="Cerrar conversaciones"
            onClick={closeNavigation}
            className="absolute right-3 top-3 grid size-9 place-items-center rounded-full text-foreground-secondary transition hover:bg-surface-elevated"
          >
            <ChatIcon name="close" className="size-[18px]" />
          </button>
          <ChatSidebar />
        </motion.div>
      </dialog>
    </>
  );
}
