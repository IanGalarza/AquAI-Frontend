const backendUrl = (process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000").replace(/\/+$/, "");

const httpMessages: Record<number, string> = {
  400: "El archivo o la solicitud no son válidos.",
  404: "La fuente ya no está disponible.",
  409: "El estado de la fuente no permite esta operación. Actualizá la vista.",
  413: "El archivo supera el tamaño máximo permitido por el backend.",
  422: "El backend no pudo validar el archivo o la solicitud.",
  503: "La persistencia o el procesamiento no están disponibles. Intentá nuevamente en unos instantes.",
};

export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

export function isTransientError(error: unknown): boolean {
  return !(error instanceof ApiError) || error.status >= 500 || error.status === 429;
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error && error.name === "TimeoutError") {
    return "La solicitud tardó demasiado. Podés volver a intentarlo; si estabas subiendo un archivo, el backend podría haberlo recibido.";
  }
  return "No se pudo conectar con el backend. Verificá que esté disponible y que la URL y CORS estén configurados.";
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const timeout = AbortSignal.timeout(options.method === "POST" ? 60_000 : 30_000);
  const signal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout;
  const response = await fetch(`${backendUrl}${path}`, { ...options, signal, cache: "no-store" });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = body && typeof body === "object" && "detail" in body ? body.detail : null;
    const explanation = typeof detail === "string" ? detail : Array.isArray(detail)
      ? detail.map((item: { msg?: string }) => item.msg).filter(Boolean).join(" ")
      : null;
    const fallback = httpMessages[response.status] || "No se pudo completar la solicitud.";
    throw new ApiError(response.status, explanation ? `${fallback} ${explanation}` : fallback);
  }
  if (body === null) throw new ApiError(502, "El backend devolvió una respuesta vacía o ilegible. Intentá nuevamente.");
  return body as T;
}
