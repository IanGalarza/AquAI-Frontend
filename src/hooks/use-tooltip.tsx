"use client";

import { useCallback, useEffect, useId, useRef, type ReactNode } from "react";

const OPEN_DELAY_MS = 1000;
const CLOSE_DELAY_MS = 120;

export function useTooltip<T extends HTMLElement>(content: ReactNode) {
  const id = useId();
  const triggerRef = useRef<T>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pointerType = useRef("mouse");
  const enabled = content !== null;

  const clearTimers = useCallback(() => {
    if (openTimer.current !== null) clearTimeout(openTimer.current);
    if (closeTimer.current !== null) clearTimeout(closeTimer.current);
    openTimer.current = null;
    closeTimer.current = null;
  }, []);

  const closeTooltip = useCallback(() => {
    clearTimers();
    const tooltip = tooltipRef.current;
    if (tooltip?.matches(":popover-open")) tooltip.hidePopover();
  }, [clearTimers]);

  const showTooltip = useCallback(() => {
    clearTimers();
    const trigger = triggerRef.current;
    const tooltip = tooltipRef.current;
    if (!enabled || !trigger || !tooltip?.isConnected || tooltip.matches(":popover-open")) return;

    tooltip.showPopover();
    const anchor = trigger.getBoundingClientRect();
    const bounds = tooltip.getBoundingClientRect();
    const padding = 12;
    const gap = 10;
    const above = anchor.top - bounds.height - gap;
    tooltip.style.left = `${Math.max(padding, Math.min(anchor.left + (anchor.width - bounds.width) / 2, window.innerWidth - bounds.width - padding))}px`;
    tooltip.style.top = `${Math.max(padding, above >= padding ? above : Math.min(anchor.bottom + gap, window.innerHeight - bounds.height - padding))}px`;
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      tooltip.animate([{ opacity: 0, transform: "translateY(4px)" }, { opacity: 1, transform: "translateY(0)" }], { duration: 140, easing: "ease-out" });
    }
  }, [clearTimers, enabled]);

  function scheduleOpen(delay = OPEN_DELAY_MS) {
    clearTimers();
    openTimer.current = setTimeout(showTooltip, delay);
  }

  function scheduleClose() {
    clearTimers();
    closeTimer.current = setTimeout(closeTooltip, CLOSE_DELAY_MS);
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape" || !tooltipRef.current?.matches(":popover-open")) return;
      event.preventDefault();
      event.stopPropagation();
      closeTooltip();
    }
    function onPointerDown(event: PointerEvent) {
      if (event.target instanceof Node && !triggerRef.current?.contains(event.target) && !tooltipRef.current?.contains(event.target)) closeTooltip();
    }
    function onScroll() {
      if (tooltipRef.current?.matches(":popover-open")) closeTooltip();
    }
    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", closeTooltip);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", closeTooltip);
      closeTooltip();
    };
  }, [closeTooltip]);

  return {
    triggerProps: {
      ref: triggerRef,
      "aria-describedby": enabled ? id : undefined,
      onPointerEnter: (event: React.PointerEvent<T>) => { if (event.pointerType !== "touch") scheduleOpen(); },
      onPointerLeave: scheduleClose,
      onPointerDown: (event: React.PointerEvent<T>) => { pointerType.current = event.pointerType; },
      onPointerCancel: closeTooltip,
      onFocus: (event: React.FocusEvent<T>) => { if (event.currentTarget.matches(":focus-visible")) scheduleOpen(0); },
      onBlur: scheduleClose,
      onClick: (event: React.MouseEvent<T>) => {
        if (pointerType.current !== "touch" && event.detail !== 0) return;
        if (tooltipRef.current?.matches(":popover-open")) closeTooltip();
        else showTooltip();
      },
    },
    tooltip: enabled ? <div
      ref={tooltipRef}
      id={id}
      role="tooltip"
      popover="manual"
      onPointerEnter={clearTimers}
      onPointerLeave={scheduleClose}
      className="fixed inset-auto m-0 w-max max-w-[min(288px,calc(100vw-24px))] max-h-[calc(100dvh-24px)] overflow-y-auto rounded-xl border-0 bg-surface-elevated p-3.5 text-left text-xs leading-relaxed text-foreground shadow-xl shadow-black/20 backdrop:bg-transparent"
    ><div className="space-y-2">{content}</div></div> : null,
  };
}
