const VIEWPORT_PADDING = 12;
const GAP = 10;

//
// Posiciona un elemento flotante sobre su disparador sin salirse de la ventana.
//
export function placeFloating(anchor: HTMLElement, floating: HTMLElement) {
  const trigger = anchor.getBoundingClientRect();
  const bounds = floating.getBoundingClientRect();
  const above = trigger.top - bounds.height - GAP;
  const left = trigger.left + (trigger.width - bounds.width) / 2;
  floating.style.left = `${Math.max(VIEWPORT_PADDING, Math.min(left, window.innerWidth - bounds.width - VIEWPORT_PADDING))}px`;
  floating.style.top = `${Math.max(VIEWPORT_PADDING, above >= VIEWPORT_PADDING ? above : Math.min(trigger.bottom + GAP, window.innerHeight - bounds.height - VIEWPORT_PADDING))}px`;
}

//
// Anima la aparición de un elemento flotante salvo con movimiento reducido.
//
export function revealFloating(floating: HTMLElement) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  floating.animate([{ opacity: 0, transform: "translateY(4px)" }, { opacity: 1, transform: "translateY(0)" }], { duration: 140, easing: "ease-out" });
}
