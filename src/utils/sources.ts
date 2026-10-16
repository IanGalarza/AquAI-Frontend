import type { ProcessingStatus, SourceAccepted, SourceDetail, SourceList } from "../types/sources";

const configuredLimit = Number(process.env.NEXT_PUBLIC_MAX_UPLOAD_BYTES || 10 * 1024 * 1024);
export const MAX_UPLOAD_BYTES = Number.isFinite(configuredLimit) && configuredLimit > 0
  ? configuredLimit : 10 * 1024 * 1024;

const configuredCatalogLoadingMs = Number(process.env.NEXT_PUBLIC_MINIMUM_CATALOG_LOADING_MS || 600);
export const MINIMUM_CATALOG_LOADING_MS = Number.isFinite(configuredCatalogLoadingMs) && configuredCatalogLoadingMs >= 0
  ? configuredCatalogLoadingMs : 600;

export function validateSourceFile(file: Pick<File, "name" | "size">): string | null {
  if (!/\.(csv|xlsx)$/i.test(file.name)) return "Seleccioná un archivo CSV o XLSX. PDF todavía no está disponible.";
  if (file.size === 0) return "El archivo está vacío. Seleccioná un archivo con datos.";
  if (file.size > MAX_UPLOAD_BYTES) return `El archivo supera el límite de ${formatBytes(MAX_UPLOAD_BYTES)}.`;
  return null;
}

export function isPrepared(status: ProcessingStatus): boolean {
  return status === "ready" || status === "ready_with_warnings";
}

export function needsSourcePolling(source: SourceAccepted): boolean {
  return source.processing_status === "uploaded" || source.processing_status === "processing" ||
    (isPrepared(source.processing_status) && (source.semantic_index_status === "pending" || source.semantic_index_status === "processing"));
}

export function needsListPolling(list: SourceList): boolean {
  return list.items.some(needsSourcePolling);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toLocaleString("es-AR", { maximumFractionDigits: 1 })} KB`;
  return `${(bytes / (1024 * 1024)).toLocaleString("es-AR", { maximumFractionDigits: 1 })} MB`;
}

export function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Fecha no disponible" : date.toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });
}

export function sourceErrors(source: SourceDetail): string[] {
  return (source.processing_report.errors || []).flatMap((error) =>
    typeof error === "string" ? [error] : error.message ? [error.message] : []);
}
