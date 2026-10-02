"use client";

import { useSyncExternalStore } from "react";
import { WaterAtmosphere } from "./water-atmosphere";
import { WaterWaves } from "./water-waves";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeToAnimationPreference(onChange: () => void) {
  const mediaQuery = window.matchMedia(REDUCED_MOTION_QUERY);
  mediaQuery.addEventListener("change", onChange);
  document.addEventListener("visibilitychange", onChange);

  return () => {
    mediaQuery.removeEventListener("change", onChange);
    document.removeEventListener("visibilitychange", onChange);
  };
}

function getAnimationSnapshot() {
  return !window.matchMedia(REDUCED_MOTION_QUERY).matches && document.visibilityState === "visible";
}

function getServerAnimationSnapshot() {
  return false;
}

export function WaterBackground() {
  const canAnimate = useSyncExternalStore(
    subscribeToAnimationPreference,
    getAnimationSnapshot,
    getServerAnimationSnapshot,
  );

  return (
    <div className="water-background pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <WaterAtmosphere canAnimate={canAnimate} />
      {canAnimate && <WaterWaves />}
    </div>
  );
}
