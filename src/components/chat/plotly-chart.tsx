"use client";

import { useEffect, useRef, useState } from "react";
import type { Config, Data, Layout } from "plotly.js";
import { useTheme } from "@/hooks/use-theme";
import type { PlotlyFigure } from "@/types/conversations";

type PlotlyApi = typeof import("plotly.js");
let renderer: Promise<PlotlyApi> | undefined;
function loadRenderer() {
  renderer ??= import("plotly.js-basic-dist-min").then((module) => module.default).catch((error) => {
    renderer = undefined;
    throw error;
  });
  return renderer;
}

export function PlotlyChart({ figure, title }: { figure: PlotlyFigure; title: string }) {
  const container = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const element = container.current;
    if (!element) return;
    let disposed = false;
    let plotly: PlotlyApi | undefined;
    let observer: ResizeObserver | undefined;
    async function draw() {
      try {
        if (figure.data.some((trace) => !["scatter", "bar"].includes(String(trace.type)))) {
          throw new Error("unsupported_trace");
        }
        const loaded = await loadRenderer();
        if (disposed) return;
        plotly = loaded;
        // Plotly puede mutar sus entradas: nunca pasarle la instantánea persistida.
        const data = structuredClone(figure.data) as unknown as Data[];
        const layout = structuredClone(figure.layout) as unknown as Partial<Layout>;
        const colors = getComputedStyle(document.documentElement);
        const foreground = colors.getPropertyValue("--foreground").trim();
        const border = colors.getPropertyValue("--border").trim();
        layout.paper_bgcolor = colors.getPropertyValue("--surface").trim();
        layout.plot_bgcolor = layout.paper_bgcolor;
        layout.font = { ...layout.font, color: foreground };
        // Sólo colores de presentación; títulos, escalas, unidades y trazas son del backend.
        for (const axis of [layout.xaxis, layout.yaxis]) {
          if (!axis) continue;
          axis.color = foreground;
          axis.linecolor = border;
          axis.gridcolor = border;
        }
        if (layout.annotations) layout.annotations = layout.annotations.map((item) => ({ ...item, font: { ...item.font, color: foreground } }));
        await loaded.react(element!, data, layout, structuredClone(figure.config) as Partial<Config>);
        if (disposed) return;
        observer = new ResizeObserver(() => { if (element!.isConnected) void loaded.Plots.resize(element!); });
        observer.observe(element!);
        setReady(true);
        setError(null);
      } catch {
        if (!disposed) setError("No se pudo mostrar esta figura interactiva. Sus datos y resultados originales permanecen en el mensaje.");
      }
    }
    void draw();
    return () => {
      disposed = true;
      observer?.disconnect();
      if (plotly) plotly.purge(element);
    };
  }, [figure, theme]);

  return (
    <div className="relative min-w-0" data-plotly-figure>
      {!ready && !error && <p role="status" className="p-4 text-sm text-foreground-secondary">Cargando gráfico interactivo…</p>}
      {error && <p role="alert" className="rounded-sm border border-warning/30 bg-warning/5 p-4 text-sm text-warning">{error}</p>}
      <div ref={container} role="img" aria-label={title} className={error ? "hidden" : "w-full min-w-0"}
        style={{ height: typeof figure.layout.height === "number" ? figure.layout.height : 500 }} />
    </div>
  );
}
