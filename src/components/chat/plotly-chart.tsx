"use client";

import { useEffect, useRef, useState } from "react";
import type { Config, Data, Layout, LayoutAxis } from "plotly.js";
import { useTheme } from "@/hooks/use-theme";
import type { ChartView, JsonValue, PlotlyFigure } from "@/types/conversations";

type PlotlyApi = typeof import("plotly.js");
type Trace = Data & { type?: string; x?: unknown[]; y?: unknown[]; width?: unknown; marker?: Record<string, unknown>; line?: Record<string, unknown> };
type Responsive = { bargap?: number; tickvals?: JsonValue[]; ticktext?: JsonValue[] };
type Labels = Pick<ChartView, "x_title" | "y_title" | "legend_title">;

const CHART_HEIGHT = 340;
const PLOT_MARGINS_PX = 96;
const MAX_BAR_PX = 32;
const MIN_TICK_PX = 64;
const MANY_CATEGORIES = 12;
const RESIZE_DEBOUNCE_MS = 120;
const palettes = {
  light: ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#6250d6", "#e34948"],
  dark: ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#008300", "#9085e9", "#e66767"],
};

let renderer: Promise<PlotlyApi> | undefined;

//
// Carga una sola vez el renderizador de Plotly y permite reintentar si falla.
//
function loadRenderer() {
  renderer ??= import("plotly.js-basic-dist-min").then((module) => module.default).catch((error) => {
    renderer = undefined;
    throw error;
  });
  return renderer;
}

