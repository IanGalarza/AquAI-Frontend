import type { SourceListItem } from "@/types/sources";
import { formatBytes, formatDate } from "@/utils/sources";
import { ChatIcon } from "../chat/chat-icon";
import { ProcessingBadge, SemanticBadge, SourceToggle } from "./source-status";

type SourceListRowProps = {
  source: SourceListItem;
  busy: boolean;
  onSelect: () => void;
  onToggle: () => void;
};

export function SourceListRow({ source, busy, onSelect, onToggle }: SourceListRowProps) {
  return (
    <li className="relative grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-3 rounded-md bg-surface/80 px-4 py-3.5 border border-border/70 transition-colors hover:bg-surface-elevated/55 lg:min-h-[88px] lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,1.1fr)_minmax(78px,0.35fr)_minmax(138px,0.65fr)_44px_44px] lg:py-4">
      <button type="button" onClick={onSelect} title={source.name} aria-haspopup="dialog" className="order-1 col-span-2 flex min-w-0 items-center gap-3 rounded-sm pr-12 text-left lg:col-span-1 lg:pr-0">
        <span className="grid size-10 shrink-0 place-items-center rounded-sm bg-primary/10 text-primary"><ChatIcon name="file" className="size-6" /></span>
        <span className="min-w-0"><span className="line-clamp-2 break-words text-[13px] font-semibold [overflow-wrap:anywhere]">{source.name}</span><span className="mt-1 block text-xs text-foreground-secondary">{source.file_type.toUpperCase()} · {formatBytes(source.file_size_bytes)}</span></span>
      </button>
      <dl className="order-3 col-span-2 grid grid-cols-2 gap-3 pt-1 lg:order-2 lg:col-span-1 lg:pt-0">
        <div><dt className="mb-1.5 text-[11px] text-foreground-secondary">Procesamiento</dt><dd><ProcessingBadge status={source.processing_status} compact /></dd></div>
        <div><dt className="mb-1.5 text-[11px] text-foreground-secondary">Búsqueda</dt><dd><SemanticBadge status={source.semantic_index_status} compact /></dd></div>
      </dl>
      <dl className="order-4 min-w-0 lg:order-3">
        <dt className="mb-1.5 flex items-center gap-1.5 text-[11px] text-foreground-secondary"><ChatIcon name="table" className="size-3.5 shrink-0" />Tablas</dt><dd className="text-xs font-medium lg:pl-5">{source.dataset_count}</dd>
      </dl>
      <dl className="order-5 min-w-0 lg:order-4">
        <dt className="mb-1.5 flex items-center gap-1.5 text-[11px] text-foreground-secondary"><ChatIcon name="calendar" className="size-3.5 shrink-0" />Cargado</dt><dd className="text-[11px] leading-relaxed"><time dateTime={source.created_at}>{formatDate(source.created_at)}</time></dd>
      </dl>
      <div className="absolute right-4 top-3.5 order-2 justify-self-end lg:static lg:order-5"><SourceToggle name={source.name} active={source.isActive} busy={busy} onToggle={onToggle} compact /></div>
      <button type="button" onClick={onSelect} aria-label={`Ver detalle de ${source.name}`} aria-haspopup="dialog" title="Ver detalle" className="order-6 col-span-2 grid size-11 place-items-center justify-self-end rounded-sm border-0 text-foreground-secondary transition-colors hover:bg-primary/10 hover:text-primary lg:col-span-1"><ChatIcon name="eye" className="size-5" /></button>
    </li>
  );
}
