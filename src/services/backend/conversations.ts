import { ApiError, apiEventStream, apiRequest, StreamInterruptedError } from "@/services/api";
import type { Conversation, ConversationPage, Language, MessagePage, TurnDoneEvent, TurnErrorEvent, TurnStageEvent, TurnStartedEvent } from "@/types/conversations";

const messages: Record<number, string> = {
  404: "La conversación no existe o ya no está disponible.",
  409: "Esta conversación ya tiene una respuesta en proceso. Consultá su estado antes de enviar otra pregunta.",
  422: "La pregunta o los parámetros no son válidos.",
  500: "No se pudo completar la ejecución. Revisá el mensaje guardado en el historial.",
  502: "No se pudo generar la respuesta. El turno permanece en el historial.",
  504: "Se agotó el tiempo de espera. Consultá el estado guardado antes de volver a enviar.",
  503: "El historial de conversaciones no está disponible. Intentá consultarlo nuevamente.",
};
const outcomeStatuses: Partial<Record<TurnDoneEvent["outcome"], number>> = { generation_failed: 502, execution_failed: 500, timed_out: 504 };
const policy = { httpMessages: messages, appendDetail: false };
const configuredTimeout = Number(process.env.NEXT_PUBLIC_CONVERSATION_TIMEOUT_MS);
const generationTimeoutMs = Number.isSafeInteger(configuredTimeout) && configuredTimeout >= 60_000 && configuredTimeout <= 3_660_000
  ? configuredTimeout : 1_620_000;

//
// Funciones que reciben el inicio y las etapas de un turno transmitido.
//
export type TurnListeners = { started?: (event: TurnStartedEvent) => void; stage?: (event: TurnStageEvent) => void };

export class TurnError extends ApiError {
  //
  // Crea el error de un turno que ya se había aceptado pero no pudo cerrarse, con su código HTTP equivalente.
  //
  constructor(status: number, message: string, body: TurnErrorEvent) {
    super(status, message, body);
    this.name = "TurnError";
  }
}

//
// Crea una conversación (POST /conversations).
//
export function createConversation(title?: string): Promise<Conversation> {
  return apiRequest("/conversations", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(title ? { title } : {}),
  }, policy);
}

//
// Renombra una conversación (PATCH /conversations/{id}).
//
export function renameConversation(id: string, title: string): Promise<Conversation> {
  return apiRequest(`/conversations/${encodeURIComponent(id)}`, {
    method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title }),
  }, { ...policy, httpMessages: { ...messages, 422: "El título debe tener entre 1 y 200 caracteres, sin saltos de línea." } });
}

//
// Elimina una conversación (DELETE /conversations/{id}).
//
export function deleteConversation(id: string): Promise<void> {
  return apiRequest(`/conversations/${encodeURIComponent(id)}`, { method: "DELETE" },
    { ...policy, httpMessages: { ...messages, 409: "No se puede eliminar mientras se genera una respuesta. Esperá a que finalice." } });
}

//
// Lista conversaciones paginadas (GET /conversations).
//
export function listConversations(page = 1, signal?: AbortSignal): Promise<ConversationPage> {
  return apiRequest(`/conversations?${new URLSearchParams({ page: String(page), page_size: "20" })}`, { signal }, policy);
}

//
// Obtiene una conversación (GET /conversations/{id}).
//
export function getConversation(id: string, signal?: AbortSignal): Promise<Conversation> {
  return apiRequest(`/conversations/${encodeURIComponent(id)}`, { signal }, policy);
}

//
// Lista los mensajes paginados de una conversación (GET /conversations/{id}/messages).
//
export function getMessages(id: string, page = 1, pageSize = 20, signal?: AbortSignal): Promise<MessagePage> {
  return apiRequest(`/conversations/${encodeURIComponent(id)}/messages?${new URLSearchParams({ page: String(page), page_size: String(pageSize) })}`, { signal }, policy);
}

//
// Envía una pregunta y sigue su turno por SSE (POST /conversations/{id}/messages/stream); devuelve el evento final.
//
export function streamMessage(id: string, content: string, listeners: TurnListeners, responseLanguage?: Language): Promise<TurnDoneEvent> {
  return followTurn(`/conversations/${encodeURIComponent(id)}/messages/stream`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content, ...(responseLanguage ? { response_language: responseLanguage } : {}) }),
  }, listeners, messages);
}

//
// Sigue por SSE una respuesta en curso desde su inicio (GET /conversations/{id}/messages/{messageId}/events).
//
export function followGeneration(id: string, messageId: string, listeners: TurnListeners, signal?: AbortSignal): Promise<TurnDoneEvent> {
  return followTurn(`/conversations/${encodeURIComponent(id)}/messages/${encodeURIComponent(messageId)}/events`, { signal }, listeners,
    { ...messages, 404: "La respuesta no se está generando en este servidor." });
}

//
// Cancela una respuesta en curso (POST /conversations/{id}/messages/{messageId}/cancel).
//
export function cancelGeneration(id: string, messageId: string): Promise<void> {
  return apiRequest(`/conversations/${encodeURIComponent(id)}/messages/${encodeURIComponent(messageId)}/cancel`, { method: "POST" },
    { ...policy, httpMessages: { ...messages, 404: "La respuesta ya había terminado de generarse." } });
}

//
// Devuelve el aviso de un turno que terminó sin respuesta completa, o null si no corresponde.
//
export function outcomeNotice(outcome: TurnDoneEvent["outcome"]): string | null {
  const status = outcomeStatuses[outcome];
  return status ? messages[status] : null;
}

//
// Lee los eventos de un turno, avisa su inicio y sus etapas, y devuelve el evento final; el error de un turno
// llega como TurnError y un flujo cortado antes del final, como StreamInterruptedError.
//
async function followTurn(path: string, init: RequestInit, listeners: TurnListeners, httpMessages: Record<number, string>): Promise<TurnDoneEvent> {
  let done = null as TurnDoneEvent | null;
  await apiEventStream(path, init, { ...policy, httpMessages, timeoutMs: generationTimeoutMs }, ({ event, data }) => {
    if (event === "turn") listeners.started?.(JSON.parse(data));
    else if (event === "stage") listeners.stage?.(JSON.parse(data));
    else if (event === "done") done = JSON.parse(data);
    else if (event === "error") {
      const failure: TurnErrorEvent = JSON.parse(data);
      throw new TurnError(failure.status, messages[failure.status] ?? messages[500], failure);
    }
  });
  if (!done) throw new StreamInterruptedError();
  return done;
}
