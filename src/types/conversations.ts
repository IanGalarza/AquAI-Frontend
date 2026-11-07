export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

//
// Objeto JSON con claves de texto y valores JSON.
//
export type JsonObject = { [key: string]: JsonValue };
export type AnswerStatus = "validated" | "partial" | "needs_clarification" | "insufficient_coverage" | "failed";
export type Language = "es" | "en";

//
// Conversación tal como la devuelve el backend.
//
export type Conversation = {
  id: string;
  title: string;
  last_message_at: string | null;
  created_at: string;
  updated_at: string | null;
};

//
// Respuesta paginada del listado de conversaciones.
//
export type ConversationPage = { items: Conversation[]; total: number; page: number; page_size: number };

//
// Fuente asociada a un mensaje, con su orden de referencia.
//
export type MessageSource = {
  id: string;
  source_id: string;
  dataset_id: string | null;
  reference_order: number;
  details: JsonObject;
};

//
// Variable citada con su columna, fila y celdas de origen.
//
export type CitationVariable = { name: string; column: string | null; row: number | null; cells: string | null };

//
// Cita de una fuente con archivo, hoja, filas y variables usadas.
//
export type Citation = {
  id: string;
  kind: "dataset" | "document";
  source_id: string;
  dataset_id: string | null;
  version: number | null;
  file_name: string;
  file_type: string;
  sheet: string | null;
  dataset: string;
  first_row: number | null;
  last_row: number | null;
  variables: CitationVariable[];
  title: string | null;
  pages: string | null;
  section: string | null;
  excerpt: string | null;
  doubtful: boolean;
};

//
// Segmento de una respuesta, párrafo o nota, con sus citas y tabla o gráfico asociados.
//
export type AnswerSegment = {
  kind: "paragraph" | "note";
  role: "result" | "documented" | "relation" | "hypothesis" | null;
  text: string;
  items: string[];
  citations: string[];
  table: string | null;
  chart: string | null;
};
export type TimeGrain = "day" | "month" | "year";

//
// Metadatos de presentación de una columna de tabla.
//
export type TableColumnView = { name: string; label: string; unit: string | null; unit_documented: boolean; numeric: boolean; time_grain: TimeGrain | null };

//
// Presentación de una tabla de resultados y sus citas.
//
export type TableView = { evidence_id: string; columns: TableColumnView[]; citations: string[] };

//
// Presentación de un gráfico: citas y títulos de ejes y leyenda.
//
export type ChartView = { operation_id: string; citations: string[]; x_title: string | null; y_title: string | null; legend_title: string | null; reference_lines: ChartReferenceLine[] };

//
// Línea de referencia documentada de un gráfico, sobre el eje indicado.
//
export type ChartReferenceLine = { axis: "x" | "y"; value: number; label: string; citations: string[] };

//
// Datos de presentación de un mensaje: segmentos, citas, tablas, gráficos y duración.
//
export type MessagePresentation = {
  segments: AnswerSegment[];
  citations: Citation[];
  tables: TableView[];
  charts: ChartView[];
  trailing_tables: string[];
  trailing_charts: string[];
  duration_ms: number | null;
};

//
// Mensaje de una conversación tal como lo devuelve el backend.
//
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
  lease_expired?: boolean;
};

//
// Respuesta paginada de los mensajes de una conversación.
//
export type MessagePage = { conversation_id: string; items: Message[]; total: number; page: number; page_size: number };

//
// Mensaje del usuario mostrado localmente antes de que el backend lo confirme.
//
export type OptimisticMessage = { id: string; role: "user"; content: string; optimistic: true };
export type ChatMessage = Message | OptimisticMessage;

//
// Etapa real del análisis que el backend informa mientras responde un turno.
//
export type TurnStage = "interpreting" | "retrieving" | "referencing" | "planning" | "analyzing" | "validating" | "documents" | "writing";

