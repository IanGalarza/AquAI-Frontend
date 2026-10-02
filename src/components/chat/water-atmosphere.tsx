"use client";

import { animate } from "motion/mini";
import { useEffect, useRef } from "react";

const ORBIT_SAMPLES = 64;

const particles = [
  { left: "8%", top: "56%", size: 3, drift: 10, rise: 22, duration: 24 },
  { left: "3.5%", top: "65%", size: 2.5, drift: -8, rise: 16, duration: 29 },
  { left: "19%", top: "68%", size: 3, drift: 14, rise: 24, duration: 26 },
  { left: "28%", top: "76%", size: 2, drift: -12, rise: 20, duration: 32 },
  { left: "86%", top: "50%", size: 3, drift: -10, rise: 26, duration: 28 },
  { left: "94%", top: "59%", size: 2.5, drift: 8, rise: 18, duration: 23 },
  { left: "84%", top: "68%", size: 3, drift: -14, rise: 22, duration: 31 },
  { left: "97%", top: "75%", size: 2, drift: 10, rise: 16, duration: 27 },
].map((particle) => ({
  ...particle,
  // Un circuito periódico evita frenadas y cambios bruscos al cerrar cada vuelta.
  orbit: Array.from({ length: ORBIT_SAMPLES + 1 }, (_, frame) => {
    const phase = (frame / ORBIT_SAMPLES) * Math.PI * 2;
    const x = particle.drift * Math.sin(phase);
    const y = (particle.rise / 2) * (Math.cos(phase) - 1);
    return `translate3d(${x.toFixed(4)}px, ${y.toFixed(4)}px, 0)`;
  }),
  opacity: Array.from({ length: ORBIT_SAMPLES + 1 }, (_, frame) =>
    0.8 - Math.cos((frame / ORBIT_SAMPLES) * Math.PI * 2) * 0.2,
  ),
}));

export function WaterAtmosphere({ canAnimate }: { canAnimate: boolean }) {
  const atmosphereRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const atmosphere = atmosphereRef.current;
    if (!canAnimate || !atmosphere) return;

    const animations = Array.from(atmosphere.querySelectorAll<HTMLElement>(".water-particle")).map((element, index) => {
      const { orbit, opacity, duration } = particles[index];

      return animate(
        element,
        {
          transform: orbit,
          opacity,
        },
        { duration, delay: -index * 3.5, repeat: Infinity, ease: "linear" },
      );
    });

    atmosphere.querySelectorAll<HTMLElement>(".water-glow").forEach((element, index) => {
      animations.push(animate(
        element,
        {
          transform: [
            "translate3d(0, 0, 0) scale(1)",
            "translate3d(20px, -12px, 0) scale(1.06)",
            "translate3d(-8px, 8px, 0) scale(0.98)",
            "translate3d(0, 0, 0) scale(1)",
          ],
          opacity: [0.7, 1, 0.8, 0.7],
        },
        { duration: 38 + index * 9, delay: -index * 11, repeat: Infinity, ease: "easeInOut" },
      ));
    });

    // Se cancelan las animaciones nativas al ocultar la pestaña o reducir el movimiento.
    return () => animations.forEach((animation) => animation.cancel());
  }, [canAnimate]);

  return (
    <div ref={atmosphereRef} className="water-atmosphere absolute inset-0" data-animating={canAnimate}>
      <div className="water-glow water-glow-top" />
      <div className="water-glow water-glow-bottom" />
      <div className="water-glow water-glow-crest" />
      {particles.map(({ left, top, size }) => (
        <span
          key={left}
          className="water-particle"
          style={{ left, top, width: size, height: size }}
        />
      ))}
    </div>
  );
}
