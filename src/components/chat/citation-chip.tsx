"use client";

import { useCallback, useId, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import type { Citation, CitationVariable } from "@/types/conversations";
import { placeFloating, revealFloating } from "@/utils/floating";
import { ChatIcon } from "./chat-icon";

//
// Suscripción vacía para detectar el entorno cliente con useSyncExternalStore.
//
const noSubscription = () => () => {};

//
// Devuelve el nombre del archivo de una cita sin su extensión de planilla.
//
function shortName(citation: Citation): string {
  return citation.file_name.replace(/\.(xlsx|xlsm|xls|csv)$/i, "");
}

//
// Muestra la ubicación (columna, fila y celdas) de una variable citada.
//
function VariableLocation({ variable }: { variable: CitationVariable }) {
  const position = variable.column ? `Columna ${variable.column}` : variable.row ? `Fila ${variable.row}` : null;
  return <li className="min-w-0">
    <span className="block font-medium [overflow-wrap:anywhere]">{variable.name}</span>
    {position && <span className="block text-[11px] text-foreground-secondary">
      {position}{variable.cells && <> · celdas <span className="font-mono">{variable.cells}</span></>}
    </span>}
  </li>;
}

//
// Muestra la procedencia de una cita: archivo, hoja, filas, variables y versión.
//
function CitationDetail({ citation }: { citation: Citation }) {
  const location = citation.sheet ?? (citation.dataset && citation.dataset !== shortName(citation) ? citation.dataset : null);
  const rows = citation.first_row != null && citation.last_row != null
    ? `${citation.first_row} a ${citation.last_row}` : null;
  return <li className="py-3 first:pt-0 last:pb-0">
    <p className="flex items-start gap-2 text-[13px] font-medium leading-snug">
      <ChatIcon name="table" className="mt-px size-4 shrink-0 text-primary" />
      <span className="min-w-0 [overflow-wrap:anywhere]">{citation.file_name}</span>
    </p>
    <dl className="mt-2 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1.5 pl-6 text-xs leading-relaxed">
      {location && <><dt className="text-foreground-secondary">{citation.sheet ? "Hoja" : "Tabla"}</dt><dd className="[overflow-wrap:anywhere]">{location}</dd></>}
      {rows && <><dt className="text-foreground-secondary">Filas</dt><dd>{rows}</dd></>}
      {citation.variables.length > 0 && <><dt className="text-foreground-secondary">Variables</dt>
        <dd><ul className="space-y-1.5">{citation.variables.map((variable, index) => <VariableLocation key={`${index}-${variable.name}`} variable={variable} />)}</ul></dd></>}
      <dt className="text-foreground-secondary">Versión</dt><dd>{citation.version}</dd>
    </dl>
  </li>;
}

//
// Renderiza el indicador de fuentes de una afirmación con un detalle emergente.
//
export function CitationChip({ citations }: { citations: Citation[] }) {
  const id = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const client = useSyncExternalStore(noSubscription, () => true, () => false);
  const popoverRef = useCallback((element: HTMLDivElement | null) => {
    if (!element) return;
    const popover: HTMLDivElement = element;
    const close = () => { if (popover.matches(":popover-open")) popover.hidePopover(); };
    const onScroll = (event: Event) => { if (!(event.target instanceof Node && popover.contains(event.target))) close(); };
    function onToggle(event: Event) {
      const open = (event as ToggleEvent).newState === "open";
      document[open ? "addEventListener" : "removeEventListener"]("scroll", onScroll, true);
      window[open ? "addEventListener" : "removeEventListener"]("resize", close);
      if (!open || !triggerRef.current) return;
      placeFloating(triggerRef.current, popover);
      revealFloating(popover);
      popover.focus({ preventScroll: true });
    }
    popover.addEventListener("toggle", onToggle);
    return () => {
      popover.removeEventListener("toggle", onToggle);
      document.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", close);
    };
  }, []);

  if (!citations.length) return null;
  const [first, ...rest] = citations;
  const title = citations.length === 1 ? "Fuente" : `${citations.length} fuentes`;
  return <>
    <button ref={triggerRef} type="button" popoverTarget={id} data-citation-chip
      aria-label={`${title}: ${citations.map(shortName).join(", ")}. Ver detalles`}
      className="mx-1 inline-flex max-w-[min(15rem,70vw)] translate-y-[-1px] items-center gap-1 rounded-full bg-surface-elevated/80 px-2 py-0.5 align-middle text-[11px] font-medium leading-4 text-foreground-secondary transition-colors hover:bg-primary/15 hover:text-foreground focus-visible:bg-primary/15">
      <span className="truncate">{shortName(first)}</span>
      {rest.length > 0 && <span className="shrink-0">+{rest.length}</span>}
    </button>
    {client && createPortal(<div ref={popoverRef} id={id} popover="auto" role="dialog" aria-label={title} tabIndex={-1}
      className="fixed inset-auto m-0 w-[min(340px,calc(100vw-24px))] max-h-[calc(100dvh-24px)] overflow-y-auto rounded-lg border border-border bg-surface-elevated p-4 text-left text-foreground shadow-xl shadow-black/20 outline-none backdrop:bg-transparent">
      <p className="mb-3 text-[11px] font-medium text-foreground-secondary">{title}</p>
      <ul className="divide-y divide-border/70">{citations.map((citation) => <CitationDetail key={citation.id} citation={citation} />)}</ul>
    </div>, document.body)}
  </>;
}