//
// Evento inicial de un turno transmitido: mensajes reservados y momento en que empezó.
//
export type TurnStartedEvent = { conversation_id: string; user_message_id: string; assistant_message_id: string; started_at: string };

//
// Evento de una etapa del análisis que comienza, con el tiempo transcurrido desde el inicio del turno.
//
export type TurnStageEvent = { stage: TurnStage; elapsed_ms: number };

//
// Evento final de un turno: su resultado y el mensaje guardado del asistente, salvo si se canceló.
//
export type TurnDoneEvent = {
  outcome: "completed" | "generation_failed" | "execution_failed" | "timed_out" | "cancelled";
  message: Message | null;
};

//
// Evento de un turno que no pudo cerrarse, con el código HTTP equivalente y su detalle.
//
export type TurnErrorEvent = { status: number; detail: string };

//
// Turno que se sigue en vivo: quién lo sigue, su mensaje, las etapas recibidas, si se pidió cancelarlo
// y si se retomó una respuesta que ya estaba en curso.
//
export type LiveTurn = { owner: string; messageId: string | null; stages: TurnStage[]; startedAt: number; cancelling: boolean; resumed?: boolean };

//
// Referencia a una columna de un conjunto de datos.
//
export type ColumnReference = { kind: "column"; dataset_id: string; column: string };

//
// Campo de salida de una tabla con su tipo, unidad y columnas de origen.
//
export type OutputField = {
  name: string;
  sql_type: string;
  numeric_eligible: boolean;
  unit: string | null;
  unit_status: "documented" | "unknown" | "dimensionless";
  sources: ColumnReference[];
};

//
// Resumen de valores excluidos de un resultado, por grupo y política.
//
export type ValueExclusion = {
  output_name: string;
  group: JsonObject;
  input_rows: number;
  valid_rows: number;
  null_rows: number;
  zero_divisions: number;
  policy: "exclude" | "preserve";
};

//
// Tabla de resultados guardada con sus columnas, filas y estado de almacenamiento.
//
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

//
// Procedencia de un conjunto de datos: archivo, tipo, hash y estado de procesamiento.
//
export type DatasetProvenance = {
  source_name: string;
  original_filename: string;
  file_type: string;
  content_hash: string;
  source_locator: JsonObject;
  processing_status: string;
  semantic_index_status: string;
};

//
// Referencia a una fuente y conjunto de datos usados en una respuesta.
//
export type SourceReference = {
  source_id: string;
  dataset_id: string;
  dataset_name: string;
  version: number;
  provenance: DatasetProvenance;
};

//
// Referencia a una operación de análisis ejecutada para una respuesta.
//
export type OperationReference = {
  evidence_id: string;
  operation_id: string;
  tool: "sql" | "python";
  dataset_ids: string[];
  input_operation_ids: string[];
};

//
// Figura de Plotly con sus datos, diseño y configuración.
//
export type PlotlyFigure = {
  renderer: "plotly";
  renderer_version: string;
  plotly_js_version: string;
  data: JsonObject[];
  layout: JsonObject;
  config: JsonObject;
};

//
// Visualización generada con sus ejes, series, advertencias y figura.
//
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

//
// Error de ejecución con su código y mensaje.
//
export type ExecutionError = { code: string; message: string };

//
// Respuesta del asistente guardada, con resultados, fuentes, advertencias y tiempos.
//
export type StoredResponse = {
  response_type?: "analytical" | "general" | "catalog" | "clarification" | "historical" | "document";
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
    route: "general" | "catalog" | "data" | "document" | "historical" | "needs_clarification" | "failed";
    context_used: boolean;
    question_contextualized: boolean;
    history_message_ids: string[];
    model: string;
    input_tokens: number | null;
    output_tokens: number | null;
    duration_ms: number;
  } | null;
};

//
// Instantánea guardada de una respuesta del asistente con sus operaciones y avisos.
//
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
