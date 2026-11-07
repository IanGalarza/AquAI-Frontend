"use client";

import { useEffect, useId, useState } from "react";
import type { LiveTurn, TurnStage } from "@/types/conversations";
import { ChatIcon } from "./chat-icon";

const STAGE_LABELS: Record<TurnStage, string> = {
  interpreting: "Interpretando la consulta",
  retrieving: "Buscando fuentes relevantes",
  referencing: "Buscando el valor de referencia",
  planning: "Planificando el análisis",
  analyzing: "Analizando los datos",
  validating: "Validando los resultados",
  documents: "Buscando en los documentos",
  writing: "Generando la respuesta",
};

//
// Devuelve el instante actual, actualizado cada segundo.
//
function useNow(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

//
// Formatea el tiempo transcurrido del turno de forma compacta: segundos y, desde el minuto, minutos:segundos.
//
function elapsedText(milliseconds: number): string {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000));
  return seconds < 60 ? `${seconds} s` : `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

//
// Devuelve el texto de lo que está ocurriendo en el turno, sin etapas todavía o con una etapa desconocida.
//
function progressLabel(turn: LiveTurn | null, current: TurnStage | undefined): string {
  if (turn?.cancelling) return "Cancelando la respuesta";
  if (current) return STAGE_LABELS[current] ?? "Procesando la consulta";
  return turn?.resumed ? "Recuperando el progreso" : "Enviando la consulta";
}

//
// Muestra en una línea la etapa actual del turno y el tiempo transcurrido; la flecha despliega el historial
// de etapas completadas junto con la actual. Sin turno todavía, indica que la consulta se está enviando.
//
export function TurnProgress({ turn, open = false, onToggle }: { turn: LiveTurn | null; open?: boolean; onToggle?: () => void }) {
  const now = useNow();
  const stagesId = useId();
  const stages = turn?.stages ?? [];
  const current = stages.at(-1);
  const label = progressLabel(turn, current);

  return <div data-turn-progress data-turn-stage={current ?? "sending"} data-expanded={open}>
    <div className="flex items-center gap-2.5">
      <span className="turn-pulse" aria-hidden="true" />
      <span role="status" title={label} className="turn-shimmer min-w-0 flex-1 truncate text-[15px] leading-snug">{label}</span>
      {turn && <span className="min-w-[4ch] shrink-0 text-right text-xs tabular-nums text-foreground-secondary">
        <span className="sr-only">Tiempo transcurrido: </span>{elapsedText(now - turn.startedAt)}
      </span>}
      {turn && onToggle && <button type="button" onClick={onToggle} aria-expanded={open} aria-controls={stagesId}
        aria-label="Etapas del análisis" title="Etapas del análisis"
        className="-my-2.5 -mr-2.5 grid size-11 shrink-0 place-items-center rounded-md text-foreground-secondary transition hover:bg-surface-elevated/70 hover:text-foreground">
        <ChatIcon name="chevron-down" className={`size-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>}
    </div>
    {turn && onToggle && <div id={stagesId} className="turn-stages" data-open={open} inert={!open}>
      <div className="min-h-0 overflow-hidden">
        <ol aria-label="Etapas del análisis" aria-live="off" className="mt-2.5 ml-[3px] space-y-1.5 border-l border-border/70 pb-0.5 pl-4">
          {stages.slice(0, -1).map((stage, index) => STAGE_LABELS[stage] && <li key={`${index}-${stage}`} className="flex items-center gap-2 text-[13px] text-foreground-secondary">
            <ChatIcon name="check" className="size-3.5 shrink-0 text-success" />{STAGE_LABELS[stage]}
          </li>)}
          <li aria-current="step" className="flex items-center gap-2 text-[13px] text-foreground">
            <span className="mx-1 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />{label}
          </li>
        </ol>
      </div>
    </div>}
  </div>;
}
