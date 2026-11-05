export type ProcessingStatus = "uploaded" | "processing" | "ready" | "ready_with_warnings" | "failed";
export type SemanticIndexStatus = "pending" | "processing" | "ready" | "failed";
export type SourceSort = "newest" | "oldest" | "name_asc" | "name_desc";

//
// Filtros del listado de fuentes por nombre y orden.
//
export type SourceListFilters = { name?: string; sort?: SourceSort };

//
// Estado de preparación y de búsqueda de una fuente.
//
export type SourceState = {
  id: string;
  processing_status: ProcessingStatus;
  semantic_index_status: SemanticIndexStatus;
};

//
// Respuesta del backend al aceptar la subida de una fuente.
//
export type SourceAccepted = { id: string; duplicate: boolean };

//
// Respuesta de la activación o desactivación de una fuente.
//
export type SourceActivation = SourceState & { isActive: boolean; queryable: boolean };

//
// Fuente tal como aparece en el listado.
//
export type SourceListItem = SourceState & {
  name: string;
  file_type: string;
  file_size_bytes: number;
  created_at: string;
  isActive: boolean;
  dataset_count: number;
};

//
// Respuesta paginada del listado de fuentes.
//
export type SourceList = {
  items: SourceListItem[];
  total: number;
  page: number;
  page_size: number;
};

//
// Metadatos de una columna de un conjunto de datos.
//
export type ColumnMetadata = {
  original_name: string;
  sql_name: string;
  sql_type: string;
  unit?: string | null;
  meaning?: string | null;
  numeric_eligible?: boolean;
  representation?: string | null;
  derived_from?: string | null;
  excluded_count?: number | null;
  header_missing?: boolean;
};

//
// Detalle de un conjunto de datos de una fuente.
//
export type DatasetDetail = {
  id: string;
  name: string;
  description: string | null;
  source_locator: {
    sheet?: string | null;
    range?: string | null;
    has_possible_overlap: boolean;
  };
  row_count: number;
  columns_metadata: ColumnMetadata[];
  quality_warnings: string[];
  is_active: boolean;
  queryable: boolean;
};

//
// Resumen del contenido extraído de un documento PDF o DOCX.
//
export type DocumentSummary = {
  id: string;
  title: string | null;
  language: string | null;
  page_count: number | null;
  duplicate_of_source_id: string | null;
  section_count: number;
  chunk_count: number;
  table_count: number;
  figure_count: number;
  index_error?: string | null;
};

//
// Detalle de una fuente con su informe de procesamiento y conjuntos de datos.
//
export type SourceDetail = SourceState & {
  original_filename: string;
  file_type: string;
  file_size_bytes: number;
  description: string | null;
  isActive: boolean;
  created_at: string;
  processing_report: {
    warnings?: string[];
    warning_count?: number;
    errors?: (string | { code?: string | null; message?: string | null })[];
  };
  datasets: DatasetDetail[];
  queryable: boolean;
  document?: DocumentSummary | null;
};
