export type ProcessingStatus = "uploaded" | "processing" | "ready" | "ready_with_warnings" | "failed";
export type SemanticIndexStatus = "pending" | "processing" | "ready" | "failed";
export type SourceSort = "newest" | "oldest" | "name_asc" | "name_desc";
export type SourceListFilters = { name?: string; sort?: SourceSort };

export type SourceAccepted = {
  id: string;
  processing_status: ProcessingStatus;
  semantic_index_status: SemanticIndexStatus;
  duplicate: boolean;
};

export type SourceListItem = SourceAccepted & {
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
  representation?: string;
  derived_from?: string;
  excluded_count?: number;
  header_missing?: boolean;
};

export type DatasetDetail = {
  id: string;
  name: string;
  description: string | null;
  semantic_description: string | null;
  source_locator: {
    sheet?: string;
    range?: string;
    possible_overlap?: unknown[];
    [key: string]: unknown;
  };
  physical_table_name: string | null;
  version: number;
  row_count: number;
  columns_metadata: ColumnMetadata[];
  quality_warnings: string[];
  is_active: boolean;
  queryable: boolean;
  semantic_point_id: string;
};

export type SourceDetail = SourceAccepted & {
  name: string;
  original_filename: string;
  file_type: string;
  mime_type: string;
  file_size_bytes: number;
  description: string | null;
  isActive: boolean;
  created_at: string;
  updated_at: string | null;
  processing_report: {
    summary?: string;
    warnings?: string[];
    warning_count?: number;
    errors?: (string | { code?: string; message?: string })[];
    semantic_index_error?: string;
    [key: string]: unknown;
  };
  datasets: DatasetDetail[];
  queryable: boolean;
};
