//
// Evento completo de un flujo SSE: su nombre y sus datos.
//
export type ServerEvent = { event: string; data: string };

//
// Lee un flujo SSE y entrega cada evento completo; avisa cada fragmento recibido, incluidos
// los comentarios de mantenimiento, y cierra la conexión si la lectura termina por un error.
//
export async function readEventStream(body: ReadableStream<Uint8Array>, onEvent: (event: ServerEvent) => void, onActivity?: () => void): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let event = "";
  let data: string[] = [];
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) return;
      onActivity?.();
      const lines = (buffer + decoder.decode(value, { stream: true })).split("\n");
      buffer = lines.pop() ?? "";
      for (const raw of lines) {
        const line = raw.endsWith("\r") ? raw.slice(0, -1) : raw;
        if (!line) {
          if (data.length) onEvent({ event: event || "message", data: data.join("\n") });
          event = "";
          data = [];
        } else if (!line.startsWith(":")) {
          const separator = line.indexOf(":");
          const field = separator < 0 ? line : line.slice(0, separator);
          const content = separator < 0 ? "" : line.slice(separator + 1).replace(/^ /, "");
          if (field === "event") event = content;
          else if (field === "data") data.push(content);
        }
      }
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }
}
