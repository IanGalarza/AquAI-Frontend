"use client";

import { useId, useMemo, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { useReveal } from "@/hooks/use-reveal";
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
// Parte de una respuesta en el orden de lectura, con el carácter en que empieza: un segmento que se escribe
// por caracteres, o una tabla o gráfico que aparece completo y pesa como una pausa breve.
//
type BlockContent = { segment: AnswerSegment } | { node: ReactNode };
type Block = { key: string; start: number; weight: number } & BlockContent;

const BLOCK_WEIGHT = 90;

//
// Formatea una cantidad de filas con su singular o plural según el idioma.
//
function rowCount(rows: number, language: Language): string {
  return `${formatScientificNumber(rows, language)} ${rows === 1 ? "fila" : "filas"}`;
}

//
// Devuelve la cantidad de caracteres de un segmento, con sus viñetas.
//
function segmentLength(segment: AnswerSegment): number {
  return segment.items.reduce((total, item) => total + item.length, segment.text.length);
}

//
// Devuelve el comienzo de un texto hasta la última palabra completa dentro del límite.
//
function wholeWords(text: string, limit: number): string {
  if (limit >= text.length) return text;
  const end = text.lastIndexOf(" ", limit);
  return end > 0 ? text.slice(0, end) : "";
}

//
// Reparte los caracteres visibles de un segmento entre su texto y sus viñetas, en orden.
//
function visibleShares(pieces: string[], visible: number): number[] {
  let rest = visible;
  return pieces.map((piece) => {
    const share = Math.max(0, Math.min(piece.length, rest));
    rest -= piece.length;
    return share;
  });
}

//
// Muestra un texto que se está escribiendo: la parte visible, el cursor si es el texto en curso y el resto
// transparente, que ya ocupa su lugar y que los lectores de pantalla leen completo desde que aparece.
//
function Writing({ text, shown, caret }: { text: string; shown: number; caret: boolean }) {
  const visible = wholeWords(text, shown);
  return <>
    {visible}
    {caret && <span className="reveal-caret" aria-hidden="true" />}
    <span className="reveal-pending">{text.slice(visible.length)}</span>
  </>;
}

//
// Muestra un párrafo o nota de la respuesta, con sus viñetas y citas; mientras se escribe revela el texto
// con un cursor, y las citas aparecen al completarse.
//
function Segment({ segment, resolve, visible }: { segment: AnswerSegment; resolve: ResolveCitations; visible: number }) {
  const pieces = [segment.text, ...segment.items];
  const shares = visibleShares(pieces, visible);
  const writing = visible < segmentLength(segment);
  const current = shares.findIndex((share, index) => share < pieces[index].length);
  const piece = (index: number) => writing ? <Writing text={pieces[index]} shown={shares[index]} caret={index === current} /> : pieces[index];
  const chip = !writing && <CitationChip citations={resolve(segment.citations)} />;
  if (segment.kind === "note") {
    return <p className="flex gap-2 rounded-md bg-background/55 px-3 py-2.5 text-[13px] leading-relaxed text-foreground-secondary">
      <ChatIcon name="alert-circle" className="mt-0.5 size-4 shrink-0" />
      <span className="min-w-0 whitespace-pre-line [overflow-wrap:anywhere]">{piece(0)}{chip}</span>
    </p>;
  }
  return <div data-segment-role={segment.role ?? undefined} className={segment.role === "hypothesis" ? "border-l-2 border-warning pl-3" : undefined}>
    <p className="whitespace-pre-line text-[15px] leading-7 [overflow-wrap:anywhere]">{piece(0)}{chip}</p>
    {segment.items.length > 0 && <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[15px] leading-7 marker:text-foreground-secondary">
      {segment.items.map((_, index) => <li key={index} className={`pl-1 [overflow-wrap:anywhere] ${writing && shares[index + 1] === 0 ? "reveal-pending" : ""}`}>
        {piece(index + 1)}
      </li>)}
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
// Arma las partes de una respuesta en orden de lectura: cada segmento seguido de su tabla y su gráfico,
// y al final las tablas y gráficos sin segmento.
//
function responseBlocks(snapshot: AssistantSnapshot, presentation: MessagePresentation): { blocks: Block[]; resolve: ResolveCitations; total: number } {
  const { language, results, visualizations } = snapshot.response;
  const citations = new Map(presentation.citations.map((citation) => [citation.id, citation]));
  const resolve: ResolveCitations = (ids) => ids.flatMap((id) => citations.get(id) ?? []);
  const tables = new Map(results.map((table) => [table.evidence_id, table]));
  const tableViews = new Map(presentation.tables.map((view) => [view.evidence_id, view]));
  const charts = new Map(visualizations.map((chart) => [chart.operation_id, chart]));
  const chartViews = new Map(presentation.charts.map((view) => [view.operation_id, view]));
  const blocks: Block[] = [];
  let start = 0;

  function add(key: string, weight: number, content: BlockContent) {
    blocks.push({ key, start, weight, ...content });
    start += weight;
  }
  function addTable(key: string, position: string, cited: string[] = []) {
    const item = tables.get(key);
    const view = tableViews.get(key);
    if (item) add(`table-${position}-${key}`, BLOCK_WEIGHT, { node: <ResultTable table={item} view={view} language={language}
      citations={resolve((view?.citations ?? []).filter((id) => !cited.includes(id)))} /> });
  }
  function addChart(key: string, position: string, cited: string[] = []) {
    const item = charts.get(key);
    const view = chartViews.get(key);
    if (item) add(`chart-${position}-${key}`, BLOCK_WEIGHT, { node: <Chart chart={item} view={view}
      citations={resolve((view?.citations ?? []).filter((id) => !cited.includes(id)))} /> });
  }

  presentation.segments.forEach((segment, index) => {
    add(`segment-${index}`, Math.max(1, segmentLength(segment)), { segment });
    if (segment.table) addTable(segment.table, String(index), segment.citations);
    if (segment.chart) addChart(segment.chart, String(index), segment.citations);
  });
  presentation.trailing_tables.forEach((key) => addTable(key, "end"));
  presentation.trailing_charts.forEach((key) => addChart(key, "end"));
  return { blocks, resolve, total: start };
}

//
// Función vacía para las respuestas que no se escriben progresivamente.
//
function noop() {}

//
// Renderiza una respuesta del asistente con sus segmentos, tablas y gráficos. Si recibe revealStartedAt,
// la escribe progresivamente desde ese instante: el contenido ya está validado, solo cambia cuánto se ve.
//
export function ChatResponse({ snapshot, presentation, revealStartedAt, onRevealed }: {
  snapshot: AssistantSnapshot; presentation: MessagePresentation; revealStartedAt?: number; onRevealed?: () => void;
}) {
  const { blocks, resolve, total } = useMemo(() => responseBlocks(snapshot, presentation), [snapshot, presentation]);
  const shown = useReveal(total, revealStartedAt, onRevealed ?? noop);
  const animated = revealStartedAt !== undefined;

  return <div className="min-w-0 space-y-4" data-analytic-status={snapshot.response.status} data-revealing={shown < total || undefined}>
    {blocks.map((block) => {
      const visible = Math.min(block.weight, shown - block.start);
      if (visible <= 0) return null;
      if ("segment" in block) return <Segment key={block.key} segment={block.segment} resolve={resolve} visible={visible} />;
      return <div key={block.key} className={animated ? "reveal-in min-w-0" : "min-w-0"}>{block.node}</div>;
    })}
  </div>;
}
