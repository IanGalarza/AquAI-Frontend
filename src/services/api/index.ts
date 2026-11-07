import { readEventStream, type ServerEvent } from "../../utils/event-stream";

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL?.trim().replace(/\/+$/, "");
const missingBackend = "Falta configurar NEXT_PUBLIC_BACKEND_URL en el frontend.";
const unreadable = "No pudimos leer la respuesta del servicio. Intentá nuevamente.";
const STREAM_IDLE_MS = 45_000;

const httpMessages: Record<number, string> = {
  400: "El archivo o la solicitud no son válidos.",
  404: "La fuente ya no está disponible.",
  409: "El estado de la fuente no permite esta operación. Actualizá la vista.",
  413: "El archivo supera el tamaño máximo permitido.",
  422: "No pudimos validar el archivo o la solicitud.",
  503: "Las fuentes no se encuentran disponibles debido a un error. Intentá nuevamente en unos instantes.",
};

export class ApiError extends Error {
  //
  // Crea un error de la API con su estado HTTP, mensaje y cuerpo de respuesta.
  //
  constructor(public readonly status: number, message: string, public readonly body: unknown = null) {
    super(message);
    this.name = "ApiError";
  }
}

export class StreamInterruptedError extends Error {
  //
  // Crea el error de un flujo de eventos que se cortó antes de su evento final.
  //
  constructor() {
    super("El flujo de eventos terminó antes de su evento final.");
    this.name = "StreamInterruptedError";
  }
}

//
// Indica si un error es transitorio y conviene reintentar la solicitud.
//
export function isTransientError(error: unknown): boolean {
  return !(error instanceof ApiError) || error.status >= 500 || error.status === 429;
}

//
// Devuelve un mensaje legible para el usuario a partir de un error.
//
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error && error.name === "TimeoutError") {
    return "La operación tardó demasiado. Si estabas subiendo un archivo, revisá el listado antes de volver a intentarlo.";
  }
  return "No pudimos conectarnos con el servicio de fuentes. Intentá nuevamente en unos instantes.";
}

type RequestPolicy = {
  timeoutMs?: number;
  httpMessages?: Record<number, string>;
  appendDetail?: boolean;
};

//
// Crea el ApiError de una respuesta rechazada con el mensaje de la política y, si corresponde, el detalle.
//
function requestError(status: number, body: unknown, policy: RequestPolicy): ApiError {
  const detail = body && typeof body === "object" && "detail" in body ? body.detail : null;
  const explanation = typeof detail === "string" ? detail : Array.isArray(detail)
    ? detail.map((item: { msg?: string }) => item.msg).filter(Boolean).join(" ")
    : null;
  const fallback = policy.httpMessages?.[status] ?? httpMessages[status] ?? "No se pudo completar la solicitud.";
  return new ApiError(status, status === 503 || !explanation || policy.appendDetail === false ? fallback : `${fallback} ${explanation}`, body);
}

//
// Envía una solicitud al backend y devuelve su JSON o lanza un ApiError.
//
export async function apiRequest<T>(path: string, options: RequestInit = {}, policy: RequestPolicy = {}): Promise<T> {
  if (!backendUrl) throw new ApiError(0, missingBackend);
  const timeout = AbortSignal.timeout(policy.timeoutMs ?? (options.method === "POST" ? 60_000 : 30_000));
  const signal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout;
  const response = await fetch(`${backendUrl}${path}`, { ...options, signal, cache: "no-store" });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) throw requestError(response.status, body, policy);
  if (response.status === 204) return undefined as T;
  if (body === null) throw new ApiError(502, unreadable);
  return body as T;
}

//
// Abre un flujo SSE del backend y entrega sus eventos; lanza un ApiError si se rechaza la solicitud
// y corta la espera si deja de llegar actividad, incluidos los avisos de mantenimiento del servidor.
//
export async function apiEventStream(path: string, options: RequestInit, policy: RequestPolicy, onEvent: (event: ServerEvent) => void): Promise<void> {
  if (!backendUrl) throw new ApiError(0, missingBackend);
  const idle = new AbortController();
  const signals = [idle.signal, AbortSignal.timeout(policy.timeoutMs ?? 60_000), ...(options.signal ? [options.signal] : [])];
  const headers = new Headers(options.headers);
  headers.set("Accept", "text/event-stream");
  const response = await fetch(`${backendUrl}${path}`, { ...options, headers, signal: AbortSignal.any(signals), cache: "no-store" });
  if (!response.ok) throw requestError(response.status, await response.json().catch(() => null), policy);
  if (!response.body) throw new ApiError(502, unreadable);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const touch = () => {
    clearTimeout(timer);
    timer = setTimeout(() => idle.abort(new DOMException("El servicio dejó de enviar actividad.", "TimeoutError")), STREAM_IDLE_MS);
  };
  touch();
  try {
    await readEventStream(response.body, onEvent, touch);
  } finally {
    clearTimeout(timer);
  }
}
