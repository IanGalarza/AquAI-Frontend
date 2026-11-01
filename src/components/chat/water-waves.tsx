"use client";

import { area, curveBasis } from "d3-shape";
import { animate } from "motion";
import { useEffect, useId, useRef } from "react";

type WavePoint = [number, number];

const WIDTH = 1440;
const HEIGHT = 360;
const FRAME_COUNT = 32;
const POINT_COUNT = 32;

const waveShape = area<WavePoint>()
  .x(([x]) => x)
  .y0(HEIGHT)
  .y1(([, y]) => y)
  .curve(curveBasis);

const waveLayers = [
  { name: "back", baseline: 135, amplitude: 146, frequency: 1, phase: 0.45, duration: 48, opacity: 0.06, strokeOpacity: 0.22 },
  { name: "front", baseline: 80, amplitude: 168, frequency: 1.1, phase: 0, duration: 40, opacity: 0.18, strokeOpacity: 0.8 },
].map((layer) => ({
  ...layer,
  frames: Array.from({ length: FRAME_COUNT + 1 }, (_, frame) => {
    const phase = layer.phase + (frame / FRAME_COUNT) * Math.PI * 2;
    const points = Array.from({ length: POINT_COUNT + 1 }, (_, point): WavePoint => {
      const x = -120 + (point / POINT_COUNT) * (WIDTH + 240);
      const position = x / WIDTH;
      const swell = (1 - Math.cos((position - 0.08) * Math.PI * 2 * layer.frequency + phase)) / 2;
      const ripple = Math.sin(position * Math.PI * 4 + phase * 2) * 5;
      return [x, layer.baseline + swell * layer.amplitude + ripple];
    });
    return waveShape(points) ?? "";
  }),
}));

//
// Renderiza las olas animadas del fondo con capas SVG.
//
export function WaterWaves() {
  const gradientId = useId();
  const wavesRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const waves = wavesRef.current;
    if (!waves) return;

    const animations = waveLayers.flatMap(({ name, frames, duration }) => {
      const path = waves.querySelector<SVGPathElement>(`[data-wave="${name}"]`);
      if (!path) return [];
      return [animate(path, { attrD: frames }, { duration, repeat: Infinity, ease: "linear" })];
    });

    return () => animations.forEach((animation) => animation.cancel());
  }, []);

  return (
    <svg ref={wavesRef} className="water-waves" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none">
      <defs>
        {waveLayers.map(({ name, opacity, strokeOpacity }) => (
          <g key={name}>
            <linearGradient id={`${gradientId}-${name}-fill`} x1="0" y1="0" x2="0" y2="1">
              <stop stopColor="var(--primary)" stopOpacity={opacity} />
              <stop offset="0.45" stopColor="var(--primary)" stopOpacity={opacity * 0.35} />
              <stop offset="0.9" stopColor="var(--primary)" stopOpacity="0" />
            </linearGradient>
            <linearGradient id={`${gradientId}-${name}-line`} x1="0" y1="0" x2="1" y2="0">
              <stop stopColor="var(--primary-light)" stopOpacity={strokeOpacity} />
              <stop offset="0.5" stopColor="var(--primary)" stopOpacity={strokeOpacity * 0.2} />
              <stop offset="1" stopColor="var(--primary-light)" stopOpacity={strokeOpacity * 0.65} />
            </linearGradient>
          </g>
        ))}
      </defs>
      {waveLayers.map(({ name, frames }) => (
        <path
          key={name}
          className="water-wave"
          data-wave={name}
          d={frames[0]}
          fill={`url(#${gradientId}-${name}-fill)`}
          stroke={`url(#${gradientId}-${name}-line)`}
          strokeWidth={1.1}
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  );
}
