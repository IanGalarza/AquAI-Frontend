"use client";

import { useId, useState, type ComponentProps, type ReactNode } from "react";
import type { ColumnMetadata, DatasetDetail, SourceDetail as SourceDetailData } from "@/types/sources";
import { formatDate, formatSourceMessage, isPrepared, sourceErrors } from "@/utils/sources";
import { useTooltip } from "@/hooks/use-tooltip";
import { ChatIcon } from "../chat/chat-icon";
import { ProcessingBadge, SemanticBadge, SourceToggle } from "./source-status";

type IconName = ComponentProps<typeof ChatIcon>["name"];

function Information({ label, icon, children }: { label: string; icon: IconName; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1.5 text-[11px] text-foreground-secondary"><ChatIcon name={icon} className="size-3.5 shrink-0" />{label}</dt>
      <dd className="mt-1.5 break-words text-[13px]">{children}</dd>
    </div>
  );
}

function Warnings({ warnings, title = "Advertencias" }: { warnings: string[]; title?: string }) {
  if (warnings.length === 0) return null;
  return (
    <details open={warnings.length <= 4} className="group rounded-xl bg-warning/5 px-3.5 py-3">
      <summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-medium [&::-webkit-details-marker]:hidden">
        <ChatIcon name="alert-triangle" className="size-4 shrink-0 text-warning" />
        {title}<span className="text-foreground-secondary">({warnings.length})</span>
        <ChatIcon name="chevron-down" className="ml-auto size-3.5 shrink-0 text-foreground-secondary transition-transform group-open:rotate-180" />
      </summary>
      <ul className="mt-2.5 space-y-1.5 pl-5 text-xs leading-relaxed text-foreground-secondary">
        {warnings.map((warning, index) => <li key={index} className="list-disc break-words">{formatSourceMessage(warning)}</li>)}
      </ul>
    </details>
  );
}

function columnType(type: string): { label: string; icon: IconName } {
  if (/INT|NUMERIC|DECIMAL|REAL|FLOAT|DOUBLE/i.test(type)) return { label: "Número", icon: "hash" };
  if (/TIMESTAMP|DATETIME/i.test(type)) return { label: "Fecha y hora", icon: "calendar" };
  if (/DATE/i.test(type)) return { label: "Fecha", icon: "calendar" };
  if (/BOOL/i.test(type)) return { label: "Sí / No", icon: "check-circle" };
  return { label: "Texto", icon: "text" };
}

function ColumnCard({ column, columns }: { column: ColumnMetadata; columns: ColumnMetadata[] }) {
  const type = columnType(column.sql_type);
  const auxiliary = column.representation === "numeric_projection";
  const original = columns.find((item) => item.sql_name === column.derived_from)?.original_name || column.derived_from;
  const calculationHint = typeof column.numeric_eligible === "boolean"
    ? column.numeric_eligible ? "Admite cálculos numéricos" : "No se usa en cálculos numéricos"
    : undefined;
  const hasInformation = Boolean(calculationHint || column.meaning || column.header_missing || auxiliary);
  const { triggerProps, tooltip } = useTooltip<HTMLButtonElement>(hasInformation ? <>
    {calculationHint && <p className="flex items-start gap-2 font-medium"><ChatIcon name="calculator" className="mt-0.5 size-4 shrink-0 text-primary" />{calculationHint}</p>}
    {column.meaning && <p className="break-words text-foreground-secondary">{formatSourceMessage(column.meaning)}</p>}
    {column.header_missing && <p className="text-warning">Se asignó un nombre porque falta el encabezado.</p>}
    {auxiliary && <>
      <p className="break-words text-foreground-secondary">Versión numérica creada a partir de <span className="font-medium text-foreground">{original || "la columna original"}</span>.</p>
      {typeof column.excluded_count === "number" && column.excluded_count > 0 && <p className="text-foreground-secondary">{column.excluded_count.toLocaleString("es-AR")} {column.excluded_count === 1 ? "valor queda fuera" : "valores quedan fuera"} de los cálculos. {column.excluded_count === 1 ? "Se conserva" : "Se conservan"} en el texto original.</p>}
    </>}
  </> : null);
  const heading = <>
    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-surface-elevated/65 text-foreground-secondary"><ChatIcon name={type.icon} className="size-[18px]" /></span>
    <span className="min-w-0 flex-1"><span className="block break-words text-xs font-medium [overflow-wrap:anywhere]">{column.original_name}</span><span className="mt-1 block text-[11px] text-foreground-secondary">{type.label}</span></span>
    {column.unit && <span className="max-w-20 shrink-0 break-words rounded-lg bg-surface-elevated/60 px-2 py-1 text-[10px] text-foreground-secondary">{column.unit}</span>}
  </>;
  return (
    <li className="min-w-0 self-start rounded-xl bg-background/60">
      {hasInformation ? <button type="button" {...triggerProps} className="flex min-h-16 w-full items-center gap-2.5 rounded-xl p-3 text-left transition-colors hover:bg-surface-elevated/30 focus-visible:bg-surface-elevated/30">{heading}</button> : <div className="flex min-h-16 items-center gap-2.5 p-3">{heading}</div>}
      {tooltip}
    </li>
  );
}

