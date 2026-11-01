"use client";

import { useSyncExternalStore } from "react";
import { WaterAtmosphere } from "./water-atmosphere";
import { WaterWaves } from "./water-waves";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

//
// Suscribe un cambio a la preferencia de movimiento reducido y a la visibilidad de la pestaña.
//
function subscribeToAnimationPreference(onChange: () => void) {
  const mediaQuery = window.matchMedia(REDUCED_MOTION_QUERY);
  mediaQuery.addEventListener("change", onChange);
  document.addEventListener("visibilitychange", onChange);

  return () => {
    mediaQuery.removeEventListener("change", onChange);
    document.removeEventListener("visibilitychange", onChange);
  };
}

//
// Indica si el fondo puede animarse según el movimiento reducido y la visibilidad.
//
function getAnimationSnapshot() {
  return !window.matchMedia(REDUCED_MOTION_QUERY).matches && document.visibilityState === "visible";
}

//
// Devuelve que no hay animación en el servidor para coincidir con la hidratación.
//
function getServerAnimationSnapshot() {
  return false;
}

type WaterBackgroundProps = {
  subdued?: boolean;
};

//
// Muestra el fondo de agua, animado o atenuado según la preferencia del usuario.
//
export function WaterBackground({ subdued = false }: WaterBackgroundProps) {
  const canAnimate = useSyncExternalStore(
    subscribeToAnimationPreference,
    getAnimationSnapshot,
    getServerAnimationSnapshot,
  );

  return (
    <div className="water-background pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {subdued ? (
        <div className="water-glow water-glow-bottom opacity-30" />
      ) : (
        <>
          <WaterAtmosphere canAnimate={canAnimate} />
          {canAnimate && <WaterWaves />}
        </>
      )}
    </div>
  );
}
