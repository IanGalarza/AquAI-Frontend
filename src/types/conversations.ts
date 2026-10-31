export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
export type JsonObject = { [key: string]: JsonValue };
export type AnswerStatus = "validated" | "partial" | "needs_clarification" | "insufficient_coverage" | "failed";
export type Language = "es" | "en";

export type Conversation = {
  id: string;
  title: string;
  last_message_at: string | null;
  created_at: string;
  updated_at: string | null;
};
export type ConversationPage = { items: Conversation[]; total: number; page: number; page_size: number };
export type MessageSource = {
  id: string;
  source_id: string;
  dataset_id: string | null;
  reference_order: number;
  details: JsonObject;
};
export type CitationVariable = { name: string; column: string | null; row: number | null; cells: string | null };
export type Citation = {
  id: string;
  source_id: string;
  dataset_id: string;
  version: number;
  file_name: string;
  file_type: string;
  sheet: string | null;
  dataset: string;
  first_row: number | null;
  last_row: number | null;
  variables: CitationVariable[];
};
export type AnswerSegment = {
  kind: "paragraph" | "note";
  text: string;
  items: string[];
  citations: string[];
  table: string | null;
  chart: string | null;
};
export type TimeGrain = "day" | "month" | "year";
export type TableColumnView = { name: string; label: string; unit: string | null; unit_documented: boolean; numeric: boolean; time_grain: TimeGrain | null };
export type TableView = { evidence_id: string; columns: TableColumnView[]; citations: string[] };
export type ChartView = { operation_id: string; citations: string[]; x_title: string | null; y_title: string | null; legend_title: string | null };
export type MessagePresentation = {
  segments: AnswerSegment[];
  citations: Citation[];
  tables: TableView[];
  charts: ChartView[];
  trailing_tables: string[];
  trailing_charts: string[];
  duration_ms: number | null;
};
export type Message = {
  id: string;
  conversation_id: string;
  sequence_number: number;
  role: string;
  content: string;
  content_data: JsonObject;
  status: { id: number; name: string };
  created_at: string;
  updated_at: string | null;
  sources: MessageSource[];
  presentation?: MessagePresentation | null;
};
export type MessagePage = { conversation_id: string; items: Message[]; total: number; page: number; page_size: number };
export type OptimisticMessage = { id: string; role: "user"; content: string; optimistic: true };
export type ChatMessage = Message | OptimisticMessage;

export type ColumnReference = { kind: "column"; dataset_id: string; column: string };
export type OutputField = {
  name: string;
  sql_type: string;
  numeric_eligible: boolean;
  unit: string | null;
  unit_status: "documented" | "unknown" | "dimensionless";
  sources: ColumnReference[];
};
export type ValueExclusion = {
  output_name: string;
  group: JsonObject;
  input_rows: number;
  valid_rows: number;
  null_rows: number;
  zero_divisions: number;
  policy: "exclude" | "preserve";
};
export type StoredTable = {
  evidence_id: string;
  operation_id: string;
  columns: OutputField[];
  rows: JsonObject[];
  total_rows: number;
  stored_rows: number;
  storage: "inline" | "preview" | "metadata_only";
  complete: boolean;
  warnings: string[];
  rows_processed: number | null;
  rows_filtered: number;
  exclusions: ValueExclusion[];
  exclusions_complete: boolean;
};
export type DatasetProvenance = {
  source_name: string;
  original_filename: string;
  file_type: string;
  content_hash: string;
  source_locator: JsonObject;
  processing_status: string;
  semantic_index_status: string;
};
export type SourceReference = {
  source_id: string;
  dataset_id: string;
  dataset_name: string;
  version: number;
  provenance: DatasetProvenance;
};
export type OperationReference = {
  evidence_id: string;
  operation_id: string;
  tool: "sql" | "python";
  dataset_ids: string[];
  input_operation_ids: string[];
};
export type PlotlyFigure = {
  renderer: "plotly";
  renderer_version: string;
  plotly_js_version: string;
  data: JsonObject[];
  layout: JsonObject;
  config: JsonObject;
};
export type Visualization = {
  operation_id: string;
  chart_type: "line" | "bar" | "scatter" | "histogram";
  title: string;
  x_axis: { field: OutputField; label: string };
  y_axis: { field: OutputField; label: string };
  series_field: OutputField | null;
  series: {
    name: string | null;
    points: { x: string | number | boolean; y: number | null }[];
    bins: { lower: number; upper: number; count: number; upper_inclusive: boolean }[];
  }[];
  datasets: { dataset_id: string; source_id: string; version: number }[];
  input_operation_ids: string[];
  input_rows: number;
  excluded_rows: number;
  numeric_encoding: "float64_for_display";
  warnings: string[];
  figure: PlotlyFigure | null;
};
export type ExecutionError = { code: string; message: string };
export type StoredResponse = {
  response_type?: "analytical" | "general" | "catalog" | "clarification" | "historical";
  status: AnswerStatus | "answered";
  validation_status: AnswerStatus | null;
  answer: string;
  language: Language;
  sources: SourceReference[];
  operation_references: OperationReference[];
  results: StoredTable[];
  warnings: string[];
  limitations: string[];
  errors: ExecutionError[];
  validation_issues: { code: string; message: string; operation_id: string | null; severity: "warning" | "error" }[];
  missing_information: string[];
  clarification_question: string | null;
  pending_operations: string[];
  visualizations: Visualization[];
  generation: {
    status: "generated" | "deterministic" | "failed";
    model: string | null;
    input_tokens: number | null;
    output_tokens: number | null;
    duration_ms: number;
    context_record?: JsonObject | null;
    error: ExecutionError | null;
  };
  timings_ms: Record<string, number>;
  planner_model: string | null;
  planner_input_tokens: number | null;
  planner_output_tokens: number | null;
  historical_message_ids?: string[];
  routing?: {
    route: "general" | "catalog" | "data" | "historical" | "needs_clarification" | "failed";
    context_used: boolean;
    question_contextualized: boolean;
    history_message_ids: string[];
    model: string;
    input_tokens: number | null;
    output_tokens: number | null;
    duration_ms: number;
  } | null;
};
export type AssistantSnapshot = {
  schema_version: 1;
  kind: "assistant_response";
  response: StoredResponse;
  operations: JsonObject[];
  context_policy: JsonObject;
  storage_warnings: string[];
  omitted_visualizations: JsonObject[];
  validated_at: string | null;
};
