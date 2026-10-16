"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { AquaiShell } from "../aquai-shell";
import { ChatIcon } from "../chat/chat-icon";
import { useSourceResource } from "@/hooks/use-source-resource";
import { getSource, listSources, setSourceActive, uploadSource } from "@/services/backend";
import { errorMessage } from "@/services/api";
import type { SourceDetail as SourceDetailData, SourceListItem } from "@/types/sources";
import { formatBytes, formatDate, MAX_UPLOAD_BYTES, needsListPolling, needsSourcePolling, validateSourceFile } from "@/utils/sources";
import { SourceDetail } from "./source-detail";
import { ProcessingBadge, SemanticBadge, SourceError, SourceToggle } from "./source-status";

const secondaryButton = "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-border bg-surface/65 px-3 text-sm transition enabled:hover:border-primary/50 enabled:hover:bg-primary/5 disabled:cursor-default disabled:opacity-45";

type SourceManagerProps = {
  onBack?: () => void;
};

export function SourceManager({ onBack }: SourceManagerProps) {
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [toggling, setToggling] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const controllers = useRef(new Set<AbortController>());
  const uploadLock = useRef(false);
  const activationLocks = useRef(new Set<string>());
  const selectedRef = useRef<string | null>(null);

  const loadList = useCallback((signal: AbortSignal) => listSources(page, signal), [page]);
  const loadDetail = useCallback((signal: AbortSignal) => getSource(selectedId!, signal), [selectedId]);
  const catalog = useSourceResource(selectedId ? null : `page:${page}`, loadList, needsListPolling);
  const detail = useSourceResource(selectedId, loadDetail, needsSourcePolling);

  useEffect(() => {
    const pending = controllers.current;
    return () => { pending.forEach((controller) => controller.abort()); };
  }, []);

  function selectSource(id: string | null, keepNotice = false) {
    selectedRef.current = id;
    setSelectedId(id);
    setActionError(null);
    if (!keepNotice) setNotice(null);
    viewportRef.current?.scrollTo({ top: 0, behavior: "instant" });
  }

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file || uploadLock.current) return;
    const invalid = validateSourceFile(file);
    if (invalid) { setFileError(invalid); return; }
    uploadLock.current = true;
    const controller = new AbortController();
    controllers.current.add(controller);
    setUploading(true);
    setFileError(null);
    setActionError(null);
    setNotice(null);
    try {
      const accepted = await uploadSource(file, controller.signal);
      if (controller.signal.aborted) return;
      setNotice(accepted.duplicate
        ? "Este archivo ya existe. Se muestra la fuente correspondiente; no se creó una carga nueva."
        : "Archivo recibido. Podés seguir su preparación y la indexación semántica a continuación.");
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
      setPage(1);
      catalog.refresh();
      selectSource(accepted.id, true);
    } catch (error) {
      if (!controller.signal.aborted) setActionError(errorMessage(error));
    } finally {
      controllers.current.delete(controller);
      uploadLock.current = false;
      if (!controller.signal.aborted) setUploading(false);
    }
  }

  async function toggleSource(source: SourceListItem | SourceDetailData) {
    if (activationLocks.current.has(source.id)) return;
    activationLocks.current.add(source.id);
    const controller = new AbortController();
    controllers.current.add(controller);
    setToggling((current) => [...current, source.id]);
    setActionError(null);
    try {
      const updated = await setSourceActive(source.id, !source.isActive, controller.signal);
      if (controller.signal.aborted) return;
      if (selectedRef.current === updated.id) detail.replace(updated);
      catalog.refresh();
      setNotice(updated.isActive ? "La fuente se activó. Su disponibilidad depende del estado de preparación." : "La fuente se desactivó. El archivo y sus datasets se conservan.");
    } catch (error) {
      if (!controller.signal.aborted) setActionError(errorMessage(error));
    } finally {
      controllers.current.delete(controller);
      activationLocks.current.delete(source.id);
      if (!controller.signal.aborted) setToggling((current) => current.filter((id) => id !== source.id));
    }
  }

  const list = catalog.data;
  const totalPages = list ? Math.max(1, Math.ceil(list.total / list.page_size)) : 1;
  const currentResource = selectedId ? detail : catalog;

  return (
    <AquaiShell title="Administrar fuentes" subdued sources onBack={onBack}>
      <div ref={viewportRef} id="sources-content" tabIndex={-1} className="relative z-10 min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain">
        <div className="mx-auto w-full max-w-[1200px] space-y-5 px-4 py-6 sm:px-7 sm:py-8 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {selectedId ? <button type="button" onClick={() => { selectSource(null); catalog.refresh(); }} className={secondaryButton}><ChatIcon name="arrow-left" className="size-4" />Volver al listado</button>
              : <div><h1 className="text-2xl font-medium tracking-[-0.035em]">Administrar fuentes</h1><p className="mt-2 text-sm leading-relaxed text-foreground-secondary">Prepará tus archivos y consultá los datasets disponibles.</p></div>}
            <button type="button" disabled={currentResource.loading} onClick={currentResource.refresh} className={secondaryButton} aria-label={selectedId ? "Actualizar fuente" : "Actualizar listado"}><ChatIcon name="refresh" className="size-4" />Actualizar</button>
          </div>
          {notice && <p role="status" aria-live="polite" className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm leading-relaxed">{notice}</p>}
          {actionError && <SourceError message={actionError} />}

          {!selectedId && <>
            <section aria-labelledby="upload-title" className="rounded-2xl border border-border bg-surface/65 p-4 sm:p-5">
              <h2 id="upload-title" className="text-sm font-semibold">Cargar una fuente</h2>
              <p id="upload-help" className="mt-1.5 text-xs leading-relaxed text-foreground-secondary">CSV o XLSX · Un archivo por carga · Hasta {formatBytes(MAX_UPLOAD_BYTES)}</p>
              <form onSubmit={handleUpload} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start">
                <div className="min-w-0 flex-1">
                  <label htmlFor="source-file" className="sr-only">Archivo CSV o XLSX</label>
                  <input ref={inputRef} id="source-file" type="file" accept=".csv,.xlsx" disabled={uploading} aria-describedby="upload-help selected-file file-error" aria-invalid={Boolean(fileError)}
                    onChange={(event) => { const selected = event.currentTarget.files?.[0] || null; setFile(selected); setFileError(selected ? validateSourceFile(selected) : null); setActionError(null); }}
                    className="block min-h-11 w-full min-w-0 rounded-xl border border-border bg-background/50 p-2 text-xs text-foreground-secondary file:mr-3 file:rounded-lg file:border-0 file:bg-surface-elevated file:px-3 file:py-2 file:font-medium file:text-foreground focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-50" />
                  {file && <p id="selected-file" className="mt-2 break-all text-xs text-foreground-secondary">{file.name} · {formatBytes(file.size)}</p>}
                  {fileError && <p id="file-error" role="alert" className="mt-2 text-xs leading-relaxed text-error">{fileError}</p>}
                </div>
                <button type="submit" disabled={!file || Boolean(fileError) || uploading} className="new-conversation inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold transition enabled:hover:bg-primary-light disabled:cursor-default disabled:opacity-45"><ChatIcon name="upload" className="size-[18px]" />{uploading ? "Enviando archivo…" : "Subir archivo"}</button>
              </form>
            </section>
            <section aria-labelledby="source-list-title" className="min-w-0">
              <div className="mb-4 flex items-center gap-2"><h2 id="source-list-title" className="text-base font-semibold">Fuentes</h2>{list && <span className="rounded-full bg-surface-elevated/70 px-2 py-0.5 text-xs text-foreground-secondary">{list.total}</span>}</div>
              {catalog.error && <div className="mb-4"><SourceError message={catalog.error} onRetry={catalog.refresh} /></div>}
              {catalog.loading && !list && <p role="status" className="py-10 text-center text-sm text-foreground-secondary">Cargando fuentes…</p>}
              {list && list.items.length === 0 && <div className="rounded-2xl border border-dashed border-border bg-surface/40 px-5 py-10 text-center"><ChatIcon name="database" className="mx-auto size-8 text-primary" /><p className="mt-4 text-sm font-medium">{list.total > 0 ? "No hay fuentes en esta página" : "Todavía no hay fuentes"}</p><p className="mt-2 text-sm text-foreground-secondary">{list.total > 0 ? "Volvé a la página anterior para ver las fuentes disponibles." : "Subí un CSV o XLSX para preparar tus primeros datasets."}</p></div>}
              {list && list.items.length > 0 && <ul className="space-y-3">{list.items.map((source) => <li key={source.id} className="rounded-2xl border border-border bg-surface/65 p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3"><button type="button" onClick={() => selectSource(source.id)} className="min-w-0 flex-1 rounded-md text-left"><span className="block break-words text-sm font-semibold [overflow-wrap:anywhere]">{source.name}</span><span className="mt-1.5 block text-xs text-foreground-secondary">{source.file_type.toUpperCase()} · {formatBytes(source.file_size_bytes)}</span></button><SourceToggle name={source.name} active={source.isActive} busy={toggling.includes(source.id)} onToggle={() => void toggleSource(source)} /></div>
                <dl className="mt-4 grid grid-cols-2 items-start gap-x-3 gap-y-4 xl:grid-cols-4"><div><dt className="mb-1.5 text-xs text-foreground-secondary">Procesamiento</dt><dd><ProcessingBadge status={source.processing_status} /></dd></div><div><dt className="mb-1.5 text-xs text-foreground-secondary">Índice semántico</dt><dd><SemanticBadge status={source.semantic_index_status} /></dd></div><div><dt className="mb-1.5 text-xs text-foreground-secondary">Fecha de carga</dt><dd className="text-xs"><time dateTime={source.created_at}>{formatDate(source.created_at)}</time></dd></div><div><dt className="mb-1.5 text-xs text-foreground-secondary">Datasets</dt><dd className="text-sm">{source.dataset_count}</dd></div></dl>
                <div className="mt-3 flex justify-end"><button type="button" onClick={() => selectSource(source.id)} aria-label={`Ver detalle de ${source.name}`} className="inline-flex min-h-10 items-center gap-1 rounded-lg px-2 text-xs font-medium text-foreground-secondary transition hover:bg-primary/5 hover:text-foreground">Ver detalle<ChatIcon name="chevron-right" className="size-4" /></button></div>
              </li>)}</ul>}
              {list && list.total > 0 && <nav aria-label="Páginas de fuentes" className="mt-5 flex flex-wrap items-center justify-between gap-3 text-xs text-foreground-secondary"><span>Página {list.page} de {totalPages} · {list.total} fuentes</span><div className="flex gap-2"><button type="button" disabled={catalog.loading || page <= 1} onClick={() => setPage((current) => current - 1)} className={secondaryButton}>Anterior</button><button type="button" disabled={catalog.loading || page >= totalPages} onClick={() => setPage((current) => current + 1)} className={secondaryButton}>Siguiente</button></div></nav>}
            </section>
          </>}

          {selectedId && <>
            {detail.error && <SourceError message={detail.error} onRetry={detail.refresh} />}
            {detail.loading && !detail.data && <p role="status" className="py-10 text-center text-sm text-foreground-secondary">Consultando la fuente…</p>}
            {detail.data && <SourceDetail source={detail.data} toggling={toggling.includes(detail.data.id)} onToggle={() => void toggleSource(detail.data!)} />}
          </>}
        </div>
      </div>
    </AquaiShell>
  );
}
