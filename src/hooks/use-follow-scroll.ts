"use client";

import { useEffect, type RefObject } from "react";

const FOLLOW_THRESHOLD_PX = 96;
const REVEAL_TOP_GAP_PX = 16;

//
// Acompaña el final de la conversación mientras crece si el usuario estaba al final, y se detiene cuando
// el comienzo de la respuesta que se está escribiendo llega arriba, para leerla desde el principio. Solo un
// desplazamiento del usuario hacia arriba lo interrumpe. Se reinicia cuando cambia el contenido.
//
export function useFollowScroll(scrollRef: RefObject<HTMLElement | null>, content: string) {
  useEffect(() => {
    const viewport = scrollRef.current;
    if (!viewport) return;
    const atBottom = () => viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight <= FOLLOW_THRESHOLD_PX;
    let following = atBottom();
    let placed = viewport.scrollTop;
    const measure = () => {
      if (atBottom()) following = true;
      else if (viewport.scrollTop < placed) following = false;
    };
    const follow = () => {
      if (!following) return;
      const bottom = viewport.scrollHeight - viewport.clientHeight;
      const revealing = viewport.querySelector("[data-revealing]");
      const start = revealing
        ? revealing.getBoundingClientRect().top - viewport.getBoundingClientRect().top + viewport.scrollTop - REVEAL_TOP_GAP_PX
        : bottom;
      if (start < bottom) following = false;
      const target = Math.min(bottom, start);
      if (target > viewport.scrollTop) viewport.scrollTop = placed = target;
    };
    const observer = new ResizeObserver(follow);
    for (const child of Array.from(viewport.children)) observer.observe(child);
    viewport.addEventListener("scroll", measure, { passive: true });
    return () => {
      observer.disconnect();
      viewport.removeEventListener("scroll", measure);
    };
  }, [scrollRef, content]);
}
