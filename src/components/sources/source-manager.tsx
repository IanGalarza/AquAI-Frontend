"use client";

import { useCallback, useEffect, useRef, useState, type DragEvent, type FormEvent } from "react";
import { AquaiShell } from "../aquai-shell";
import { ChatIcon } from "../chat/chat-icon";
import { useSourceResource } from "@/hooks/use-source-resource";
import { getSource, listSources, setSourceActive, uploadSource } from "@/services/backend";
import { errorMessage } from "@/services/api";
import type { SourceDetail as SourceDetailData, SourceListItem, SourceSort } from "@/types/sources";
import { formatBytes, MAX_UPLOAD_BYTES, MINIMUM_CATALOG_LOADING_MS, needsListPolling, needsSourcePolling, validateSourceFile } from "@/utils/sources";
import { SourceDetail } from "./source-detail";
import { SourceDetailModal } from "./source-detail-modal";
import { SourceListRow } from "./source-list-row";
import { SourceError } from "./source-status";

const secondaryButton = "inline-flex min-h-10 items-center justify-center gap-2 whitespace-nowrap rounded-sm border border-border bg-surface/65 px-4 text-xs font-medium transition enabled:hover:border-primary/50 enabled:hover:bg-primary/5 disabled:cursor-default disabled:opacity-45";

type SourceManagerProps = {
  onBack?: () => void;
};

