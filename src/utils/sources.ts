import type { ProcessingStatus, SourceDetail, SourceList, SourceState } from "../types/sources";

const configuredLimit = Number(process.env.NEXT_PUBLIC_MAX_UPLOAD_BYTES || 10 * 1024 * 1024);
export const MAX_UPLOAD_BYTES = Number.isFinite(configuredLimit) && configuredLimit > 0
  ? configuredLimit : 10 * 1024 * 1024;

const configuredDocumentLimit = Number(process.env.NEXT_PUBLIC_MAX_DOCUMENT_UPLOAD_BYTES || 64 * 1024 * 1024);
export const MAX_DOCUMENT_UPLOAD_BYTES = Number.isFinite(configuredDocumentLimit) && configuredDocumentLimit > 0
  ? configuredDocumentLimit : 64 * 1024 * 1024;

export const ACCEPTED_SOURCE_FILES = ".csv,.xlsx,.pdf,.docx";

const documentLanguages: Record<string, string> = { en: "Inglés", es: "Español", pt: "Portugués" };

const configuredCatalogLoadingMs = Number(process.env.NEXT_PUBLIC_MINIMUM_CATALOG_LOADING_MS || 600);
export const MINIMUM_CATALOG_LOADING_MS = Number.isFinite(configuredCatalogLoadingMs) && configuredCatalogLoadingMs >= 0
  ? configuredCatalogLoadingMs : 600;

//
// Valida el nombre y tamaño de un archivo a subir y devuelve el error o null.
//
export function validateSourceFile(file: Pick<File, "name" | "size">): string | null {
  const isDocument = /\.(pdf|docx)$/i.test(file.name);
  if (!isDocument && !/\.(csv|xlsx)$/i.test(file.name)) return "Seleccioná un archivo CSV, XLSX, PDF o DOCX.";
  if (file.size === 0) return "El archivo está vacío. Seleccioná un archivo con datos.";
  const limit = isDocument ? MAX_DOCUMENT_UPLOAD_BYTES : MAX_UPLOAD_BYTES;
  if (file.size > limit) return `El archivo supera el límite de ${formatBytes(limit)}.`;
  return null;
}

//
// Indica si un tipo de archivo corresponde a un documento y no a una planilla.
//
export function isDocumentType(fileType: string): boolean {
  return fileType === "pdf" || fileType === "docx";
}

//
// Devuelve el nombre del idioma detectado en un documento.
//
export function documentLanguage(language: string | null): string {
  return (language && documentLanguages[language]) || "Sin determinar";
}

//
// Indica si la preparación de una fuente terminó.
//
export function isPrepared(status: ProcessingStatus): boolean {
  return status === "ready" || status === "ready_with_warnings";
}

//
// Indica si una fuente necesita volver a consultarse hasta terminar de prepararse.
//
export function needsSourcePolling(source: SourceState): boolean {
  return source.processing_status === "uploaded" || source.processing_status === "processing" ||
    (isPrepared(source.processing_status) && (source.semantic_index_status === "pending" || source.semantic_index_status === "processing"));
}

//
// Indica si algún elemento del listado necesita seguir consultándose.
//
export function needsListPolling(list: SourceList): boolean {
  return list.items.some(needsSourcePolling);
}

//
// Formatea un tamaño en bytes como B, KB o MB.
//
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toLocaleString("es-AR", { maximumFractionDigits: 1 })} KB`;
  return `${(bytes / (1024 * 1024)).toLocaleString("es-AR", { maximumFractionDigits: 1 })} MB`;
}

//
// Formatea una fecha para mostrarla en es-AR.
//
export function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Fecha no disponible" : date.toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });
}

//
// Reescribe un mensaje técnico del procesamiento en un texto más claro.
//
export function formatSourceMessage(message: string): string {
  return message
    .replace(/No se encontraron tablas confiables;\s*se conserva el original\./g, "No se encontraron tablas confiables, por lo que se conserva el archivo original.")
    .replace(/permanece TEXT porque contiene valores mixtos o ambiguos/g, "se conserva como texto porque combina distintos tipos de datos o valores poco claros")
    .replace(/fórmulas se conservan como expresiones de texto;\s*no se recalcularon/g, "fórmulas se guardaron como texto, sin volver a calcularse")
    .replace(/revisar possible_overlap antes de combinar observaciones/g, "revisá las advertencias antes de combinar los datos")
    .replace(/;\s+(\S)/g, (_, next: string) => `. ${next.toLocaleUpperCase("es-AR")}`);
}

//
// Devuelve los mensajes de error de procesamiento de una fuente.
//
export function sourceErrors(source: SourceDetail): string[] {
  return (source.processing_report.errors || []).flatMap((error) =>
    typeof error === "string" ? [formatSourceMessage(error)]
      : error.code === "no_reliable_tables" ? ["No se encontraron tablas confiables, por lo que se conserva el archivo original."]
      : error.message ? [formatSourceMessage(error.message)] : []);
}
