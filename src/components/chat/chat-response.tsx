"use client";

import dynamic from "next/dynamic";
import type { AnswerStatus, AssistantSnapshot, Message, SourceReference, StoredTable, Visualization } from "@/types/conversations";
import { displayValue } from "@/utils/conversations";
import { displayUnit } from "@/utils/scientific";
import { ChatIcon } from "./chat-icon";

const PlotlyChart = dynamic(() => import("./plotly-chart").then((module) => module.PlotlyChart), {
  ssr: false,
  loading: () => <p role="status" className="p-4 text-sm text-foreground-secondary">Cargando gráfico interactivo…</p>,
});
const statusLabels: Record<AnswerStatus | "answered", string> = {
  validated: "Resultados validados", partial: "Resultado parcial", needs_clarification: "Necesita aclaración",
  insufficient_coverage: "Sin cobertura suficiente", failed: "Análisis no completado",
  answered: "Respuesta completada",
};

function Notes({ title, items }: { title: string; items: string[] }) {
  const unique = [...new Set(items.filter(Boolean))];
  if (!unique.length) return null;
  return <details className="rounded-sm border border-border/70 bg-background/35 px-3.5 py-2.5 text-xs leading-relaxed">
    <summary className="cursor-pointer font-medium text-foreground-secondary">{title} ({unique.length})</summary>
    <ul className="mt-2 list-disc space-y-1.5 pl-4 text-foreground-secondary">{unique.map((note, index) => <li key={index} className="[overflow-wrap:anywhere]">{note}</li>)}</ul>
  </details>;
}

function ResultTable({ table, snapshot }: { table: StoredTable; snapshot: AssistantSnapshot }) {
  const reference = snapshot.response.operation_references.find((item) => item.evidence_id === table.evidence_id);
  const sourceNames = snapshot.response.sources.filter((source) => reference?.dataset_ids.includes(source.dataset_id)).map((source) => `${source.dataset_name} · v${source.version}`);
  return <section aria-label={`Resultado ${table.evidence_id}`} className="min-w-0 overflow-hidden rounded-sm border border-border bg-surface" data-result-table data-complete={table.complete}>
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 px-3.5 py-2.5 text-xs">
      <span className="font-medium">Resultado {table.evidence_id}</span>
      <span className={table.complete ? "text-foreground-secondary" : "text-warning"}>
        {table.storage === "metadata_only" ? `Sólo metadatos · ${table.total_rows} filas de resultado` :
          table.complete ? `${table.stored_rows} filas · completo` : `Vista parcial · ${table.stored_rows} de ${table.total_rows} filas`}
      </span>
    </div>
    {table.storage === "metadata_only" ? <p className="px-3.5 py-4 text-xs text-foreground-secondary">Las filas no se conservaron en el historial. No hay un recurso de descarga disponible.</p> :
      <div className="max-h-96 overflow-auto overscroll-contain" tabIndex={0} role="region" aria-label={`Tabla ${table.evidence_id}`}>
        <table className="w-full text-left text-xs tabular-nums">
          <caption className="sr-only">Resultado {table.evidence_id}. {table.complete ? "Tabla completa." : "Vista parcial de las filas almacenadas."}</caption>
          <thead className="sticky top-0 bg-surface-elevated">
            <tr>{table.columns.map((column) => <th key={column.name} scope="col" className="min-w-28 border-b border-border px-3.5 py-2.5 align-top font-medium">
              <span className="block [overflow-wrap:anywhere]">{column.name}</span>
              <span className="mt-1 block text-[10px] font-normal text-foreground-secondary">{column.sql_type}{displayUnit(column) && ` · ${displayUnit(column)}`}</span>
            </th>)}</tr>
          </thead>
          <tbody>{table.rows.map((row, index) => <tr key={index} className="border-b border-border/40 last:border-0 hover:bg-background/50">
            {table.columns.map((column) => <td key={column.name} title={row[column.name] != null && ["NUMERIC", "BIGINT"].includes(column.sql_type) ? `Valor exacto: ${String(row[column.name])}` : undefined} className={`max-w-80 whitespace-pre-wrap px-3.5 py-2.5 align-top [overflow-wrap:anywhere] ${row[column.name] == null ? "italic text-foreground-secondary" : ""}`}>{displayValue(row[column.name], column, snapshot.response.language)}</td>)}
          </tr>)}</tbody>
        </table>
        {!table.rows.length && <p className="px-3.5 py-3 text-xs text-foreground-secondary">El resultado no contiene filas.</p>}
      </div>}
    {!table.complete && <p className="border-t border-border/60 px-3.5 py-2 text-xs text-warning">Esta vista no contiene el conjunto completo de resultados. Las filas omitidas no están disponibles desde esta interfaz.</p>}
    <div className="space-y-1 border-t border-border/60 px-3.5 py-2 text-[11px] text-foreground-secondary">
      <p>Operación {table.operation_id}{reference ? ` · ${reference.tool.toUpperCase()}` : ""}{sourceNames.length ? ` · ${sourceNames.join("; ")}` : ""}</p>
      {table.rows_processed !== null && <p>Filas procesadas: {table.rows_processed}. Filtradas: {table.rows_filtered}.</p>}
    </div>
    {table.exclusions.length > 0 && <details className="border-t border-border/60 px-3.5 py-2 text-[11px] text-foreground-secondary">
      <summary className="cursor-pointer">Valores nulos y exclusiones documentadas</summary>
      <ul className="mt-2 space-y-2">{table.exclusions.map((item, index) => <li key={index}>
        {item.output_name}{Object.keys(item.group).length ? ` · ${displayValue(item.group)}` : ""}: {item.valid_rows} valores válidos de {item.input_rows}; {item.null_rows} nulos. Política: {item.policy === "exclude" ? "excluir nulos" : "preservar nulos"}.
        {item.zero_divisions > 0 && ` Divisiones por cero evitadas: ${item.zero_divisions}.`}
      </li>)}</ul>
    </details>}
    {!table.exclusions_complete && <p className="px-3.5 pb-2 text-xs text-warning">El detalle de exclusiones no se conservó completo.</p>}
    {table.warnings.length > 0 && <div className="p-2"><Notes title="Advertencias de la tabla" items={table.warnings} /></div>}
  </section>;
}

