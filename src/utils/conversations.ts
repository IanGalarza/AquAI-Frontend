import type { AssistantSnapshot, ChatMessage, Conversation, JsonValue, Message } from "@/types/conversations";
import { ApiError } from "@/services/api";

export function isMessage(value: unknown): value is Message {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<Message>;
  return typeof item.id === "string" && typeof item.conversation_id === "string" &&
    typeof item.sequence_number === "number" && typeof item.role === "string" &&
    typeof item.content === "string" && !!item.content_data && typeof item.content_data === "object" &&
    typeof item.status?.name === "string" && Array.isArray(item.sources);
}

// Las versiones desconocidas conservan su texto; no se reinterpretan como figuras/tablas actuales.
export function assistantSnapshot(message: Message): AssistantSnapshot | null {
  const data = message.content_data;
  if (data.schema_version !== 1 || data.kind !== "assistant_response" || !data.response || typeof data.response !== "object" || Array.isArray(data.response)) return null;
  const response = data.response;
  if (typeof response.answer !== "string" || !["validated", "partial", "needs_clarification", "insufficient_coverage", "failed"].includes(String(response.status))) return null;
  if (!["sources", "operation_references", "results", "warnings", "limitations", "visualizations", "errors", "validation_issues", "missing_information", "pending_operations"].every((key) => Array.isArray(response[key]))) return null;
  if (!response.generation || typeof response.generation !== "object" || Array.isArray(response.generation)) return null;
  if (!Array.isArray(data.storage_warnings) || !Array.isArray(data.omitted_visualizations)) return null;
  return data as unknown as AssistantSnapshot;
}

export function generationActive(message: ChatMessage): boolean {
  return !("optimistic" in message) && message.role === "assistant" && ["pending", "processing"].includes(message.status.name);
}

export function generationLeaseExpired(message: ChatMessage): boolean {
  if (!generationActive(message) || "optimistic" in message) return false;
  const lease = message.content_data.lease_expires_at;
  return typeof lease === "string" && Number.isFinite(Date.parse(lease)) && Date.parse(lease) < Date.now();
}

export function mergeMessages(current: ChatMessage[], incoming: Message[], pending?: { content: string; baseline: number }): ChatMessage[] {
  const confirmed = pending && incoming.some((item) => item.role === "user" && item.sequence_number > pending.baseline && item.content === pending.content);
  const messages = new Map(current.filter((item) => !(confirmed && "optimistic" in item)).map((item) => [item.id, item]));
  for (const item of incoming) {
    const previous = messages.get(item.id);
    if (previous && !("optimistic" in previous)) {
      const newer = Date.parse(previous.updated_at ?? previous.created_at) > Date.parse(item.updated_at ?? item.created_at);
      if (newer || (!generationActive(previous) && generationActive(item))) continue;
    }
    messages.set(item.id, item);
  }
  return [...messages.values()].sort((a, b) => {
    if ("optimistic" in a) return "optimistic" in b ? 0 : 1;
    if ("optimistic" in b) return -1;
    return a.sequence_number - b.sequence_number;
  });
}

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

export function conversationError(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error && ["AbortError", "TimeoutError"].includes(error.name)) {
    return "La espera se interrumpió. Vamos a consultar el historial antes de habilitar otro envío; la pregunta no se reenviará automáticamente.";
  }
  return "No pudimos comunicarnos con el servicio de conversaciones. Comprobá el estado antes de volver a enviar.";
}

export function displayValue(value: JsonValue | undefined): string {
  if (value === null || value === undefined) return "Sin dato";
  if (typeof value === "boolean") return value ? "Sí" : "No";
  return typeof value === "object" ? JSON.stringify(value) : String(value);
}
