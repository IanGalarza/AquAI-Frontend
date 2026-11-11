"use client";

import { useEffect, useRef, useState } from "react";
import type { Annotations, Config, Data, Layout, LayoutAxis, Shape } from "plotly.js";
import { useTheme } from "@/hooks/use-theme";
import type { ChartReferenceLine, ChartView, JsonValue, PlotlyFigure } from "@/types/conversations";

type PlotlyApi = typeof import("plotly.js");
type Trace = Data & {
  type?: string; mode?: string; name?: string; hovertemplate?: string | string[]; x?: unknown[]; y?: unknown[]; width?: unknown;
  marker?: Record<string, unknown>; line?: Record<string, unknown>;
};
type Responsive = { bargap?: number; tickvals?: JsonValue[]; ticktext?: JsonValue[]; height: number };
type Labels = Pick<ChartView, "x_title" | "y_title" | "legend_title" | "reference_lines">;

const CHART_HEIGHT = 340;
const PLOT_MARGINS_PX = 96;
const MAX_BAR_PX = 32;
const MIN_TICK_PX = 64;
const MANY_CATEGORIES = 12;
const RESIZE_DEBOUNCE_MS = 120;
const LINE_WIDTH = 1.5;
const MARKER_SIZE = 6;
const FILL_OPACITY = 0.6;
const DENSE_POINTS = 60;
const LEGEND_ROW_PX = 22;
const LEGEND_SYMBOL_PX = 46;
const LEGEND_CHAR_PX = 6.6;
const LEGEND_INSET_PX = 32;
const palettes = {
  light: ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#6250d6", "#e34948"],
  dark: ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#008300", "#9085e9", "#e66767"],
};

const spanishLocale = {
  moduleType: "locale",
  name: "es",
  dictionary: {},
  format: {
    days: ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"],
    shortDays: ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"],
    months: ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"],
    shortMonths: ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"],
    date: "%d/%m/%Y",
    decimal: ",",
    thousands: ".",
  },
};

let renderer: Promise<PlotlyApi> | undefined;