function SourceCard({ source, snapshot }: { source: SourceReference; snapshot: AssistantSnapshot }) {
  const evidence = snapshot.response.operation_references.filter((item) => item.dataset_ids.includes(source.dataset_id));
  return <li className="rounded-sm border border-border/70 bg-background/30 px-3.5 py-3 text-xs">
    <p className="font-medium [overflow-wrap:anywhere]">{source.provenance.source_name}</p>
    <p className="mt-1 text-foreground-secondary [overflow-wrap:anywhere]">{source.dataset_name} · versión {source.version}</p>
    <p className="mt-1 text-foreground-secondary [overflow-wrap:anywhere]">Archivo: {source.provenance.original_filename}</p>
    {Object.keys(source.provenance.source_locator).length > 0 && <dl className="mt-1.5 space-y-1 text-foreground-secondary">
      {Object.entries(source.provenance.source_locator).map(([key, value]) => <div key={key} className="[overflow-wrap:anywhere]"><dt className="inline">{key}: </dt><dd className="inline">{displayValue(value)}</dd></div>)}
    </dl>}
    <details className="mt-2 text-[11px] text-foreground-secondary">
      <summary className="cursor-pointer">Trazabilidad{evidence.length ? ` · ${evidence.map((item) => item.evidence_id).join(", ")}` : ""}</summary>
      <p className="mt-1 break-all">Fuente: {source.source_id}</p>
      <p className="mt-1 break-all">Dataset: {source.dataset_id}</p>
      {evidence.map((item) => <p key={item.evidence_id} className="mt-1">{item.evidence_id} · operación {item.operation_id} · {item.tool.toUpperCase()}</p>)}
    </details>
  </li>;
}

function Chart({ chart, snapshot }: { chart: Visualization; snapshot: AssistantSnapshot }) {
  const sourceNames = chart.datasets.map((item) => {
    const source = snapshot.response.sources.find((source) => source.dataset_id === item.dataset_id);
    return `${source?.dataset_name ?? item.dataset_id} · v${item.version}`;
  });
  return <figure className="min-w-0 overflow-hidden rounded-sm border border-border bg-surface" data-visualization={chart.operation_id}>
    {chart.figure ? <PlotlyChart figure={chart.figure} title={chart.title} /> : <p className="p-4 text-xs text-warning">La figura interactiva no está almacenada en esta versión del mensaje.</p>}
    <figcaption className="space-y-1 border-t border-border/60 px-3.5 py-2.5 text-[11px] text-foreground-secondary">
      <p className="font-medium text-foreground">{chart.title}</p>
      <p>{chart.input_rows} filas de entrada · {chart.excluded_rows} excluidas · operación {chart.operation_id}</p>
      <p className="[overflow-wrap:anywhere]">{sourceNames.join("; ")}</p>
    </figcaption>
    {chart.warnings.length > 0 && <div className="p-2"><Notes title="Advertencias del gráfico" items={chart.warnings} /></div>}
  </figure>;
}

