const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL?.trim().replace(/\/+$/, "");

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
// Envía una solicitud al backend y devuelve su JSON o lanza un ApiError.
//
export async function apiRequest<T>(path: string, options: RequestInit = {}, policy: RequestPolicy = {}): Promise<T> {
  if (!backendUrl) throw new ApiError(0, "Falta configurar NEXT_PUBLIC_BACKEND_URL en el frontend.");
  const timeout = AbortSignal.timeout(policy.timeoutMs ?? (options.method === "POST" ? 60_000 : 30_000));
  const signal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout;
  const response = await fetch(`${backendUrl}${path}`, { ...options, signal, cache: "no-store" });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = body && typeof body === "object" && "detail" in body ? body.detail : null;
    const explanation = typeof detail === "string" ? detail : Array.isArray(detail)
      ? detail.map((item: { msg?: string }) => item.msg).filter(Boolean).join(" ")
      : null;
    const fallback = policy.httpMessages?.[response.status] ?? httpMessages[response.status] ?? "No se pudo completar la solicitud.";
    throw new ApiError(response.status, response.status === 503 || !explanation || policy.appendDetail === false ? fallback : `${fallback} ${explanation}`, body);
  }
  if (response.status === 204) return undefined as T;
  if (body === null) throw new ApiError(502, "No pudimos leer la respuesta del servicio. Intentá nuevamente.");
  return body as T;
}
