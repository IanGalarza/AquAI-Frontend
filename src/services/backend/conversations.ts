import { apiRequest } from "@/services/api";
import type { Conversation, ConversationPage, Language, Message, MessagePage } from "@/types/conversations";

const messages = {
  404: "La conversación no existe o ya no está disponible.",
  409: "Esta conversación ya tiene una respuesta en proceso. Consultá su estado antes de enviar otra pregunta.",
  422: "La pregunta o los parámetros no son válidos.",
  500: "No se pudo completar la ejecución. Revisá el mensaje guardado en el historial.",
  502: "No se pudo generar la respuesta. El turno permanece en el historial.",
  504: "Se agotó el tiempo de espera. Consultá el estado guardado antes de volver a enviar.",
  503: "El historial de conversaciones no está disponible. Intentá consultarlo nuevamente.",
};
const policy = { httpMessages: messages, appendDetail: false };
const configuredTimeout = Number(process.env.NEXT_PUBLIC_CONVERSATION_TIMEOUT_MS);
const generationTimeoutMs = Number.isSafeInteger(configuredTimeout) && configuredTimeout >= 60_000 && configuredTimeout <= 3_660_000
  ? configuredTimeout : 1_620_000;

export function createConversation(title?: string): Promise<Conversation> {
  return apiRequest("/conversations", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(title ? { title } : {}),
  }, policy);
}

export function renameConversation(id: string, title: string): Promise<Conversation> {
  return apiRequest(`/conversations/${encodeURIComponent(id)}`, {
    method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title }),
  }, { ...policy, httpMessages: { ...messages, 422: "El título debe tener entre 1 y 200 caracteres, sin saltos de línea." } });
}

export function deleteConversation(id: string): Promise<void> {
  return apiRequest(`/conversations/${encodeURIComponent(id)}`, { method: "DELETE" },
    { ...policy, httpMessages: { ...messages, 409: "No se puede eliminar mientras se genera una respuesta. Esperá a que finalice." } });
}

export function listConversations(page = 1, signal?: AbortSignal): Promise<ConversationPage> {
  return apiRequest(`/conversations?${new URLSearchParams({ page: String(page), page_size: "20" })}`, { signal }, policy);
}

export function getConversation(id: string, signal?: AbortSignal): Promise<Conversation> {
  return apiRequest(`/conversations/${encodeURIComponent(id)}`, { signal }, policy);
}

export function getMessages(id: string, page = 1, pageSize = 20, signal?: AbortSignal): Promise<MessagePage> {
  return apiRequest(`/conversations/${encodeURIComponent(id)}/messages?${new URLSearchParams({ page: String(page), page_size: String(pageSize) })}`, { signal }, policy);
}

export function sendMessage(id: string, content: string, responseLanguage?: Language): Promise<Message> {
  return apiRequest(`/conversations/${encodeURIComponent(id)}/messages`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content, ...(responseLanguage ? { response_language: responseLanguage } : {}) }),
  }, { ...policy, timeoutMs: generationTimeoutMs });
}
