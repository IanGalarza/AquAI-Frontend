import type { ProcessingStatus, SemanticIndexStatus } from "@/types/sources";

const processingLabels: Record<ProcessingStatus, string> = {
  uploaded: "En cola", processing: "Preparando", ready: "Preparada",
  ready_with_warnings: "Con advertencias", failed: "Falló la preparación",
};
const indexLabels: Record<SemanticIndexStatus, string> = {
  pending: "Pendiente", processing: "Indexando", ready: "Disponible", failed: "No disponible",
};

function Badge({ label, status, busy }: { label: string; status: string; busy: boolean }) {
  const color = status === "failed" ? "border-error/20 bg-error/5 text-error"
    : status === "ready_with_warnings" ? "border-warning/25 bg-warning/5 text-warning"
    : status === "ready" ? "border-primary/25 bg-primary/5 text-foreground"
    : "border-border bg-surface text-foreground-secondary";
  return (
    <span className={`inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${color}`}>
      <span aria-hidden="true" className={busy
        ? "size-3 shrink-0 animate-spin rounded-full border-2 border-current border-r-transparent motion-reduce:animate-none"
        : "size-1.5 shrink-0 rounded-full bg-current opacity-70"} />
      {label}
    </span>
  );
}

export function ProcessingBadge({ status }: { status: ProcessingStatus }) {
  return <Badge label={processingLabels[status]} status={status} busy={status === "processing" || status === "uploaded"} />;
}

export function SemanticBadge({ status }: { status: SemanticIndexStatus }) {
  return <Badge label={indexLabels[status]} status={status} busy={status === "processing"} />;
}

export function SourceToggle({ active, busy, name, onToggle }: {
  active: boolean; busy: boolean; name: string; onToggle: () => void;
}) {
  return (
    <button type="button" role="switch" aria-checked={active} aria-label={`Fuente activa: ${name}`}
      disabled={busy} onClick={onToggle}
      className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg px-1 text-xs text-foreground-secondary disabled:cursor-wait disabled:opacity-50">
      <span aria-hidden="true" className={`relative h-6 w-10 rounded-full border transition ${active ? "border-primary/70 bg-primary/80" : "border-border bg-surface-elevated"}`}>
        <span className={`absolute top-0.5 size-[18px] rounded-full bg-background shadow-sm transition-transform ${active ? "translate-x-[18px]" : "translate-x-0.5"}`} />
      </span>
      <span>{busy ? "Guardando…" : active ? "Activa" : "Inactiva"}</span>
    </button>
  );
}

export function SourceError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="rounded-xl border border-error/25 bg-error/5 px-4 py-3 text-sm leading-relaxed">
      <p className="break-words">{message}</p>
      {onRetry && <button type="button" onClick={onRetry} className="mt-2 min-h-9 rounded-lg px-2 text-sm font-medium text-error underline underline-offset-4">Volver a intentar</button>}
    </div>
  );
}