export function ChatResponse({ message, snapshot }: { message: Message; snapshot: AssistantSnapshot }) {
  const response = snapshot.response;
  const partial = response.status === "partial";
  const responseType = response.response_type ?? "analytical";
  const label = response.status === "failed" ? "Respuesta no completada" :
    responseType === "general" ? "Conocimiento general" :
    responseType === "historical" ? "Respuesta del historial" :
    statusLabels[response.status];
  return <div className="min-w-0 space-y-4" data-analytic-status={response.status} data-generation-status={message.status.name}>
    <div className={`inline-flex items-center gap-1.5 rounded-sm border px-2 py-1 text-[11px] ${response.status === "failed" ? "border-error/30 text-error" : partial ? "border-warning/30 text-warning" : "border-border text-foreground-secondary"}`}>
      <ChatIcon name={response.status === "validated" ? "check-circle" : partial || response.status === "failed" ? "alert-triangle" : "message"} className="size-3.5" />
      {label}
    </div>
    {partial && <p className="text-xs text-warning">Sólo se muestran las partes verificadas. La consulta no se resolvió por completo.</p>}
    <p className="whitespace-pre-wrap text-sm leading-relaxed [overflow-wrap:anywhere] sm:text-[15px]">{message.content}</p>
    {response.clarification_question && !message.content.includes(response.clarification_question) && <p className="rounded-sm border border-primary/25 bg-primary/5 p-3 text-sm">{response.clarification_question}</p>}
    {response.results.map((table) => <ResultTable key={table.evidence_id} table={table} snapshot={snapshot} />)}
    {response.visualizations.map((chart) => <Chart key={chart.operation_id} chart={chart} snapshot={snapshot} />)}
    {snapshot.omitted_visualizations.length > 0 && <p className="text-xs text-warning">{snapshot.omitted_visualizations.length} figuras no se conservaron por el límite del historial. No hay un enlace para recuperarlas.</p>}
    {response.sources.length > 0 && <section aria-label="Fuentes de la respuesta">
      <h3 className="mb-2 flex items-center gap-2 text-xs font-medium"><ChatIcon name="database" className="size-4 text-primary" />Fuentes y datasets utilizados</h3>
      <ul className="grid gap-2 sm:grid-cols-2">{response.sources.map((source) => <SourceCard key={`${source.source_id}-${source.dataset_id}`} source={source} snapshot={snapshot} />)}</ul>
    </section>}
    <Notes title="Advertencias" items={[...response.warnings, ...snapshot.storage_warnings]} />
    <Notes title="Limitaciones" items={response.limitations} />
    <Notes title="Información faltante" items={response.missing_information} />
    <Notes title="Operaciones pendientes" items={response.pending_operations} />
    <Notes title="Incidencias de validación" items={response.validation_issues.map((item) => item.message)} />
    {(response.errors.length > 0 || response.generation.error) && <div className="rounded-sm border border-error/30 bg-error/5 p-3 text-xs text-error" role="status">
      {[...new Set([...response.errors.map((item) => item.message), ...(response.generation.error ? [response.generation.error.message] : [])])].map((error) => <p key={error} className="[overflow-wrap:anywhere]">{error}</p>)}
    </div>}
    <details className="text-[11px] text-foreground-secondary">
      <summary className="cursor-pointer">Información de ejecución</summary>
      {response.routing && <>
        <p className="mt-2">Ruta: {response.routing.route}.</p>
        <p className="mt-1">Contexto utilizado: {response.routing.context_used ? "sí" : "no"}.
          Pregunta contextualizada: {response.routing.question_contextualized ? "sí" : "no"}.</p>
        <p className="mt-1">Router: {response.routing.model},
          {" "}{(response.routing.duration_ms / 1000).toFixed(2)} s.
          Tokens: {response.routing.input_tokens ?? "no informado"} de entrada;
          {" "}{response.routing.output_tokens ?? "no informado"} de salida.</p>
      </>}
      {!!response.historical_message_ids?.length && <p className="mt-1 break-all">
        Mensajes históricos: {response.historical_message_ids.join(", ")}
      </p>}
      <p className="mt-2">Mensaje: {message.status.name}. Generación: {response.generation.status === "deterministic" ? "determinística" : response.generation.status === "generated" ? "con modelo" : "fallida"}.</p>
      {response.generation.model && <p className="mt-1">Modelo de respuesta: {response.generation.model}</p>}
      {response.planner_model && <p className="mt-1">Modelo de planificación: {response.planner_model}</p>}
      {response.generation.input_tokens !== null && <p className="mt-1">Tokens de respuesta: {response.generation.input_tokens} de entrada; {response.generation.output_tokens ?? "no informado"} de salida.</p>}
      {Object.entries(response.timings_ms).map(([stage, ms]) => <p key={stage} className="mt-1">{stage}: {(ms / 1000).toFixed(2)} s</p>)}
    </details>
  </div>;
}
