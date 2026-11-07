"use client";

import { useEffect, useEffectEvent, useState } from "react";

const MIN_CHARACTERS_PER_SECOND = 450;
const MAX_REVEAL_MS = 2200;

//
// Indica si el usuario pidió reducir el movimiento de la interfaz.
//
function reducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

//
// Calcula los caracteres visibles según el tiempo transcurrido, con una velocidad que acota la duración total.
//
function revealedCharacters(total: number, startedAt: number): number {
  if (reducedMotion()) return total;
  const rate = Math.max(MIN_CHARACTERS_PER_SECOND, (total * 1000) / MAX_REVEAL_MS);
  return Math.min(total, Math.floor(((performance.now() - startedAt) / 1000) * rate));
}

//
// Devuelve cuántos caracteres mostrar de una respuesta que se escribe desde startedAt y avisa al terminar.
// El avance depende solo del tiempo, así que se retoma igual si el componente se vuelve a montar.
//
export function useReveal(total: number, startedAt: number | undefined, onRevealed: () => void): number {
  const [shown, setShown] = useState(() => startedAt === undefined ? total : revealedCharacters(total, startedAt));
  const finish = useEffectEvent(onRevealed);

  useEffect(() => {
    if (startedAt === undefined) return;
    let frame = requestAnimationFrame(function tick() {
      const next = revealedCharacters(total, startedAt);
      setShown(next);
      if (next < total) frame = requestAnimationFrame(tick);
      else finish();
    });
    return () => cancelAnimationFrame(frame);
  }, [total, startedAt]);

  return startedAt === undefined ? total : shown;
}
