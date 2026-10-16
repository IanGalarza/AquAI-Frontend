"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { AquaiShell } from "../aquai-shell";
import { ChatIcon } from "../chat/chat-icon";
import { useSourceResource } from "@/hooks/use-source-resource";
import { getSource, listSources, setSourceActive, uploadSource } from "@/services/backend";
import { errorMessage } from "@/services/api";
import type { SourceDetail as SourceDetailData, SourceListItem, SourceSort } from "@/types/sources";
import { formatBytes, MAX_UPLOAD_BYTES, needsListPolling, needsSourcePolling, validateSourceFile } from "@/utils/sources";
import { SourceDetail } from "./source-detail";
import { SourceListRow } from "./source-list-row";
import { SourceError } from "./source-status";

const secondaryButton = "inline-flex min-h-10 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-border bg-surface/65 px-4 text-xs font-medium transition enabled:hover:border-primary/50 enabled:hover:bg-primary/5 disabled:cursor-default disabled:opacity-45";

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
  const [toggling, setToggling] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const controllers = useRef(new Set<AbortController>());
  const uploadLock = useRef(false);
  const activationLocks = useRef(new Set<string>());
  const selectedRef = useRef<string | null>(null);

  const loadList = useCallback((signal: AbortSignal) => listSources(query.page, signal, query), [query]);
  const loadDetail = useCallback((signal: AbortSignal) => getSource(selectedId!, signal), [selectedId]);
  const catalog = useSourceResource(selectedId ? null : JSON.stringify(query), loadList, needsListPolling);
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

  useEffect(() => {
    function focusSearch(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k" && searchRef.current) {
        event.preventDefault();
        searchRef.current.focus();
      }
    }
    document.addEventListener("keydown", focusSearch);
    return () => document.removeEventListener("keydown", focusSearch);
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
      <div ref={viewportRef} id="sources-content" tabIndex={-1} onScroll={(event) => setShowScrollTop(event.currentTarget.scrollTop > 320)} className="relative z-10 min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain">
        <div className="mx-auto w-full max-w-[1440px] space-y-5 px-4 py-5 sm:px-7 sm:py-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {selectedId ? <button type="button" onClick={() => { selectSource(null); catalog.refresh(); }} className={secondaryButton}><ChatIcon name="arrow-left" className="size-4" />Volver al listado</button>
              : <div className="flex min-w-0 items-center gap-3.5"><span className="grid size-12 shrink-0 place-items-center rounded-full border border-primary/20 bg-primary/10 text-primary"><ChatIcon name="database" className="size-6" /></span><div><h1 className="text-xl font-semibold tracking-[-0.035em] sm:text-2xl">Administrar fuentes</h1><p className="mt-1 text-xs leading-relaxed text-foreground-secondary sm:text-sm">Gestioná tus archivos y datasets de fuentes de datos.</p></div></div>}
            <div className="flex w-full items-center gap-2.5 sm:w-auto">
              {!selectedId && <div className="flex min-h-10 min-w-0 flex-1 items-center gap-2 rounded-lg border border-border bg-surface/45 px-3 focus-within:border-primary/60 sm:w-64">
                <ChatIcon name="search" className="size-4 shrink-0 text-foreground-secondary" />
                <label htmlFor="source-search" className="sr-only">Buscar fuentes</label>
                <input ref={searchRef} id="source-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} maxLength={255} placeholder="Buscar fuentes…" autoComplete="off" aria-keyshortcuts="Control+k Meta+k" className="h-10 w-full min-w-0 bg-transparent text-xs outline-none placeholder:text-foreground-secondary" />
                <kbd aria-hidden="true" className="hidden shrink-0 rounded border border-border bg-surface-elevated/40 px-1.5 py-0.5 text-[10px] text-foreground-secondary sm:block">Ctrl K</kbd>
              </div>}
              <button type="button" disabled={currentResource.loading} onClick={currentResource.refresh} className={`${secondaryButton} shrink-0`} aria-label={selectedId ? "Actualizar fuente" : "Actualizar listado"}><ChatIcon name="refresh" className={`size-4 ${currentResource.loading ? "animate-spin motion-reduce:animate-none" : ""}`} />Actualizar</button>
            </div>
          </div>
          {notice && <p role="status" aria-live="polite" className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm leading-relaxed">{notice}</p>}
          {actionError && <SourceError message={actionError} />}

          {!selectedId && <>
            <section aria-labelledby="upload-title" className="rounded-xl border border-dashed border-primary/40 bg-primary/[0.035] px-4 py-4 sm:px-5">
              <form onSubmit={handleUpload} className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex min-w-0 flex-1 items-center gap-3.5">
                  <span className="grid size-12 shrink-0 place-items-center rounded-full bg-primary/10 text-primary"><ChatIcon name="cloud-upload" className="size-6" /></span>
                  <div className="min-w-0"><h2 id="upload-title" className="text-sm font-semibold">Subí un archivo de datos</h2><p id="upload-help" className="mt-1 text-xs text-foreground-secondary">CSV o XLSX · Hasta {formatBytes(MAX_UPLOAD_BYTES)}</p>
                    {file && <p id="selected-file" className="mt-1.5 break-all text-xs text-foreground-secondary">{file.name} · {formatBytes(file.size)}</p>}
                    {fileError && <p id="file-error" role="alert" className="mt-1.5 text-xs leading-relaxed text-error">{fileError}</p>}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <input ref={inputRef} id="source-file" type="file" hidden accept=".csv,.xlsx" disabled={uploading} aria-label="Archivo CSV o XLSX" aria-describedby="upload-help" aria-invalid={Boolean(fileError)}
                    onChange={(event) => { const selected = event.currentTarget.files?.[0] || null; setFile(selected); setFileError(selected ? validateSourceFile(selected) : null); setActionError(null); }}
                  />
                  <button type="button" disabled={uploading} onClick={() => inputRef.current?.click()} className={`${secondaryButton} flex-1 md:flex-none`}><ChatIcon name="folder" className="size-4" />Seleccionar archivo</button>
                  <button type="submit" disabled={!file || Boolean(fileError) || uploading} className="new-conversation inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-xs font-semibold transition enabled:hover:bg-primary-light disabled:cursor-default disabled:opacity-45 md:flex-none"><ChatIcon name="upload" className="size-4" />{uploading ? "Enviando…" : "Subir archivo"}</button>
                </div>
              </form>
            </section>
            <section aria-labelledby="source-list-title" className="min-w-0">
              <div className="mb-3.5 flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2.5"><h2 id="source-list-title" className="text-base font-semibold">Fuentes</h2>{list && <span className="grid min-h-6 min-w-6 place-items-center rounded-full bg-surface-elevated/70 px-1.5 text-xs text-foreground-secondary">{list.total}</span>}</div>
                <div className="flex items-center gap-2.5"><label htmlFor="source-sort" className="text-xs text-foreground-secondary">Ordenar por:</label><div className="relative"><ChatIcon name="clock" className="pointer-events-none absolute left-3 top-2.5 size-4 text-foreground-secondary" /><select id="source-sort" value={query.sort} onChange={(event) => setQuery((current) => ({ ...current, page: 1, sort: event.target.value as SourceSort }))} className="min-h-9 appearance-none rounded-lg border border-border bg-surface/65 pl-9 pr-9 text-xs outline-none focus-visible:outline-2 focus-visible:outline-primary"><option value="newest">Más recientes</option><option value="oldest">Más antiguas</option><option value="name_asc">Nombre: A a Z</option><option value="name_desc">Nombre: Z a A</option></select><ChatIcon name="chevron-down" className="pointer-events-none absolute right-3 top-2.5 size-4 text-foreground-secondary" /></div></div>
              </div>
              {catalog.error && <div className="mb-4"><SourceError message={catalog.error} onRetry={catalog.refresh} /></div>}
              {catalog.loading && !list && <p role="status" className="py-10 text-center text-sm text-foreground-secondary">Cargando fuentes…</p>}
              {list && list.items.length === 0 && <div className="rounded-xl border border-dashed border-border bg-surface/40 px-5 py-10 text-center"><ChatIcon name="database" className="mx-auto size-8 text-primary" /><p className="mt-4 text-sm font-medium">{list.total > 0 ? "No hay fuentes en esta página" : query.name ? "No se encontraron fuentes" : "Todavía no hay fuentes"}</p><p className="mt-2 text-sm text-foreground-secondary">{list.total > 0 ? "Volvé a la página anterior para ver las fuentes disponibles." : query.name ? "Probá con otro nombre o limpiá la búsqueda." : "Subí un CSV o XLSX para preparar tus primeros datasets."}</p>{query.name && <button type="button" onClick={() => setSearch("")} className={`${secondaryButton} mt-4`}>Limpiar búsqueda</button>}</div>}
              {list && list.items.length > 0 && <ul aria-label="Listado de fuentes" aria-busy={catalog.loading} className="space-y-2.5">{list.items.map((source) => <SourceListRow key={source.id} source={source} busy={toggling.includes(source.id)} onSelect={() => selectSource(source.id)} onToggle={() => void toggleSource(source)} />)}</ul>}
              {list && list.total > 0 && <nav aria-label="Páginas de fuentes" className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-foreground-secondary"><span>Página {list.page} de {totalPages} · {list.total} fuentes</span><div className="flex gap-2"><button type="button" disabled={catalog.loading || query.page <= 1} onClick={() => setQuery((current) => ({ ...current, page: current.page - 1 }))} className={secondaryButton}>Anterior</button><button type="button" disabled={catalog.loading || query.page >= totalPages} onClick={() => setQuery((current) => ({ ...current, page: current.page + 1 }))} className={secondaryButton}>Siguiente</button></div></nav>}
            </section>
          </>}

          {selectedId && <>
            {detail.error && <SourceError message={detail.error} onRetry={detail.refresh} />}
            {detail.loading && !detail.data && <p role="status" className="py-10 text-center text-sm text-foreground-secondary">Consultando la fuente…</p>}
            {detail.data && <SourceDetail source={detail.data} toggling={toggling.includes(detail.data.id)} onToggle={() => void toggleSource(detail.data!)} />}
          </>}
        </div>
      </div>
      {showScrollTop && <button type="button" onClick={() => viewportRef.current?.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" })} aria-label="Volver arriba" title="Volver arriba" className="absolute bottom-5 right-5 z-20 grid size-11 place-items-center rounded-full border border-primary/40 bg-primary text-background shadow-lg transition hover:bg-primary-light"><ChatIcon name="arrow-up" className="size-5" /></button>}
    </AquaiShell>
  );
}