//
// Carga una sola vez el renderizador de Plotly con el formato en español y permite reintentar si falla.
//
function loadRenderer() {
  renderer ??= import("plotly.js-basic-dist-min").then((module) => {
    (module.default as PlotlyApi & { register: (modules: unknown) => void }).register(spanishLocale);
    return module.default;
  }).catch((error) => {
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
// Devuelve cuántos caracteres de un rótulo entran en una fila de la leyenda, a la derecha de su título.
//
function legendLimit(width: number, title: string): number {
  return Math.max(8, Math.floor((width - LEGEND_INSET_PX - LEGEND_SYMBOL_PX - title.length * LEGEND_CHAR_PX) / LEGEND_CHAR_PX));
}

//
// Estima cuántas filas ocupa la leyenda horizontal: Plotly la reparte en columnas del ancho del rótulo más
// largo, a la derecha de su título.
//
function legendRows(lengths: number[], title: string, width: number): number {
  const item = LEGEND_SYMBOL_PX + Math.max(...lengths) * LEGEND_CHAR_PX;
  const columns = Math.max(1, Math.floor((width - LEGEND_INSET_PX - title.length * LEGEND_CHAR_PX) / item));
  return Math.ceil(lengths.length / columns);
}

//
// Acorta por el medio el rótulo de una serie para que entre en la leyenda (nombres con el mismo comienzo
// siguen distinguiéndose por su final) y muestra su nombre completo en el texto emergente de sus puntos.
//
function fittedSeries(trace: Trace, limit: number) {
  const name = trace.name ?? "";
  const named = (template: string) => template.replace("<extra></extra>", `<extra>${name}</extra>`);
  if (trace.hovertemplate) {
    trace.hovertemplate = Array.isArray(trace.hovertemplate) ? trace.hovertemplate.map(named) : named(trace.hovertemplate);
  }
  if (name.length <= limit) return;

  const kept = Math.floor((limit - 1) / 2);
  trace.name = `${name.slice(0, kept).trimEnd()}…${name.slice(-kept).trimStart()}`;
}

//
// Calcula el espaciado de barras, las marcas del eje X y la altura (que crece con las filas de la leyenda)
// según el ancho disponible.
//
function responsive(figure: PlotlyFigure, width: number, legendTitle = ""): Responsive {
  const limit = legendLimit(width, legendTitle);
  const lengths = figure.layout.showlegend ? figure.data.map((trace) => Math.min(limit, String(trace.name ?? "").length)) : [];
  const rows = lengths.length ? legendRows(lengths, legendTitle, width) : 1;
  const result: Responsive = { height: CHART_HEIGHT + (rows - 1) * LEGEND_ROW_PX };
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
// Devuelve un color hexadecimal con la opacidad indicada.
//
function withOpacity(hex: string, opacity: number): string {
  const [red, green, blue] = [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16));
  return `rgba(${red},${green},${blue},${opacity})`;
}

//
// Aplica a una traza el trazo de figura científica: relleno translúcido con borde fino del mismo color,
// líneas finas y, en series densas, la línea sin marcadores. Una serie que repite color (más series que la
// paleta) se distingue con símbolos huecos y línea punteada, o con barras rayadas.
//
function paperTrace(trace: Trace, color: string, repeated: boolean) {
  const pattern = repeated && trace.type === "bar" ? { pattern: { shape: "/", fgcolor: color, solidity: 0.35 } } : {};
  const marker: Record<string, unknown> = { ...trace.marker, color: withOpacity(color, FILL_OPACITY), line: { color, width: 1 }, ...pattern };
  trace.marker = marker;
  if (trace.type !== "scatter") return;

  marker.size = MARKER_SIZE;
  if (repeated) marker.symbol = `${marker.symbol ?? "circle"}-open`;
  if (!trace.line) return;

  trace.line = { ...trace.line, color, width: LINE_WIDTH, ...(repeated && { dash: "dot" }) };
  if ((trace.x?.length ?? 0) > DENSE_POINTS) trace.mode = "lines";
}

//
// Devuelve el estilo de un eje de figura científica: marco completo, marcas hacia adentro y grilla punteada tenue.
//
function paperAxis(axis: Partial<LayoutAxis>, ink: string, grid: string, title?: string | null): Partial<LayoutAxis> {
  return {
    color: ink, linecolor: ink, linewidth: 1, showline: true, mirror: "ticks", zeroline: false,
    ticks: axis.type === "category" ? "" : "inside", ticklen: 5, tickwidth: 1, tickcolor: ink,
    gridcolor: grid, griddash: "dot", gridwidth: 1, tickfont: { size: 11, color: ink },
    title: { ...(typeof axis.title === "object" ? axis.title : {}), ...(title && { text: escapeMarkup(title) }), font: { size: 12, color: ink }, standoff: 10 },
  };
}

//
// Devuelve la línea de una referencia documentada, sobre el eje indicado y a todo lo ancho del gráfico.
//
function referenceShape(line: ChartReferenceLine, color: string): Partial<Shape> {
  const dash = { color, width: 1.5, dash: "dash" as const };
  return line.axis === "y"
    ? { type: "line", xref: "paper", x0: 0, x1: 1, yref: "y", y0: line.value, y1: line.value, line: dash }
    : { type: "line", yref: "paper", y0: 0, y1: 1, xref: "x", x0: line.value, x1: line.value, line: dash };
}

//
// Devuelve el rótulo de una referencia documentada, junto a su línea.
//
function referenceLabel(line: ChartReferenceLine, color: string): Partial<Annotations> {
  const text = escapeMarkup(line.label);
  const font = { size: 11, color };
  return line.axis === "y"
    ? { text, font, xref: "paper", x: 1, xanchor: "right", yref: "y", y: line.value, yanchor: "bottom", showarrow: false }
    : { text, font, yref: "paper", y: 1, yanchor: "bottom", xref: "x", x: line.value, xanchor: "left", showarrow: false };
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
  const layout = structuredClone(figure.layout) as unknown as Partial<Layout>;
  const legendTitle = labels?.legend_title ?? "";
  const sizing = responsive(figure, element.clientWidth, legendTitle);
  data.forEach((trace, index) => paperTrace(trace, palette[index % palette.length], index >= palette.length));
  if (layout.showlegend) data.forEach((trace) => fittedSeries(trace, legendLimit(element.clientWidth, legendTitle)));
  layout.title = { text: "" };
  layout.annotations = [];
  layout.height = sizing.height;
  layout.paper_bgcolor = "rgba(0,0,0,0)";
  layout.plot_bgcolor = "rgba(0,0,0,0)";
  layout.font = { ...layout.font, family, size: 12, color: foreground };
  layout.margin = { l: 12, r: 20, t: layout.showlegend ? 44 : 20, b: 12, pad: 0 };
  layout.hoverlabel = { bgcolor: surface, bordercolor: border, font: { family, size: 12, color: foreground } };
  layout.legend = { ...layout.legend, orientation: "h", x: 1, xanchor: "right", y: 1.02, yanchor: "bottom",
    bgcolor: surface, bordercolor: foreground, borderwidth: 1, font: { color: foreground },
    ...(labels?.legend_title && { title: { text: escapeMarkup(labels.legend_title) } }) };
  layout.modebar = { bgcolor: "rgba(0,0,0,0)", color: secondary, activecolor: foreground };
  for (const [axis, key, text] of [[layout.xaxis, "x", labels?.x_title], [layout.yaxis, "y", labels?.y_title]] as const) {
    if (!axis) continue;
    Object.assign(axis, paperAxis(axis, foreground, border, text));
    if (typeof axis.tickformat === "string" && !axis.tickformat.startsWith(",") && largest(data.flatMap((trace) => trace[key] ?? [])) >= 10000) {
      axis.tickformat = "," + axis.tickformat;
    }
  }
  const lines = labels?.reference_lines ?? [];
  layout.shapes = lines.map((line) => referenceShape(line, tokens.getPropertyValue("--warning").trim()));
  layout.annotations = lines.map((line) => referenceLabel(line, tokens.getPropertyValue("--warning").trim()));
  if (window.matchMedia("(pointer: coarse)").matches) {
    layout.dragmode = false;
    for (const axis of [layout.xaxis, layout.yaxis]) if (axis) axis.fixedrange = true;
  }
  if (sizing.bargap !== undefined) layout.bargap = sizing.bargap;
  if (layout.xaxis && sizing.tickvals) Object.assign(layout.xaxis, { tickvals: sizing.tickvals, ticktext: sizing.ticktext });
  const config = structuredClone(figure.config) as Partial<Config>;
  config.displaylogo = false;
  config.locale = "es";
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
        target.style.height = `${themed.layout.height}px`;
        await loaded.react(target, themed.data, themed.layout, themed.config);
        if (disposed) return;
        observer = new ResizeObserver(() => {
          clearTimeout(pending);
          pending = setTimeout(async () => {
            if (!target.isConnected) return;
            const { bargap, tickvals, ticktext, height } = responsive(figure, target.clientWidth, labels?.legend_title ?? "");
            target.style.height = `${height}px`;
            await loaded.Plots.resize(target);
            await loaded.relayout(target, {
              height, ...(bargap !== undefined && { bargap }), ...(tickvals && { "xaxis.tickvals": tickvals, "xaxis.ticktext": ticktext }),
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