export function SourceManager({ onBack }: SourceManagerProps) {
  const [query, setQuery] = useState<{ page: number; name: string; sort: SourceSort }>({ page: 1, name: "", sort: "newest" });
  const [search, setSearch] = useState("");
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [toggling, setToggling] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepthRef = useRef(0);
  const viewportRef = useRef<HTMLDivElement>(null);
  const controllers = useRef(new Set<AbortController>());
  const uploadLock = useRef(false);
  const activationLocks = useRef(new Set<string>());
  const selectedRef = useRef<string | null>(null);

  const loadList = useCallback((signal: AbortSignal) => listSources(query.page, signal, query), [query]);
  const loadDetail = useCallback((signal: AbortSignal) => getSource(selectedId!, signal), [selectedId]);
  const catalog = useSourceResource(JSON.stringify(query), loadList, needsListPolling, MINIMUM_CATALOG_LOADING_MS);
  const detail = useSourceResource(selectedId, loadDetail, needsSourcePolling);

  useEffect(() => {
    const pending = controllers.current;
    return () => { pending.forEach((controller) => controller.abort()); };
  }, []);

  useEffect(() => {
    if (search.trim() === query.name) return;
    const timer = setTimeout(() => {
      setQuery((current) => ({ ...current, page: 1, name: search.trim() }));
    }, 300);
    return () => clearTimeout(timer);
  }, [search, query.name]);

  function selectSource(id: string | null, keepNotice = false) {
    selectedRef.current = id;
    setSelectedId(id);
    setActionError(null);
    if (!keepNotice) setNotice(null);
  }

  function selectUploadFile(selected: File | null) {
    setFile(selected);
    setFileError(selected ? validateSourceFile(selected) : null);
    setActionError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function dropUploadFile(event: DragEvent<HTMLElement>) {
    if (!event.dataTransfer.types.includes("Files")) return;
    event.preventDefault();
    event.stopPropagation();
    dragDepthRef.current = 0;
    setIsDragging(false);
    if (uploadLock.current) return;
    if (event.dataTransfer.files.length !== 1) {
      selectUploadFile(null);
      setFileError("Seleccioná o arrastrá un solo archivo por vez.");
      return;
    }
    selectUploadFile(event.dataTransfer.files[0]);
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
        ? "Este archivo ya está cargado. Abrimos su detalle para que puedas revisarlo."
        : "Archivo recibido. Podés seguir su preparación a continuación.");
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
      setQuery((current) => ({ ...current, page: 1 }));
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
      setNotice(updated.isActive ? "La fuente se activó. Vas a poder consultarla cuando termine su preparación." : "La fuente se desactivó. El archivo y sus tablas se conservan.");
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

  return (
    <AquaiShell title="Administrar fuentes" subdued sources onBack={onBack}>
      <div ref={viewportRef} id="sources-content" tabIndex={-1} onScroll={(event) => setShowScrollTop(event.currentTarget.scrollTop > 320)} className={`relative z-10 min-h-0 flex-1 overflow-x-hidden overscroll-y-contain ${selectedId ? "overflow-y-hidden" : "overflow-y-auto"}`}>
        <div className="mx-auto flex min-h-full w-full max-w-[1440px] flex-col gap-5 px-4 py-5 sm:px-7 sm:py-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3.5"><span className="grid size-12 shrink-0 place-items-center rounded-sm border border-primary/20 bg-primary/10 text-primary"><ChatIcon name="database" className="size-6" /></span><div><h1 className="text-xl font-semibold tracking-[-0.035em] sm:text-2xl">Administrar fuentes</h1><p className="mt-1 text-xs leading-relaxed text-foreground-secondary sm:text-sm">Gestioná tus archivos y tablas de datos.</p></div></div>
            <div className="flex w-full items-center gap-2.5 sm:w-auto">
              <div className="flex min-h-10 min-w-0 flex-1 items-center gap-2 rounded-sm border border-border bg-surface/45 px-3 focus-within:border-primary/60 sm:w-64">
                <ChatIcon name="search" className="size-4 shrink-0 text-foreground-secondary" />
                <label htmlFor="source-search" className="sr-only">Buscar fuentes</label>
                <input id="source-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} maxLength={255} placeholder="Buscar fuentes…" autoComplete="off" className="h-10 w-full min-w-0 bg-transparent text-xs outline-none placeholder:text-foreground-secondary" />
              </div>
              <button type="button" disabled={catalog.loading} onClick={catalog.refresh} className={`${secondaryButton} shrink-0`} aria-label="Actualizar listado"><ChatIcon name="refresh" className={`size-4 ${catalog.loading ? "animate-spin motion-reduce:animate-none" : ""}`} />Actualizar</button>
            </div>
          </div>
          {!selectedId && notice && <p role="status" aria-live="polite" className="rounded-sm border border-primary/20 bg-primary/5 px-4 py-3 text-sm leading-relaxed">{notice}</p>}
          {!selectedId && actionError && <SourceError message={actionError} />}

          <section
            aria-labelledby="upload-title"
            onDragEnter={(event) => {
              if (!event.dataTransfer.types.includes("Files") || uploadLock.current) return;
              event.preventDefault();
              dragDepthRef.current += 1;
              setIsDragging(true);
            }}
            onDragOver={(event) => {
              if (!event.dataTransfer.types.includes("Files")) return;
              event.preventDefault();
              event.dataTransfer.dropEffect = uploadLock.current ? "none" : "copy";
            }}
            onDragLeave={(event) => {
              if (!event.dataTransfer.types.includes("Files")) return;
              dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
              if (dragDepthRef.current === 0) setIsDragging(false);
            }}
            onDrop={dropUploadFile}
            className={`rounded-md border border-dashed px-4 py-6 transition-colors sm:px-6 ${isDragging ? "border-primary bg-primary/10" : "border-primary/25 bg-primary/[0.025]"}`}
          >
            <form onSubmit={handleUpload} className="flex min-h-48 flex-col items-center justify-center gap-4 text-center">
              <input ref={inputRef} id="source-file" type="file" hidden accept=".csv,.xlsx" disabled={uploading} aria-label="Archivo CSV o XLSX" aria-describedby="upload-help" aria-invalid={Boolean(fileError)} onChange={(event) => selectUploadFile(event.currentTarget.files?.[0] || null)} />
              <div className="flex flex-col items-center gap-3">
            <h2 id="upload-title"><label htmlFor="source-file" className={`flex flex-col items-center gap-3 ${uploading ? "cursor-wait" : "cursor-pointer"}`}><span className="grid size-14 place-items-center rounded-md bg-primary/10 text-primary"><ChatIcon name="cloud-upload" className="size-7" /></span><span className="text-sm font-semibold sm:text-base">{isDragging ? "Soltá el archivo acá" : "Seleccioná un archivo o arrastralo acá"}</span></label></h2>
                <p id="upload-help" className="text-xs text-foreground-secondary">CSV o XLSX · Un archivo por vez · Hasta {formatBytes(MAX_UPLOAD_BYTES)}</p>
              </div>
              {file && <p id="selected-file" className="max-w-full break-all text-xs text-foreground-secondary">{file.name} · {formatBytes(file.size)}</p>}
              {fileError && <p id="file-error" role="alert" className="max-w-md text-xs leading-relaxed text-error">{fileError}</p>}
              <div className="flex flex-wrap items-center justify-center gap-2.5">
                <button type="button" disabled={uploading} onClick={() => inputRef.current?.click()} className={secondaryButton}><ChatIcon name="folder" className="size-4" />Seleccionar archivo</button>
                <button type="submit" disabled={!file || Boolean(fileError) || uploading} className="new-conversation inline-flex min-h-10 items-center justify-center gap-2 rounded-sm bg-action px-5 text-xs font-semibold transition enabled:hover:bg-action-hover disabled:cursor-default disabled:opacity-45"><ChatIcon name="upload" className="size-4" />{uploading ? "Enviando…" : "Subir archivo"}</button>
              </div>
            </form>
          </section>
            <section aria-labelledby="source-list-title" className="flex min-w-0 flex-1 flex-col">
              <div className="mb-3.5 flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2.5"><h2 id="source-list-title" className="text-base font-semibold">Fuentes</h2>{list && <span className="grid min-h-6 min-w-6 place-items-center rounded-sm bg-surface-elevated/70 px-1.5 text-xs text-foreground-secondary">{list.total}</span>}</div>
                <div className="flex items-center gap-2.5"><label htmlFor="source-sort" className="text-xs text-foreground-secondary">Ordenar por:</label><div className="relative"><ChatIcon name="clock" className="pointer-events-none absolute left-3 top-2.5 size-4 text-foreground-secondary" /><select id="source-sort" value={query.sort} onChange={(event) => setQuery((current) => ({ ...current, page: 1, sort: event.target.value as SourceSort }))} className="min-h-9 appearance-none rounded-sm border border-border bg-surface/65 pl-9 pr-9 text-xs outline-none focus-visible:outline-2 focus-visible:outline-primary"><option value="newest">Más recientes</option><option value="oldest">Más antiguas</option><option value="name_asc">Nombre: A a Z</option><option value="name_desc">Nombre: Z a A</option></select><ChatIcon name="chevron-down" className="pointer-events-none absolute right-3 top-2.5 size-4 text-foreground-secondary" /></div></div>
              </div>
              {catalog.error && <div className="mb-4"><SourceError message={catalog.error} onRetry={catalog.refresh} /></div>}
              {catalog.loading && !list && <div role="status" aria-live="polite" className="flex min-h-60 flex-1 flex-col items-center justify-center gap-5 px-4 py-12 text-center text-base font-medium text-foreground-secondary sm:text-lg"><span aria-hidden="true" className="size-12 shrink-0 animate-spin rounded-full border-[3px] border-primary/20 border-t-primary motion-reduce:animate-none sm:size-14" /><span>Obteniendo tus fuentes…</span></div>}
              {list && list.items.length === 0 && <div className="rounded-sm border border-dashed border-border bg-surface/40 px-5 py-10 text-center"><ChatIcon name="database" className="mx-auto size-8 text-primary" /><p className="mt-4 text-sm font-medium">{list.total > 0 ? "No hay fuentes en esta página" : query.name ? "No se encontraron fuentes" : "Todavía no hay fuentes"}</p><p className="mt-2 text-sm text-foreground-secondary">{list.total > 0 ? "Volvé a la página anterior para ver las fuentes disponibles." : query.name ? "Probá con otro nombre o limpiá la búsqueda." : "Subí un CSV o XLSX para preparar tus primeras tablas."}</p>{query.name && <button type="button" onClick={() => setSearch("")} className={`${secondaryButton} mt-4`}>Limpiar búsqueda</button>}</div>}
              {list && list.items.length > 0 && <ul aria-label="Listado de fuentes" aria-busy={catalog.loading} className="space-y-2.5">{list.items.map((source) => <SourceListRow key={source.id} source={source} busy={toggling.includes(source.id)} onSelect={() => selectSource(source.id)} onToggle={() => void toggleSource(source)} />)}</ul>}
              {list && list.total > 0 && <nav aria-label="Páginas de fuentes" className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-foreground-secondary"><span>Página {list.page} de {totalPages} · {list.total} fuentes</span><div className="flex gap-2"><button type="button" disabled={catalog.loading || query.page <= 1} onClick={() => setQuery((current) => ({ ...current, page: current.page - 1 }))} className={secondaryButton}>Anterior</button><button type="button" disabled={catalog.loading || query.page >= totalPages} onClick={() => setQuery((current) => ({ ...current, page: current.page + 1 }))} className={secondaryButton}>Siguiente</button></div></nav>}
            </section>
        </div>
      </div>
      {showScrollTop && <button type="button" onClick={() => viewportRef.current?.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" })} aria-label="Volver arriba" title="Volver arriba" className="absolute bottom-5 right-5 z-20 grid size-11 place-items-center rounded-sm border border-action bg-action text-on-action shadow-sm transition hover:bg-action-hover"><ChatIcon name="arrow-up" className="size-5" /></button>}
      {selectedId && <SourceDetailModal source={detail.data ?? list?.items.find((source) => source.id === selectedId) ?? null} onClose={() => selectSource(null)} onRefresh={detail.refresh} refreshing={detail.loading}>
        {notice && <p role="status" aria-live="polite" className="rounded-sm border border-primary/20 bg-primary/5 px-4 py-3 text-sm leading-relaxed">{notice}</p>}
        {actionError && <SourceError message={actionError} />}
        {detail.error && <SourceError message={detail.error} onRetry={detail.refresh} />}
        {detail.loading && !detail.data && <div role="status" className="flex min-h-52 flex-col items-center justify-center gap-4 text-sm text-foreground-secondary"><span aria-hidden="true" className="size-8 animate-spin rounded-full border-2 border-primary/20 border-t-primary motion-reduce:animate-none" /><span>Consultando la fuente…</span></div>}
        {detail.data && <SourceDetail source={detail.data} toggling={toggling.includes(detail.data.id)} onToggle={() => void toggleSource(detail.data!)} />}
      </SourceDetailModal>}
    </AquaiShell>
  );
}
