import type { ChatMessage } from "@/types/conversations";
import { assistantSnapshot, generationActive, generationLeaseExpired } from "@/utils/conversations";
import { ChatResponse } from "./chat-response";
import { ChatIcon } from "./chat-icon";

type ChatMessagesProps = {
  messages: ChatMessage[];
  processing: boolean;
  checking: boolean;
};

export function ChatMessages({ messages, processing, checking }: ChatMessagesProps) {
  const hasActive = messages.some(generationActive);
  return (
    <section
      role="log"
      aria-label="Mensajes de la conversación"
      aria-live="polite"
      aria-relevant="additions"
      className="mx-auto w-full max-w-[920px] px-4 py-6 sm:px-8 sm:py-9 lg:px-10"
    >
      <ol className="space-y-6">
        {messages.map((message) => {
          const user = message.role === "user";
          const snapshot = !("optimistic" in message) && !user ? assistantSnapshot(message) : null;
          const failed = !("optimistic" in message) && ["failed", "cancelled"].includes(message.status.name);
          return <li key={message.id} data-user-message={user || undefined} data-assistant-message={!user || undefined} className={`flex min-w-0 ${user ? "justify-end" : "justify-start"}`}>
            <div className={user ? "max-w-[90%] rounded-md border border-primary/20 bg-primary/10 px-4 py-3 text-sm leading-relaxed text-foreground sm:max-w-[78%] sm:px-5 sm:text-[15px]" : "min-w-0 w-full rounded-md border border-border/70 bg-surface/95 px-4 py-4 text-foreground sm:px-5 sm:py-5"}>
              {!user && <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-primary"><ChatIcon name="message" className="size-4" />AquAI</div>}
              <span className="sr-only">{user ? "Vos: " : "AquAI: "}</span>
              {failed && <p className="mb-3 flex items-center gap-2 text-xs font-medium text-error"><ChatIcon name="alert-circle" className="size-4" />{!("optimistic" in message) && message.status.name === "cancelled" ? "Generación cancelada" : "Generación fallida"}</p>}
              {generationActive(message) ? <p role="status" className="flex items-center gap-2 text-sm text-foreground-secondary"><span className="size-3 shrink-0 animate-pulse rounded-full bg-primary/60" />{generationLeaseExpired(message) ? "La generación sigue pendiente en el servidor. Comprobá el estado antes de continuar." : "Generando respuesta… La consulta puede tardar varios minutos."}</p> :
                snapshot && !("optimistic" in message) ? <ChatResponse message={message} snapshot={snapshot} /> : <p className="whitespace-pre-wrap text-sm leading-relaxed [overflow-wrap:anywhere] sm:text-[15px]">{message.content}</p>}
              {"optimistic" in message && <p className="mt-1.5 text-[10px] text-foreground-secondary">{checking ? "Sin confirmación de persistencia" : "Enviando · pendiente de confirmación"}</p>}
              {!("optimistic" in message) && !snapshot && message.sources.length > 0 && <details className="mt-3 text-xs text-foreground-secondary"><summary className="cursor-pointer">Referencias conservadas ({message.sources.length})</summary><ul className="mt-2 space-y-1">{message.sources.map((source) => <li key={source.id}>{String(source.details.dataset_name ?? source.dataset_id ?? source.source_id)}{source.details.dataset_version ? ` · v${source.details.dataset_version}` : ""}</li>)}</ul></details>}
              {!("optimistic" in message) && message.content_data.kind === "assistant_response" && !snapshot && <p className="mt-3 text-xs text-warning">El contenido estructurado de esta versión no se puede mostrar. Se conserva el texto original.</p>}
            </div>
          </li>;
        })}
        {(processing || checking) && !hasActive && <li role="status" className="flex items-center gap-2 text-sm text-foreground-secondary"><span className="size-3 animate-pulse rounded-full bg-primary/60" />{checking ? "Comprobando el estado guardado; la pregunta no se reenviará automáticamente." : "Generando respuesta… La consulta puede tardar varios minutos."}</li>}
      </ol>
    </section>
  );
}