function DatasetDescription({ description }: { description: string }) {
  const [expanded, setExpanded] = useState(false);
  const id = useId();
  const expandable = description.length > 180;
  return (
    <div className="min-w-0 rounded-xl bg-background/40 px-3.5 py-3">
      <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium text-foreground-secondary"><ChatIcon name="description" className="size-3.5 shrink-0" />Descripción</p>
      <p id={id} className={`break-words text-xs leading-relaxed text-foreground-secondary [overflow-wrap:anywhere] ${expandable && !expanded ? "line-clamp-3" : ""}`}>{formatSourceMessage(description)}</p>
      {expandable && <button type="button" onClick={() => setExpanded((current) => !current)} aria-expanded={expanded} aria-controls={id} className="mt-1.5 inline-flex min-h-7 items-center gap-1 rounded-md text-[11px] font-medium text-primary hover:underline underline-offset-4">{expanded ? "Ver menos" : "Ver más"}<ChatIcon name="chevron-down" className={`size-3 transition-transform ${expanded ? "rotate-180" : ""}`} /></button>}
    </div>
  );
}

function DatasetCard({ dataset }: { dataset: DatasetDetail }) {
  const originalColumns = dataset.columns_metadata.filter((column) => column.representation !== "numeric_projection");
  const auxiliaryColumns = dataset.columns_metadata.filter((column) => column.representation === "numeric_projection");
  const description = dataset.semantic_description?.trim() || dataset.description?.trim();
  const hasOverlapWarning = dataset.quality_warnings.some((warning) => /coincid|solap/i.test(warning));
  const numericVersions = useTooltip<HTMLElement>(auxiliaryColumns.length > 0 ? <>
    <p className="flex items-center gap-2 font-medium"><ChatIcon name="calculator" className="size-4 shrink-0 text-primary" />Versiones numéricas</p>
    <p className="text-foreground-secondary">Usan solo los números válidos de una columna de texto. El contenido original se conserva.</p>
  </> : null);
  return (
    <article className="min-w-0 rounded-2xl bg-surface/80 p-4 shadow-sm shadow-black/5 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><ChatIcon name="table" className="size-[18px]" /></span>
          <h3 title={dataset.name} className="min-w-0 break-words text-sm font-semibold [overflow-wrap:anywhere]">{dataset.source_locator.sheet || dataset.name}</h3>
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-medium ${dataset.queryable ? "source-status-ready bg-primary/5" : "bg-surface-elevated/70 text-foreground-secondary"}`}>
          <ChatIcon name={dataset.queryable ? "check-circle" : "clock"} className="size-3.5 shrink-0" />
          {!dataset.is_active ? "Inactiva" : dataset.queryable ? "Disponible" : "No disponible"}
        </span>
      </div>
      <div className={`mt-4 grid items-start gap-4 ${description ? "sm:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]" : ""}`}>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
          <Information label="Registros" icon="rows">{dataset.row_count.toLocaleString("es-AR")}</Information>
          <Information label="Columnas" icon="columns">{originalColumns.length.toLocaleString("es-AR")}</Information>
          {dataset.source_locator.range && <Information label="Celdas de origen" icon="table">{dataset.source_locator.range}</Information>}
        </dl>
        {description && <DatasetDescription description={description} />}
      </div>
      <div className="mt-4 space-y-3">
        <Warnings warnings={dataset.quality_warnings} />
        {Boolean(dataset.source_locator.possible_overlap?.length) && !hasOverlapWarning && <p className="flex items-start gap-2 rounded-xl bg-warning/5 px-3.5 py-3 text-xs leading-relaxed"><ChatIcon name="alert-triangle" className="mt-0.5 size-4 shrink-0 text-warning" />Algunos registros coinciden con otra tabla. Revisá las advertencias antes de combinar los datos.</p>}
      </div>
      <section aria-label="Columnas detectadas" className="mt-4">
        <h4 className="mb-2.5 flex items-center gap-1.5 text-xs font-medium"><ChatIcon name="columns" className="size-3.5 text-foreground-secondary" />Columnas detectadas <span className="text-foreground-secondary">({originalColumns.length})</span></h4>
        <ul className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,180px),1fr))] gap-2">{originalColumns.map((column) => <ColumnCard key={column.sql_name} column={column} columns={dataset.columns_metadata} />)}</ul>
      </section>
      {auxiliaryColumns.length > 0 && <details className="group mt-3">
        <summary {...numericVersions.triggerProps} className="flex w-fit cursor-pointer list-none items-center gap-1.5 rounded-lg py-1.5 text-xs text-foreground-secondary [&::-webkit-details-marker]:hidden"><ChatIcon name="calculator" className="size-3.5" />Versiones numéricas ({auxiliaryColumns.length})<ChatIcon name="chevron-down" className="size-3.5 transition-transform group-open:rotate-180" /></summary>
        <ul className="mt-2 grid grid-cols-[repeat(auto-fit,minmax(min(100%,180px),1fr))] gap-2">{auxiliaryColumns.map((column) => <ColumnCard key={column.sql_name} column={column} columns={dataset.columns_metadata} />)}</ul>
      </details>}
      {numericVersions.tooltip}
    </article>
  );
}

export function SourceDetail({ source, toggling, onToggle }: {
  source: SourceDetailData; toggling: boolean; onToggle: () => void;
}) {
  const prepared = isPrepared(source.processing_status);
  const warnings = source.processing_report.warnings || [];
  const errors = sourceErrors(source);
  const failed = source.processing_status === "failed";
  const attention = source.processing_status === "ready_with_warnings" || source.semantic_index_status === "failed";
  const statusMessage = source.processing_status === "uploaded" ? "Archivo recibido. Su preparación va a empezar en unos instantes."
    : source.processing_status === "processing" ? "Estamos preparando el archivo. Esta vista se actualiza sola."
    : failed ? "No pudimos preparar el archivo."
    : !source.isActive ? "El archivo está preparado. Activá la fuente para consultarlo."
    : source.queryable ? "El archivo está listo para tus consultas."
    : source.semantic_index_status === "failed" ? "El archivo está preparado."
    : "El archivo está preparado. Estamos habilitando la búsqueda.";
  return (
    <div className="space-y-5">
      <section aria-label="Estado de la fuente" className="rounded-2xl bg-surface/80 p-4 shadow-sm shadow-black/5 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <p role="status" aria-live="polite" className="flex min-w-0 flex-1 items-center gap-2.5 text-xs leading-relaxed sm:text-[13px]">
            <ChatIcon name={failed ? "alert-circle" : attention ? "alert-triangle" : prepared ? "check-circle" : "clock"} className={`size-5 shrink-0 ${failed ? "text-error" : attention ? "text-warning" : "text-primary"}`} />{statusMessage}
          </p>
          <SourceToggle active={source.isActive} busy={toggling} name={source.original_filename} onToggle={onToggle} />
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-4 lg:grid-cols-4">
          <Information label="Cargado" icon="calendar"><time dateTime={source.created_at}>{formatDate(source.created_at)}</time></Information>
          <Information label="Preparación" icon="refresh"><ProcessingBadge status={source.processing_status} compact /></Information>
          <Information label="Búsqueda" icon="search"><SemanticBadge status={source.semantic_index_status} compact /></Information>
          <Information label="Consultas" icon="message">{source.queryable ? "Disponible" : "No disponible"}</Information>
        </dl>
        {source.description && <p className="mt-4 break-words text-xs leading-relaxed text-foreground-secondary">{formatSourceMessage(source.description)}</p>}
        {failed && <p className="mt-3 text-[11px] text-foreground-secondary">Activar la fuente no vuelve a preparar el archivo.</p>}
        <div className="mt-4 space-y-3">
          <Warnings warnings={warnings} title="Advertencias generales" />
          {typeof source.processing_report.warning_count === "number" && source.processing_report.warning_count > warnings.length && <p className="text-xs text-foreground-secondary">Hay {source.processing_report.warning_count} advertencias en total. Acá se muestran {warnings.length}.</p>}
          {errors.length > 0 && <div role="alert" className="rounded-xl bg-error/5 px-3.5 py-3"><p className="flex items-center gap-2 text-xs font-medium"><ChatIcon name="alert-circle" className="size-4 shrink-0 text-error" />Error de preparación</p><ul className="mt-2 space-y-1.5 text-xs leading-relaxed">{errors.map((error, index) => <li key={index} className="break-words">{error}</li>)}</ul></div>}
          {source.processing_report.semantic_index_error && <div className="rounded-xl bg-warning/5 px-3.5 py-3"><p className="flex items-center gap-2 text-xs font-medium"><ChatIcon name="alert-triangle" className="size-4 shrink-0 text-warning" />Búsqueda no disponible</p><p className="mt-2 text-xs leading-relaxed text-foreground-secondary">{prepared ? "No pudimos habilitar la búsqueda. Los datos preparados siguen guardados." : "No pudimos habilitar la búsqueda. Intentá actualizar en unos instantes."}</p></div>}
        </div>
      </section>
      <section aria-labelledby="datasets-title" className="min-w-0">
        <h2 id="datasets-title" className="mb-3 flex items-center gap-2 text-sm font-semibold"><ChatIcon name="table" className="size-4 text-foreground-secondary" />Tablas detectadas <span className="font-normal text-foreground-secondary">({source.datasets.length})</span></h2>
        {source.datasets.length === 0 ? <div className="flex items-center gap-3 rounded-2xl bg-surface/60 p-5 text-xs text-foreground-secondary"><ChatIcon name="table" className="size-6 shrink-0 opacity-60" /><p>{failed ? "No se encontraron tablas en este archivo." : "Las tablas van a aparecer cuando termine la preparación."}</p></div> : <div className="space-y-3">{source.datasets.map((dataset) => <DatasetCard key={dataset.id} dataset={dataset} />)}</div>}
      </section>
    </div>
  );
}
