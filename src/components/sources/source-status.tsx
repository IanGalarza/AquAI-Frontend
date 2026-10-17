import type { ProcessingStatus, SemanticIndexStatus } from "@/types/sources";
import { formatSourceMessage } from "@/utils/sources";

const processingLabels: Record<ProcessingStatus, string> = {
  uploaded: "En cola", processing: "Preparando", ready: "Preparada",
  ready_with_warnings: "Con advertencias", failed: "Falló la preparación",
};
const indexLabels: Record<SemanticIndexStatus, string> = {
  pending: "Pendiente", processing: "Preparando", ready: "Disponible", failed: "No disponible",
};

function Badge({ label, status, busy, compact = false }: { label: string; status: string; busy: boolean; compact?: boolean }) {
  const color = status === "failed" ? "border-error/20 bg-error/5 text-error"
    : status === "ready_with_warnings" ? "border-warning/25 bg-warning/5 text-warning"
    : status === "ready" ? "source-status-ready border-success/30 bg-success/10"
    : "border-border bg-surface text-foreground-secondary";
  return (
    <span className={`inline-flex max-w-full items-center gap-1.5 rounded-sm border font-medium ${compact ? "whitespace-nowrap px-2 py-1 text-[11px] leading-none" : "px-2.5 py-1 text-xs"} ${color}`}>
      <span aria-hidden="true" className={busy
        ? "size-3 shrink-0 animate-spin rounded-full border-2 border-current border-r-transparent motion-reduce:animate-none"
        : "size-1.5 shrink-0 rounded-full bg-current opacity-70"} />
      {label}
    </span>
  );
}

export function ProcessingBadge({ status, compact = false }: { status: ProcessingStatus; compact?: boolean }) {
  const label = compact && status === "failed" ? "Falló" : compact && status === "ready" ? "Completado" : processingLabels[status];
  return <Badge label={label} status={status} compact={compact} busy={status === "processing" || status === "uploaded"} />;
}

export function SemanticBadge({ status, compact = false }: { status: SemanticIndexStatus; compact?: boolean }) {
  return <Badge label={indexLabels[status]} status={status} compact={compact} busy={status === "processing"} />;
}

export function SourceToggle({ active, busy, name, onToggle, compact = false }: {
  active: boolean; busy: boolean; name: string; onToggle: () => void; compact?: boolean;
}) {
  return (
    <button type="button" role="switch" aria-checked={active} aria-label={`Fuente activa: ${name}`}
      disabled={busy} onClick={onToggle} aria-busy={busy}
      title={busy ? "Guardando…" : active ? "Desactivar fuente" : "Activar fuente"}
      className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-sm px-1 text-xs text-foreground-secondary disabled:cursor-wait disabled:opacity-50">
      <span aria-hidden="true" className={`relative h-6 w-10 rounded-sm border transition ${active ? "border-action bg-action" : "border-border bg-surface-elevated"}`}>
        <span className={`absolute left-0.5 top-0.5 size-[18px] rounded-[2px] bg-white shadow-sm transition-transform ${active ? "translate-x-4" : "translate-x-0"}`} />
      </span>
      <span className={compact ? "sr-only" : undefined}>{busy ? "Guardando…" : active ? "Activa" : "Inactiva"}</span>
    </button>
  );
}

export function SourceError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="rounded-sm bg-error/5 px-4 py-3 text-sm leading-relaxed">
      <p className="break-words">{formatSourceMessage(message)}</p>
      {onRetry && <button type="button" onClick={onRetry} className="mt-2 min-h-9 rounded-sm px-2 text-sm font-medium text-error underline underline-offset-4">Volver a intentar</button>}
    </div>
  );
}
