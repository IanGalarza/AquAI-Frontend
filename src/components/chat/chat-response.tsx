"use client";

import { Fragment, useId } from "react";
import dynamic from "next/dynamic";
import type { AnswerSegment, AssistantSnapshot, ChartView, Citation, Language, MessagePresentation, StoredTable, TableView, Visualization } from "@/types/conversations";
import { displayValue } from "@/utils/conversations";
import { formatScientificNumber } from "@/utils/scientific";
import { ChatIcon } from "./chat-icon";
import { CitationChip } from "./citation-chip";

const PlotlyChart = dynamic(() => import("./plotly-chart").then((module) => module.PlotlyChart), {
  ssr: false,
  loading: () => <p role="status" className="p-4 text-sm text-foreground-secondary">Cargando gráfico interactivo…</p>,
});

type ResolveCitations = (ids: string[]) => Citation[];

//
// Formatea una cantidad de filas con su singular o plural según el idioma.
//
function rowCount(rows: number, language: Language): string {
  return `${formatScientificNumber(rows, language)} ${rows === 1 ? "fila" : "filas"}`;
}

//
// Muestra un párrafo o nota de la respuesta, con sus viñetas y citas.
//
function Segment({ segment, resolve }: { segment: AnswerSegment; resolve: ResolveCitations }) {
  const chip = <CitationChip citations={resolve(segment.citations)} />;
  if (segment.kind === "note") {
    return <p className="flex gap-2 rounded-md bg-background/55 px-3 py-2.5 text-[13px] leading-relaxed text-foreground-secondary">
      <ChatIcon name="alert-circle" className="mt-0.5 size-4 shrink-0" />
      <span className="min-w-0 whitespace-pre-line [overflow-wrap:anywhere]">{segment.text}{chip}</span>
    </p>;
  }
  return <div>
    <p className="whitespace-pre-line text-[15px] leading-7 [overflow-wrap:anywhere]">{segment.text}{chip}</p>
    {segment.items.length > 0 && <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[15px] leading-7 marker:text-foreground-secondary">
      {segment.items.map((item, index) => <li key={index} className="pl-1 [overflow-wrap:anywhere]">{item}</li>)}
    </ul>}
  </div>;
}

//
// Muestra una tabla de resultados con sus unidades, valores formateados y citas.
//
function ResultTable({ table, view, language, citations }: { table: StoredTable; view?: TableView; language: Language; citations: Citation[] }) {
  const captionId = useId();
  const columns = new Map(view?.columns.map((column) => [column.name, column]));
  return <figure className="min-w-0 overflow-hidden rounded-lg border border-border/70 bg-surface" data-result-table data-complete={table.complete}>
    <figcaption id={captionId} className="flex min-h-11 items-center justify-between gap-3 border-b border-border/60 px-4 py-2">
      <span className="flex items-center gap-2 text-xs text-foreground-secondary">
        <ChatIcon name="table" className="size-4 shrink-0" />Tabla de {rowCount(table.total_rows, language)}
      </span>
      <CitationChip citations={citations} />
    </figcaption>
    {table.storage === "metadata_only" ? <p className="px-4 py-4 text-[13px] text-foreground-secondary">Las filas de este resultado no se guardaron en la conversación por su tamaño.</p> :
      <div className="max-h-[26rem] overflow-auto overscroll-contain" tabIndex={0} role="region" aria-labelledby={captionId}>
        <table className="w-full border-collapse text-left text-[13px] tabular-nums">
          <thead className="sticky top-0 z-[1] bg-surface-elevated">
            <tr>{table.columns.map((column) => {
              const view = columns.get(column.name);
              return <th key={column.name} scope="col" className={`min-w-28 px-4 py-2.5 align-bottom font-medium ${view?.numeric ? "text-right" : ""}`}>
                <span className="block [overflow-wrap:anywhere]">{view?.label ?? column.name}</span>
                {view?.unit && <span className={`mt-0.5 block text-[11px] font-normal text-foreground-secondary ${view.unit_documented ? "" : "italic"}`}>{view.unit}</span>}
              </th>;
            })}</tr>
          </thead>
          <tbody>{table.rows.map((row, index) => <tr key={index} className="border-t border-border/50 transition-colors hover:bg-primary/5">
            {table.columns.map((column) => {
              const { numeric, time_grain: grain = null } = columns.get(column.name) ?? {};
              const value = row[column.name];
              const exact = numeric && value != null ? String(value) : null;
              return <td key={column.name} title={exact ? `Valor exacto: ${language === "es" ? exact.replace(".", ",") : exact}` : undefined}
                className={`max-w-80 px-4 py-2 align-top [overflow-wrap:anywhere] ${numeric ? "text-right" : ""} ${value == null ? "italic text-foreground-secondary" : ""}`}>
                {displayValue(value, column, language, grain)}
              </td>;
            })}
          </tr>)}</tbody>
        </table>
      </div>}
    {!table.complete && table.storage === "preview" && <p className="border-t border-border/60 px-4 py-2 text-xs text-foreground-secondary">
      Se muestran {formatScientificNumber(table.stored_rows, language)} de {rowCount(table.total_rows, language)}.
    </p>}
  </figure>;
}

