import type { AssistantSnapshot, ChatMessage, Conversation, JsonValue, Language, Message, OutputField, TimeGrain } from "@/types/conversations";
import { ApiError } from "@/services/api";
import { formatScientificNumber } from "@/utils/scientific";

//
// Devuelve la instantánea estructurada de un mensaje del asistente, o null si no es válida.
//
export function assistantSnapshot(message: Message): AssistantSnapshot | null {
  const data = message.content_data;
  if (data.schema_version !== 1 || data.kind !== "assistant_response" || !data.response || typeof data.response !== "object" || Array.isArray(data.response)) return null;
  const response = data.response;
  const statuses = [
    "validated", "partial", "needs_clarification",
    "insufficient_coverage", "failed", "answered",
  ];
  if (typeof response.answer !== "string" || !statuses.includes(String(response.status))) return null;
  if (!["sources", "operation_references", "results", "warnings", "limitations", "visualizations", "errors", "validation_issues", "missing_information", "pending_operations"].every((key) => Array.isArray(response[key]))) return null;
  if (!response.generation || typeof response.generation !== "object" || Array.isArray(response.generation)) return null;
  if (!Array.isArray(data.storage_warnings) || !Array.isArray(data.omitted_visualizations)) return null;
  return data as unknown as AssistantSnapshot;
}

//
// Indica si el mensaje del asistente sigue generándose.
//
export function generationActive(message: ChatMessage): boolean {
  return !("optimistic" in message) && message.role === "assistant" && ["pending", "processing"].includes(message.status.name);
}

//
// Indica si el backend registró la respuesta como interrumpida, por ejemplo por un reinicio del servidor.
//
export function interruptionRecorded(message: ChatMessage): boolean {
  if ("optimistic" in message || message.status.name !== "failed") return false;
  const error = message.content_data.error;
  return !!error && typeof error === "object" && !Array.isArray(error) && error.code === "interrupted_generation";
}

//
// Indica si una generación aún pendiente tenía la reserva vencida cuando el servidor la leyó: el servidor
// lo decide con su propio reloj, así que una copia local vieja o un reloj desfasado no la dan por muerta.
//
export function generationLeaseExpired(message: ChatMessage): boolean {
  return generationActive(message) && !("optimistic" in message) && message.lease_expired === true;
}

//
// Combina mensajes recibidos con los actuales y los ordena por secuencia.
//
export function mergeMessages(current: ChatMessage[], incoming: Message[], pending?: { content: string; baseline: number }): ChatMessage[] {
  const confirmed = pending && incoming.some((item) => item.role === "user" && item.sequence_number > pending.baseline && item.content === pending.content);
  const messages = new Map(current.filter((item) => !(confirmed && "optimistic" in item)).map((item) => [item.id, item]));
  for (const item of incoming) {
    const previous = messages.get(item.id);
    if (previous && !("optimistic" in previous)) {
      const difference = Date.parse(previous.updated_at ?? previous.created_at) - Date.parse(item.updated_at ?? item.created_at);
      const unchanged = difference === 0 && previous.status.name === item.status.name && previous.lease_expired === item.lease_expired;
      if (difference > 0 || unchanged || (!generationActive(previous) && generationActive(item))) continue;
    }
    messages.set(item.id, item);
  }
  return [...messages.values()].sort((a, b) => {
    if ("optimistic" in a) return "optimistic" in b ? 0 : 1;
    if ("optimistic" in b) return -1;
    return a.sequence_number - b.sequence_number;
  });
}

//
// Combina conversaciones recibidas con las actuales y las ordena por actividad reciente.
//
export function mergeConversations(current: Conversation[], incoming: Conversation[]): Conversation[] {
  const items = new Map(current.map((item) => [item.id, item]));
  for (const item of incoming) {
    const previous = items.get(item.id);
    if (!previous || Date.parse(item.updated_at ?? item.created_at) >= Date.parse(previous.updated_at ?? previous.created_at)) items.set(item.id, item);
  }
  return [...items.values()].sort((a, b) => {
    const difference = Date.parse(b.last_message_at ?? b.created_at) - Date.parse(a.last_message_at ?? a.created_at);
    return difference || b.id.localeCompare(a.id);
  });
}

//
// Devuelve el mensaje de error legible para un fallo de conversaciones.
//
export function conversationError(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error && ["AbortError", "TimeoutError", "StreamInterruptedError"].includes(error.name)) {
    return "La espera se interrumpió. Vamos a consultar el historial antes de habilitar otro envío; la pregunta no se reenviará automáticamente.";
  }
  return "No pudimos comunicarnos con el servicio de conversaciones. Comprobá el estado antes de volver a enviar.";
}

const isoDate = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?/;

//
// Formatea un valor de celda para mostrarlo según su tipo, idioma y granularidad temporal.
//
export function displayValue(value: JsonValue | undefined, field?: OutputField, language: Language = "es", grain: TimeGrain | null = null): string {
  if (value === null || value === undefined) return "Sin dato";
  if (typeof value === "boolean") return value ? "Sí" : "No";
  if (field && ["NUMERIC", "BIGINT"].includes(field.sql_type) && (typeof value === "string" || typeof value === "number")) {
    return formatScientificNumber(value, language);
  }
  const date = field && ["DATE", "TIMESTAMP"].includes(field.sql_type) && typeof value === "string" ? isoDate.exec(value) : null;
  if (date && grain && grain !== "day") {
    const [, year, month] = date;
    return grain === "year" ? year : language === "es" ? `${month}/${year}` : `${year}-${month}`;
  }
  if (date && language === "es") {
    const [, year, month, day, hour, minute] = date;
    return `${day}/${month}/${year}${hour && `${hour}:${minute}` !== "00:00" ? ` ${hour}:${minute}` : ""}`;
  }
  return typeof value === "object" ? JSON.stringify(value) : String(value);
}

//
// Formatea una duración en milisegundos como texto legible.
//
export function formatDuration(milliseconds: number): string | null {
  if (!Number.isFinite(milliseconds) || milliseconds < 0) return null;
  const tenths = Math.round(milliseconds / 100);
  if (tenths < 100) return tenths < 1 ? "<0,1 s" : `${(tenths / 10).toFixed(1).replace(".", ",")} s`;
  const seconds = Math.round(milliseconds / 1000);
  if (seconds < 60) return `${seconds} s`;
  const parts = [[Math.floor(seconds / 3600), "h"], [Math.floor((seconds % 3600) / 60), "min"], [seconds % 60, "s"]] as const;
  return parts.filter(([value]) => value > 0).map(([value, unit]) => `${value} ${unit}`).join(" ");
}
