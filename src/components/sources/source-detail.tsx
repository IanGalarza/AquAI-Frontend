import type { ReactNode } from "react";
import type { DatasetDetail, SourceDetail as SourceDetailData } from "@/types/sources";
import { formatBytes, formatDate, isPrepared, sourceErrors } from "@/utils/sources";
import { ProcessingBadge, SemanticBadge, SourceToggle } from "./source-status";

function Information({ label, children }: { label: string; children: ReactNode }) {
  return <div className="min-w-0"><dt className="text-xs text-foreground-secondary">{label}</dt><dd className="mt-1.5 break-words text-sm">{children}</dd></div>;
}

function Warnings({ warnings, title = "Advertencias" }: { warnings: string[]; title?: string }) {
  if (warnings.length === 0) return null;
  return (
    <details open={warnings.length <= 4} className="rounded-xl border border-warning/20 bg-warning/5 px-4 py-3">
      <summary className="cursor-pointer text-sm font-medium">{title} ({warnings.length})</summary>
      <ul className="mt-3 space-y-2 pl-4 text-xs leading-relaxed text-foreground-secondary">
        {warnings.map((warning, index) => <li key={index} className="list-disc break-words">{warning}</li>)}
      </ul>
    </details>
  );
}

function DatasetCard({ dataset }: { dataset: DatasetDetail }) {
  const auxiliaryCount = dataset.columns_metadata.filter((column) => column.representation === "numeric_projection").length;
  return (
    <article className="min-w-0 rounded-2xl border border-border bg-surface/65 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 className="min-w-0 flex-1 break-words text-sm font-semibold leading-relaxed [overflow-wrap:anywhere]">{dataset.name}</h3>
        <span className={`rounded-full border px-2.5 py-1 text-xs ${dataset.queryable ? "border-primary/25 bg-primary/5" : "border-border text-foreground-secondary"}`}>
          {dataset.queryable ? "Disponible para consultas" : "No disponible para consultas"}
        </span>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-4">
        <Information label="Hoja de origen">{dataset.source_locator.sheet || "No informada"}</Information>
        <Information label="Rango de origen">{dataset.source_locator.range || "No informado"}</Information>
        <Information label="Registros">{dataset.row_count.toLocaleString("es-AR")}</Information>
        <Information label="Columnas">{dataset.columns_metadata.length.toLocaleString("es-AR")}{auxiliaryCount > 0 && <span className="block text-xs text-foreground-secondary">{auxiliaryCount} {auxiliaryCount === 1 ? "auxiliar" : "auxiliares"}</span>}</Information>
      </dl>
      {dataset.description && <p className="mt-4 break-words text-sm leading-relaxed text-foreground-secondary">{dataset.description}</p>}
      {dataset.semantic_description && dataset.semantic_description !== dataset.description && <div className="mt-3"><p className="text-xs font-medium">Descripción semántica</p><p className="mt-1 break-words text-sm leading-relaxed text-foreground-secondary">{dataset.semantic_description}</p></div>}
      {!dataset.is_active && <p className="mt-3 text-xs text-foreground-secondary">Este dataset está inactivo en el catálogo.</p>}
      <div className="mt-4 space-y-3">
        <Warnings warnings={dataset.quality_warnings} />
        {Boolean(dataset.source_locator.possible_overlap?.length) && <p className="rounded-lg bg-warning/5 px-3 py-2 text-xs leading-relaxed">El backend detectó posibles solapamientos con otros datasets. Revisá las advertencias antes de combinar observaciones.</p>}
      </div>
      <details className="mt-4 rounded-xl border border-border bg-background/50">
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium">Metadatos de columnas ({dataset.columns_metadata.length})</summary>
        {auxiliaryCount > 0 && <p className="px-4 pb-3 text-xs leading-relaxed text-foreground-secondary">Las proyecciones numéricas son columnas auxiliares derivadas del texto original. No agregan registros ni observaciones independientes.</p>}
        <div className="max-w-full overflow-x-auto rounded-b-xl" tabIndex={0} role="region" aria-label={`Columnas de ${dataset.name}`}>
          <table className="w-full min-w-[790px] text-left text-xs">
            <caption className="sr-only">Metadatos reales de las columnas del dataset</caption>
            <thead className="border-y border-border bg-surface/80 text-foreground-secondary">
              <tr>{["Nombre original", "Nombre SQL", "Tipo", "Unidad", "Significado", "Cálculos numéricos", "Representación"].map((label) => <th key={label} scope="col" className="px-4 py-3 font-medium">{label}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-border/70">
              {dataset.columns_metadata.map((column) => <tr key={column.sql_name} className="align-top">
                <th scope="row" className="max-w-64 break-words px-4 py-3 font-medium [overflow-wrap:anywhere]">{column.original_name}{column.header_missing && <span className="mt-1 block font-normal text-warning">Encabezado provisional</span>}</th>
                <td className="max-w-48 break-all px-4 py-3 font-mono">{column.sql_name}</td>
                <td className="px-4 py-3">{column.sql_type}</td>
                <td className="px-4 py-3">{column.unit || "No documentada"}</td>
                <td className="min-w-36 max-w-72 break-words px-4 py-3">{column.meaning || "No documentado"}</td>
                <td className="px-4 py-3">{column.numeric_eligible === true ? "Sí" : column.numeric_eligible === false ? "No" : "No informado"}</td>
                <td className="min-w-40 px-4 py-3">{column.representation === "numeric_projection" ? <><span className="font-medium">Proyección numérica auxiliar</span><span className="mt-1 block break-all text-foreground-secondary">Derivada de {column.derived_from || "la columna original"}</span>{typeof column.excluded_count === "number" && <span className="mt-1 block text-foreground-secondary">{column.excluded_count} valores excluidos de cálculos</span>}</> : "Original"}</td>
              </tr>)}
            </tbody>
          </table>
        </div>
      </details>
    </article>
  );
}

export function SourceDetail({ source, toggling, onToggle }: {
  source: SourceDetailData; toggling: boolean; onToggle: () => void;
}) {
  const prepared = isPrepared(source.processing_status);
  const warnings = source.processing_report.warnings || [];
  const errors = sourceErrors(source);
  const statusMessage = source.processing_status === "uploaded" ? "Archivo recibido. Está en cola para preparar sus datasets."
    : source.processing_status === "processing" ? "Preparando los datasets. Esta vista se actualiza automáticamente."
    : source.processing_status === "failed" ? "La preparación no pudo completarse. Consultá los errores y advertencias de esta fuente."
    : source.semantic_index_status === "ready" ? "Preparación e indexación semántica finalizadas."
    : source.semantic_index_status === "failed" ? "Los datasets se almacenaron correctamente en PostgreSQL. El índice semántico no está disponible."
    : "Los datasets están preparados en PostgreSQL. La indexación semántica continúa por separado; esta vista se actualiza automáticamente.";
  return (
    <div className="space-y-5">
      <section aria-labelledby="source-name" className="rounded-2xl border border-border bg-surface/65 p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1"><h1 id="source-name" className="break-words text-xl font-medium tracking-[-0.03em] [overflow-wrap:anywhere]">{source.original_filename}</h1>{source.name !== source.original_filename && <p className="mt-1 break-words text-sm text-foreground-secondary">{source.name}</p>}</div>
          <SourceToggle active={source.isActive} busy={toggling} name={source.original_filename} onToggle={onToggle} />
        </div>
        <p role="status" aria-live="polite" className={`mt-4 rounded-xl border px-4 py-3 text-sm leading-relaxed ${source.processing_status === "failed" ? "border-error/20 bg-error/5" : source.semantic_index_status === "failed" ? "border-warning/20 bg-warning/5" : "border-primary/20 bg-primary/5"}`}>{statusMessage}</p>
        <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-5 lg:grid-cols-3">
          <Information label="Tipo de archivo">{source.file_type.toUpperCase()}</Information>
          <Information label="Tamaño">{formatBytes(source.file_size_bytes)}</Information>
          <Information label="Fecha de carga"><time dateTime={source.created_at}>{formatDate(source.created_at)}</time></Information>
          <Information label="Procesamiento"><ProcessingBadge status={source.processing_status} /></Information>
          <Information label="Índice semántico"><SemanticBadge status={source.semantic_index_status} /></Information>
          <Information label="Disponibilidad de los datos">{source.queryable ? "Disponibles para consultas" : "No disponibles para consultas"}</Information>
        </dl>
        {source.description && <p className="mt-5 break-words text-sm leading-relaxed text-foreground-secondary">{source.description}</p>}
        <p className="mt-5 text-xs leading-relaxed text-foreground-secondary">Desactivar conserva el archivo y los datasets. Reactivar una fuente fallida no vuelve a procesarla automáticamente.</p>
        <div className="mt-4 space-y-3">
          <Warnings warnings={warnings} title="Advertencias generales" />
          {typeof source.processing_report.warning_count === "number" && source.processing_report.warning_count > warnings.length && <p className="text-xs text-foreground-secondary">El backend informa {source.processing_report.warning_count} advertencias en total; se muestran las {warnings.length} disponibles.</p>}
          {errors.length > 0 && <div role="alert" className="rounded-xl border border-error/20 bg-error/5 px-4 py-3"><p className="text-sm font-medium">Errores de preparación</p><ul className="mt-2 space-y-2 text-xs leading-relaxed">{errors.map((error, index) => <li key={index} className="break-words">{error}</li>)}</ul></div>}
          {source.processing_report.semantic_index_error && <div className="rounded-xl border border-warning/20 bg-warning/5 px-4 py-3"><p className="text-sm font-medium">Indexación semántica</p><p className="mt-2 break-words text-xs leading-relaxed">{source.processing_report.semantic_index_error}</p>{prepared && <p className="mt-2 text-xs text-foreground-secondary">Esta incidencia no elimina ni invalida los datos preparados en PostgreSQL.</p>}</div>}
        </div>
      </section>
      <section aria-labelledby="datasets-title" className="min-w-0">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><h2 id="datasets-title" className="text-base font-semibold">Datasets generados <span className="ml-1 text-sm font-normal text-foreground-secondary">({source.datasets.length})</span></h2></div>
        {source.datasets.length === 0 ? <p className="rounded-2xl border border-dashed border-border bg-surface/40 p-6 text-sm text-foreground-secondary">{source.processing_status === "failed" ? "No hay datasets disponibles. Revisá el informe de preparación." : "Todavía no hay datasets preparados."}</p> : <div className="space-y-4">{source.datasets.map((dataset) => <DatasetCard key={dataset.id} dataset={dataset} />)}</div>}
        <p className="mt-4 text-xs leading-relaxed text-foreground-secondary">La API permite consultar conteos y metadatos. La consulta de filas completas y la descarga del archivo original todavía no están disponibles.</p>
      </section>
    </div>
  );
}
