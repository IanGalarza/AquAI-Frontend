import type { ChatMessage, Message } from "@/types/conversations";
import { assistantSnapshot, formatDuration, generationActive, generationLeaseExpired } from "@/utils/conversations";
import { AquaiAvatar } from "./aquai-brand";
import { ChatResponse } from "./chat-response";
import { ChatIcon } from "./chat-icon";

const GENERATING = "Analizando los datos… La consulta puede tardar varios minutos.";

type ChatMessagesProps = {
  messages: ChatMessage[];
  processing: boolean;
  checking: boolean;
};

//
// Muestra un aviso de estado con puntos animados mientras se genera una respuesta.
//
function GenerationStatus({ children }: { children: string }) {
  return <p role="status" className="flex items-center gap-2.5 text-[15px] text-foreground-secondary">
    <span className="flex gap-1" aria-hidden="true">{[0, 1, 2].map((dot) => <span key={dot} className="size-1.5 animate-pulse rounded-full bg-primary/70" style={{ animationDelay: `${dot * 180}ms` }} />)}</span>
    {children}
  </p>;
}

//
// Muestra la cabecera de un mensaje del asistente con duración y etiquetas de estado.
//
function AssistantHeader({ message }: { message?: Message }) {
  const snapshot = message && assistantSnapshot(message);
  const milliseconds = message?.presentation?.duration_ms;
  const duration = milliseconds == null ? null : formatDuration(milliseconds);
  const failed = message && (["failed", "cancelled"].includes(message.status.name) || snapshot?.response.status === "failed");
  const partial = snapshot?.response.status === "partial";
  return <div className="mb-2 flex flex-wrap items-center gap-x-2.5 gap-y-1">
    <AquaiAvatar />
    <span className="text-sm font-semibold">AquAI</span>
    {duration && <span className="inline-flex items-center gap-1 text-xs text-foreground-secondary" title={`Respondió en ${duration}`}>
      <ChatIcon name="clock" className="size-3.5" /><span className="sr-only">Tiempo de respuesta: </span>{duration}
    </span>}
    {failed && <span className="inline-flex items-center gap-1 rounded-full border border-error/35 px-2 py-0.5 text-[11px] font-medium text-error">
      <ChatIcon name="alert-circle" className="size-3.5" />{message.status.name === "cancelled" ? "Cancelada" : "No completada"}
    </span>}
    {partial && <span className="inline-flex items-center gap-1 rounded-full border border-warning/35 px-2 py-0.5 text-[11px] font-medium text-warning">
      <ChatIcon name="alert-triangle" className="size-3.5" />Respuesta parcial
    </span>}
  </div>;
}

//
// Muestra el cuerpo de una respuesta: estado de generación, respuesta estructurada o texto plano.
//
function AssistantBody({ message }: { message: Message }) {
  if (generationActive(message)) {
    return <GenerationStatus>{generationLeaseExpired(message) ? "La generación sigue pendiente en el servidor. Comprobá el estado antes de continuar." : GENERATING}</GenerationStatus>;
  }
  const snapshot = assistantSnapshot(message);
  if (snapshot && message.presentation) return <ChatResponse snapshot={snapshot} presentation={message.presentation} />;
  return <>
    <p className="whitespace-pre-line text-[15px] leading-7 [overflow-wrap:anywhere]">{message.content}</p>
    {message.content_data.kind === "assistant_response" && !snapshot && <p className="mt-3 text-xs text-foreground-secondary">Esta respuesta tiene un formato anterior; se muestra su texto original.</p>}
  </>;
}

//
// Muestra la lista de mensajes de la conversación y el estado de procesamiento.
//
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
      <ol className="space-y-8">
        {messages.map((message) => {
          if (message.role === "user") {
            return <li key={message.id} data-user-message className="flex min-w-0 justify-end">
              <div className="max-w-[90%] rounded-2xl rounded-br-md border border-primary/20 bg-primary/10 px-4 py-3 text-[15px] leading-relaxed text-foreground sm:max-w-[78%] sm:px-5">
                <span className="sr-only">Vos: </span>
                <p className="whitespace-pre-wrap [overflow-wrap:anywhere]">{message.content}</p>
                {"optimistic" in message && <p className="mt-1.5 text-[10px] text-foreground-secondary">{checking ? "Sin confirmación de persistencia" : "Enviando · pendiente de confirmación"}</p>}
              </div>
            </li>;
          }
          if ("optimistic" in message) return null;
          return <li key={message.id} data-assistant-message className="min-w-0" data-generation-status={message.status.name}>
            <AssistantHeader message={message} />
            <div className="min-w-0 rounded-xl border border-border/60 bg-surface/95 px-4 py-4 text-foreground sm:px-5 sm:py-5">
              <AssistantBody message={message} />
            </div>
          </li>;
        })}
        {(processing || checking) && !hasActive && <li className="min-w-0">
          <AssistantHeader />
          <div className="rounded-xl border border-border/60 bg-surface/95 px-4 py-4 sm:px-5">
            <GenerationStatus>{checking ? "Comprobando el estado guardado; la pregunta no se reenviará automáticamente." : GENERATING}</GenerationStatus>
          </div>
        </li>}
      </ol>
    </section>
  );
}
