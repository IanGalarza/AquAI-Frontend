const backendUrl = (process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000").replace(/\/+$/, "");

const httpMessages: Record<number, string> = {
  400: "El archivo o la solicitud no son válidos.",
  404: "La fuente ya no está disponible.",
  409: "El estado de la fuente no permite esta operación. Actualizá la vista.",
  413: "El archivo supera el tamaño máximo permitido.",
  422: "No pudimos validar el archivo o la solicitud.",
  503: "Las fuentes no se encuentran disponibles debido a un error. Intentá nuevamente en unos instantes.",
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
    return "La operación tardó demasiado. Si estabas subiendo un archivo, revisá el listado antes de volver a intentarlo.";
  }
  return "No pudimos conectarnos con el servicio de fuentes. Intentá nuevamente en unos instantes.";
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
    throw new ApiError(response.status, response.status === 503 || !explanation ? fallback : `${fallback} ${explanation}`);
  }
  if (body === null) throw new ApiError(502, "No pudimos leer la respuesta del servicio. Intentá nuevamente.");
  return body as T;
}
