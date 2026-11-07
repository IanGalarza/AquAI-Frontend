import { useState } from "react";
import type { ChatMessage, LiveTurn, Message } from "@/types/conversations";
import { assistantSnapshot, formatDuration, generationActive, generationLeaseExpired, interruptionRecorded } from "@/utils/conversations";
import { AquaiAvatar } from "./aquai-brand";
import { ChatResponse } from "./chat-response";
import { ChatIcon } from "./chat-icon";
import { TurnProgress } from "./turn-progress";

const GENERATING = "Analizando los datos… La consulta puede tardar varios minutos.";
const CHECKING = "Comprobando si la consulta sigue en curso en el servidor…";
const INTERRUPTED = "La consulta se interrumpió antes de terminar, por ejemplo porque el servidor se reinició. La pregunta quedó guardada y podés volver a enviarla.";

type ChatMessagesProps = {
  messages: ChatMessage[];
  processing: boolean;
  checking: boolean;
  liveTurn: LiveTurn | null;
  revealing: Record<string, number>;
  onRevealed: (messageId: string) => void;
  detached: Record<string, true>;
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
function AssistantHeader({ message, interrupted = false }: { message?: Message; interrupted?: boolean }) {
  const snapshot = message && assistantSnapshot(message);
  const milliseconds = message?.presentation?.duration_ms;
  const duration = milliseconds == null ? null : formatDuration(milliseconds);
  const failed = interrupted || (message && (["failed", "cancelled"].includes(message.status.name) || snapshot?.response.status === "failed"));
  const partial = snapshot?.response.status === "partial";
  const failure = interrupted ? "Interrumpida" : message?.status.name === "cancelled" ? "Cancelada" : "No completada";
  return <div className="mb-2 flex flex-wrap items-center gap-x-2.5 gap-y-1">
    <AquaiAvatar />
    <span className="text-sm font-semibold">AquAI</span>
    {duration && <span className="inline-flex items-center gap-1 text-xs text-foreground-secondary" title={`Respondió en ${duration}`}>
      <ChatIcon name="clock" className="size-3.5" /><span className="sr-only">Tiempo de respuesta: </span>{duration}
    </span>}
    {failed && <span className="inline-flex items-center gap-1 rounded-full border border-error/35 px-2 py-0.5 text-[11px] font-medium text-error">
      <ChatIcon name="alert-circle" className="size-3.5" />{failure}
    </span>}
    {partial && <span className="inline-flex items-center gap-1 rounded-full border border-warning/35 px-2 py-0.5 text-[11px] font-medium text-warning">
      <ChatIcon name="alert-triangle" className="size-3.5" />Respuesta parcial
    </span>}
  </div>;
}

//
// Muestra el cuerpo de una respuesta: etapas en vivo o estado de generación, aviso de interrupción,
// respuesta estructurada (escrita progresivamente si acaba de llegar) o texto plano.
//
function AssistantBody({ message, liveTurn, stale, detached, stagesOpen, onToggleStages, revealStartedAt, onRevealed }: {
  message: Message; liveTurn: LiveTurn | null; stale: boolean; detached: boolean; stagesOpen: boolean; onToggleStages: () => void;
  revealStartedAt?: number; onRevealed: (messageId: string) => void;
}) {
  if (generationActive(message)) {
    if (liveTurn && !stale && (liveTurn.messageId ?? message.id) === message.id) {
      return <TurnProgress turn={liveTurn} open={stagesOpen} onToggle={onToggleStages} />;
    }
    if (stale) return <p className="text-[15px] leading-7 [overflow-wrap:anywhere]">{INTERRUPTED}</p>;
    return <GenerationStatus>{detached ? CHECKING : GENERATING}</GenerationStatus>;
  }
  const snapshot = assistantSnapshot(message);
  if (snapshot && message.presentation) {
    return <ChatResponse snapshot={snapshot} presentation={message.presentation} revealStartedAt={revealStartedAt} onRevealed={() => onRevealed(message.id)} />;
  }
  return <>
    <p className="whitespace-pre-line text-[15px] leading-7 [overflow-wrap:anywhere]">{message.content}</p>
    {message.content_data.kind === "assistant_response" && !snapshot && <p className="mt-3 text-xs text-foreground-secondary">Esta respuesta tiene un formato anterior; se muestra su texto original.</p>}
  </>;
}

//
// Muestra la lista de mensajes de la conversación y el estado de procesamiento.
//
export function ChatMessages({ messages, processing, checking, liveTurn, revealing, onRevealed, detached }: ChatMessagesProps) {
  const [openStages, setOpenStages] = useState<string | null>(null);
  const stale = (message: ChatMessage) => generationLeaseExpired(message) && liveTurn?.messageId !== message.id;
  const hasActive = messages.some((message) => generationActive(message) && !stale(message));
  const stagesOpen = !!liveTurn && openStages === liveTurn.owner;
  const toggleStages = () => setOpenStages(stagesOpen ? null : liveTurn?.owner ?? null);
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
          const revealStartedAt = revealing[message.id];
          const interrupted = stale(message);
          return <li key={message.id} data-assistant-message className="min-w-0" data-generation-status={interrupted ? "interrupted" : message.status.name}>
            <AssistantHeader message={message} interrupted={interrupted || interruptionRecorded(message)} />
            <div className="min-w-0 rounded-xl border border-border/60 bg-surface/95 px-4 py-4 text-foreground sm:px-5 sm:py-5">
              <AssistantBody message={message} liveTurn={liveTurn} stale={interrupted} detached={!!detached[message.id]}
                stagesOpen={stagesOpen} onToggleStages={toggleStages} revealStartedAt={revealStartedAt} onRevealed={onRevealed} />
            </div>
          </li>;
        })}
        {(processing || checking) && !hasActive && <li className="min-w-0">
          <AssistantHeader />
          <div className="rounded-xl border border-border/60 bg-surface/95 px-4 py-4 sm:px-5 sm:py-5">
            {checking ? <GenerationStatus>Comprobando el estado guardado; la pregunta no se reenviará automáticamente.</GenerationStatus> :
              <TurnProgress turn={liveTurn} open={stagesOpen} onToggle={toggleStages} />}
          </div>
        </li>}
      </ol>
    </section>
  );
}