//
// Muestra un gráfico de la respuesta con su título y citas.
//
function Chart({ chart, view, citations }: { chart: Visualization; view?: ChartView; citations: Citation[] }) {
  return <figure className="min-w-0 overflow-hidden rounded-lg border border-border/70 bg-surface" data-visualization={chart.operation_id}>
    <figcaption className="flex items-start justify-between gap-3 px-4 pt-3.5">
      <span className="min-w-0 text-sm font-medium leading-snug [overflow-wrap:anywhere]">{chart.title}</span>
      <CitationChip citations={citations} />
    </figcaption>
    {chart.figure ? <PlotlyChart figure={chart.figure} title={chart.title} labels={view} /> :
      <p className="p-4 text-[13px] text-foreground-secondary">La figura interactiva no está guardada en esta versión del mensaje.</p>}
  </figure>;
}

//
// Renderiza una respuesta del asistente con sus segmentos, tablas y gráficos.
//
export function ChatResponse({ snapshot, presentation }: { snapshot: AssistantSnapshot; presentation: MessagePresentation }) {
  const { language, results, visualizations } = snapshot.response;
  const citations = new Map(presentation.citations.map((citation) => [citation.id, citation]));
  const resolve: ResolveCitations = (ids) => ids.flatMap((id) => citations.get(id) ?? []);
  const tables = new Map(results.map((table) => [table.evidence_id, table]));
  const tableViews = new Map(presentation.tables.map((view) => [view.evidence_id, view]));
  const charts = new Map(visualizations.map((chart) => [chart.operation_id, chart]));
  const chartViews = new Map(presentation.charts.map((view) => [view.operation_id, view]));

  function table(key: string, cited: string[] = []) {
    const item = tables.get(key);
    const view = tableViews.get(key);
    return item && <ResultTable key={`table-${key}`} table={item} view={view} language={language}
      citations={resolve((view?.citations ?? []).filter((id) => !cited.includes(id)))} />;
  }
  function chart(key: string, cited: string[] = []) {
    const item = charts.get(key);
    const view = chartViews.get(key);
    return item && <Chart key={`chart-${key}`} chart={item} view={view}
      citations={resolve((view?.citations ?? []).filter((id) => !cited.includes(id)))} />;
  }

  return <div className="min-w-0 space-y-4" data-analytic-status={snapshot.response.status}>
    {presentation.segments.map((segment, index) => <Fragment key={index}>
      <Segment segment={segment} resolve={resolve} />
      {segment.table && table(segment.table, segment.citations)}
      {segment.chart && chart(segment.chart, segment.citations)}
    </Fragment>)}
    {presentation.trailing_tables.map((key) => table(key))}
    {presentation.trailing_charts.map((key) => chart(key))}
  </div>;
}