//
// Escapa los caracteres HTML de un rótulo antes de pasarlo a Plotly.
//
function escapeMarkup(text: string): string {
  return text.replace(/[&<>"']/g, (character) => `&#${character.charCodeAt(0)};`);
}

//
// Devuelve el mayor valor absoluto numérico de una lista.
//
function largest(values: unknown[]): number {
  return Math.max(0, ...values.filter((value): value is number => typeof value === "number").map(Math.abs));
}

//
// Calcula el espaciado de barras y las marcas del eje X según el ancho disponible.
//
function responsive(figure: PlotlyFigure, width: number): Responsive {
  const result: Responsive = {};
  const bars = figure.data.filter((trace) => trace.type === "bar" && trace.width === undefined);
  if (bars.length) {
    const categories = new Set(bars.flatMap((trace) => Array.isArray(trace.x) ? trace.x : [])).size;
    const band = Math.max(1, (width - PLOT_MARGINS_PX) / Math.max(1, categories));
    result.bargap = Math.min(0.92, Math.max(0.2, 1 - (MAX_BAR_PX * bars.length) / band));
  }
  const axis = figure.layout.xaxis;
  if (axis && typeof axis === "object" && !Array.isArray(axis) && Array.isArray(axis.tickvals) && Array.isArray(axis.ticktext)
      && axis.tickvals.length > MANY_CATEGORIES) {
    const step = Math.ceil(axis.tickvals.length / Math.max(2, Math.floor(width / MIN_TICK_PX)));
    result.tickvals = axis.tickvals.filter((_, index) => index % step === 0);
    result.ticktext = axis.ticktext.filter((_, index) => index % step === 0);
  }
  return result;
}

//
// Adapta una figura de Plotly al tema, la tipografía y los rótulos de la interfaz.
//
function themedFigure(figure: PlotlyFigure, element: HTMLElement, theme: "light" | "dark", title: string, labels?: Labels) {
  const tokens = getComputedStyle(document.documentElement);
  const [surface, foreground, secondary, border] = ["--surface", "--foreground", "--foreground-secondary", "--border"]
    .map((name) => tokens.getPropertyValue(name).trim());
  const family = getComputedStyle(element).fontFamily;
  const palette = palettes[theme];
  const data = structuredClone(figure.data) as unknown as Trace[];
  const layout = structuredClone(figure.layout) as unknown as Partial<Layout> & { barcornerradius?: number };
  data.forEach((trace, index) => {
    const color = palette[index % palette.length];
    if (trace.type === "scatter") {
      trace.marker = { ...trace.marker, color, size: 8, line: { color: surface, width: 2 } };
      if (trace.line) trace.line = { ...trace.line, color, width: 2 };
    } else {
      trace.marker = { ...trace.marker, color, line: { width: 0 } };
    }
  });
  layout.barcornerradius = 4;
  layout.title = { text: "" };
  layout.annotations = [];
  layout.height = CHART_HEIGHT;
  layout.paper_bgcolor = "rgba(0,0,0,0)";
  layout.plot_bgcolor = "rgba(0,0,0,0)";
  layout.font = { ...layout.font, family, size: 12, color: secondary };
  layout.margin = { l: 12, r: 20, t: layout.showlegend ? 44 : 20, b: 12, pad: 6 };
  layout.hoverlabel = { bgcolor: surface, bordercolor: border, font: { family, size: 12, color: foreground } };
  layout.legend = { ...layout.legend, orientation: "h", x: 0, y: 1.02, yanchor: "bottom", font: { color: secondary },
    ...(labels?.legend_title && { title: { text: escapeMarkup(labels.legend_title) } }) };
  layout.modebar = { bgcolor: "rgba(0,0,0,0)", color: secondary, activecolor: foreground };
  for (const [axis, key, text] of [[layout.xaxis, "x", labels?.x_title], [layout.yaxis, "y", labels?.y_title]] as const) {
    if (!axis) continue;
    Object.assign(axis, {
      color: secondary, linecolor: border, gridcolor: border, gridwidth: 1, zeroline: false, ticks: "",
      showline: key === "x", tickfont: { size: 11, color: secondary },
      title: { ...(typeof axis.title === "object" ? axis.title : {}), ...(text && { text: escapeMarkup(text) }), font: { size: 12, color: secondary }, standoff: 12 },
    } satisfies Partial<LayoutAxis>);
    if (typeof axis.tickformat === "string" && !axis.tickformat.startsWith(",") && largest(data.flatMap((trace) => trace[key] ?? [])) >= 10000) {
      axis.tickformat = "," + axis.tickformat;
    }
  }
  const sizing = responsive(figure, element.clientWidth);
  if (sizing.bargap !== undefined) layout.bargap = sizing.bargap;
  if (layout.xaxis && sizing.tickvals) Object.assign(layout.xaxis, { tickvals: sizing.tickvals, ticktext: sizing.ticktext });
  const config = structuredClone(figure.config) as Partial<Config>;
  config.displaylogo = false;
  config.toImageButtonOptions = { ...config.toImageButtonOptions, filename: title };
  return { data, layout, config };
}

//
// Renderiza una figura de Plotly con el tema actual y se ajusta al ancho disponible.
//
export function PlotlyChart({ figure, title, labels }: { figure: PlotlyFigure; title: string; labels?: Labels }) {
  const container = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const target: HTMLDivElement = element;
    let disposed = false;
    let plotly: PlotlyApi | undefined;
    let observer: ResizeObserver | undefined;
    let pending: ReturnType<typeof setTimeout> | undefined;
    async function draw() {
      try {
        if (figure.data.some((trace) => !["scatter", "bar"].includes(String(trace.type)))) {
          throw new Error("unsupported_trace");
        }
        const loaded = await loadRenderer();
        if (disposed) return;
        plotly = loaded;
        const themed = themedFigure(figure, target, theme === "dark" ? "dark" : "light", title, labels);
        await loaded.react(target, themed.data, themed.layout, themed.config);
        if (disposed) return;
        observer = new ResizeObserver(() => {
          clearTimeout(pending);
          pending = setTimeout(async () => {
            if (!target.isConnected) return;
            const { bargap, tickvals, ticktext } = responsive(figure, target.clientWidth);
            await loaded.Plots.resize(target);
            await loaded.relayout(target, {
              ...(bargap !== undefined && { bargap }), ...(tickvals && { "xaxis.tickvals": tickvals, "xaxis.ticktext": ticktext }),
            } as Partial<Layout>);
          }, RESIZE_DEBOUNCE_MS);
        });
        observer.observe(target);
        setReady(true);
        setError(null);
      } catch {
        if (!disposed) setError("No se pudo mostrar este gráfico interactivo. Los resultados de la respuesta no cambian.");
      }
    }
    void draw();
    return () => {
      disposed = true;
      clearTimeout(pending);
      observer?.disconnect();
      if (plotly) plotly.purge(target);
    };
  }, [figure, theme, title, labels]);

  return (
    <div className="relative min-w-0 px-2 pb-2" data-plotly-figure>
      {!ready && !error && <p role="status" className="absolute inset-x-0 top-0 p-4 text-sm text-foreground-secondary">Cargando gráfico interactivo…</p>}
      {error && <p role="alert" className="m-2 rounded-md bg-warning/5 p-4 text-sm text-warning">{error}</p>}
      <div ref={container} role="img" aria-label={title} className={error ? "hidden" : "w-full min-w-0"} style={{ height: CHART_HEIGHT }} />
    </div>
  );
}
