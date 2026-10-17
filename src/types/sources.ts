export type ProcessingStatus = "uploaded" | "processing" | "ready" | "ready_with_warnings" | "failed";
export type SemanticIndexStatus = "pending" | "processing" | "ready" | "failed";
export type SourceSort = "newest" | "oldest" | "name_asc" | "name_desc";
export type SourceListFilters = { name?: string; sort?: SourceSort };

export type SourceState = {
  id: string;
  processing_status: ProcessingStatus;
  semantic_index_status: SemanticIndexStatus;
};

export type SourceAccepted = { id: string; duplicate: boolean };

export type SourceActivation = SourceState & { isActive: boolean; queryable: boolean };

export type SourceListItem = SourceState & {
  name: string;
  file_type: string;
  file_size_bytes: number;
  created_at: string;
  isActive: boolean;
  dataset_count: number;
};

export type SourceList = {
  items: SourceListItem[];
  total: number;
  page: number;
  page_size: number;
};

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
};
