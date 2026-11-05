import "./setup";
import assert from "node:assert/strict";
import { test } from "node:test";
import { ApiError, apiRequest, errorMessage, isTransientError } from "../src/services/api";
import { getSource, listSources, setSourceActive, uploadSource } from "../src/services/backend";
import type { SourceDetail, SourceList } from "../src/types/sources";
import { documentLanguage, isDocumentType, MAX_DOCUMENT_UPLOAD_BYTES, MAX_UPLOAD_BYTES, needsListPolling, needsSourcePolling, sourceErrors, validateSourceFile } from "../src/utils/sources";

const source: SourceDetail = {
  id: "123", original_filename: "muestra.csv", file_type: "csv",
  file_size_bytes: 64, processing_status: "ready",
  semantic_index_status: "ready", isActive: true,
  created_at: "2026-10-14T12:00:00Z",
  description: null, processing_report: {}, datasets: [], queryable: false,
};
const listItem = { ...source, name: source.original_filename, dataset_count: 3 };

test("carga multipart individual y conserva la respuesta de duplicado HTTP 202", async (context) => {
  const accepted = { id: source.id, processing_status: "uploaded", semantic_index_status: "pending", duplicate: true };
  context.mock.method(globalThis, "fetch", async (url: string, options: RequestInit) => {
    assert.equal(url, "http://localhost:8000/sources");
    assert.equal(options.method, "POST");
    assert.equal(options.headers, undefined);
    assert.ok(options.body instanceof FormData);
    assert.deepEqual([...options.body.keys()], ["file"]);
    assert.equal((options.body.get("file") as File).name, "muestra.csv");
    return Response.json(accepted, { status: 202 });
  });
  assert.deepEqual(await uploadSource(new File(["sitio,pH\nA,7"], "muestra.csv")), accepted);
});

test("lista paginada y detalle usan las rutas y nombres reales del backend", async (context) => {
  const list: SourceList = { items: [listItem], total: 41, page: 2, page_size: 20 };
  context.mock.method(globalThis, "fetch", async (url: string) => {
    if (url.endsWith("/sources?page=2&page_size=20")) return Response.json(list);
    assert.equal(url, "http://localhost:8000/sources/123");
    return Response.json(source);
  });
  assert.deepEqual(await listSources(2), list);
  assert.deepEqual(await getSource("123"), source);
});

test("búsqueda y orden opcionales llegan al backend junto con la página y la cancelación", async (context) => {
  const controller = new AbortController();
  const list: SourceList = { items: [], total: 0, page: 2, page_size: 20 };
  context.mock.method(globalThis, "fetch", async (url: string, options: RequestInit) => {
    const request = new URL(url);
    assert.equal(request.pathname, "/sources");
    assert.equal(request.searchParams.get("page"), "2");
    assert.equal(request.searchParams.get("page_size"), "20");
    assert.equal(request.searchParams.get("name"), "pH & 100%_agua");
    assert.equal(request.searchParams.get("sort"), "oldest");
    assert.ok(options.signal instanceof AbortSignal);
    assert.equal(options.signal.aborted, false);
    return Response.json(list);
  });
  assert.deepEqual(await listSources(2, controller.signal, { name: "  pH & 100%_agua  ", sort: "oldest" }), list);
});

test("activación envía isActive y respeta el estado independiente devuelto", async (context) => {
  const updated = { ...source, isActive: false, semantic_index_status: "pending", queryable: false };
  context.mock.method(globalThis, "fetch", async (url: string, options: RequestInit) => {
    assert.equal(url, "http://localhost:8000/sources/123");
    assert.equal(options.method, "PATCH");
    assert.deepEqual(JSON.parse(options.body as string), { isActive: false });
    return Response.json(updated);
  });
  assert.deepEqual(await setSourceActive("123", false), updated);
});

test("errores HTTP legibles, validación de FastAPI y cancelación de solicitudes", async (context) => {
  for (const status of [400, 404, 413, 422, 503]) {
    context.mock.method(globalThis, "fetch", async () => Response.json({ detail: "Detalle del backend" }, { status }));
    await assert.rejects(apiRequest("/sources"), (error: unknown) => {
      assert.ok(error instanceof ApiError);
      assert.equal(error.status, status);
      assert.match(errorMessage(error), status === 503 ? /Las fuentes no se encuentran disponibles/ : /Detalle del backend/);
      assert.equal(isTransientError(error), status === 503);
      return true;
    });
    context.mock.restoreAll();
  }
  context.mock.method(globalThis, "fetch", async () => Response.json({ detail: [{ msg: "Campo requerido" }] }, { status: 422 }));
  await assert.rejects(apiRequest("/sources"), /Campo requerido/);
  context.mock.restoreAll();
  const controller = new AbortController();
  context.mock.method(globalThis, "fetch", (_url: string, options: RequestInit) => new Promise((_resolve, reject) => {
    options.signal?.addEventListener("abort", () => reject(options.signal?.reason), { once: true });
  }));
  const pending = getSource("123", controller.signal);
  controller.abort();
  await assert.rejects(pending, { name: "AbortError" });
  assert.match(errorMessage(new TypeError("Failed to fetch")), /conectarnos con el servicio de fuentes/);
});

test("admite planillas y documentos con contenido, cada uno con su límite configurado", () => {
  assert.equal(validateSourceFile({ name: "datos.CSV", size: MAX_UPLOAD_BYTES }), null);
  assert.equal(validateSourceFile({ name: "datos.xlsx", size: 100 }), null);
  assert.equal(validateSourceFile({ name: "paper.pdf", size: MAX_DOCUMENT_UPLOAD_BYTES }), null);
  assert.equal(validateSourceFile({ name: "PAPER.PDF", size: 100 }), null);
  assert.equal(validateSourceFile({ name: "tabla.docx", size: 100 }), null);
  assert.match(validateSourceFile({ name: "datos.txt", size: 100 })!, /CSV, XLSX, PDF o DOCX/);
  assert.match(validateSourceFile({ name: "viejo.doc", size: 100 })!, /CSV, XLSX, PDF o DOCX/);
  assert.match(validateSourceFile({ name: "datos.csv", size: 0 })!, /vacío/);
  assert.match(validateSourceFile({ name: "paper.pdf", size: 0 })!, /vacío/);
  assert.match(validateSourceFile({ name: "datos.xlsx", size: MAX_UPLOAD_BYTES + 1 })!, /límite/);
  assert.match(validateSourceFile({ name: "paper.pdf", size: MAX_DOCUMENT_UPLOAD_BYTES + 1 })!, /límite/);
});

test("distingue documentos de planillas y nombra el idioma detectado", () => {
  assert.equal(isDocumentType("pdf"), true);
  assert.equal(isDocumentType("docx"), true);
  assert.equal(isDocumentType("csv"), false);
  assert.equal(documentLanguage("es"), "Español");
  assert.equal(documentLanguage(null), "Sin determinar");
  assert.equal(documentLanguage("fr"), "Sin determinar");
});

test("el sondeo distingue preparación, índice y fallos terminales sin perder advertencias", () => {
  assert.equal(needsSourcePolling({ ...source, processing_status: "uploaded" }), true);
  assert.equal(needsSourcePolling({ ...source, processing_status: "processing" }), true);
  assert.equal(needsSourcePolling({ ...source, semantic_index_status: "pending" }), true);
  assert.equal(needsSourcePolling({ ...source, processing_status: "ready_with_warnings", semantic_index_status: "processing" }), true);
  assert.equal(needsSourcePolling({ ...source, semantic_index_status: "failed" }), false);
  assert.equal(needsSourcePolling({ ...source, processing_status: "failed", semantic_index_status: "pending" }), false);
  assert.equal(needsSourcePolling(source), false);
  assert.equal(needsListPolling({ items: [{ ...listItem, semantic_index_status: "pending" }], total: 1, page: 1, page_size: 20 }), true);
  const report = { errors: [{ code: "no_reliable_tables", message: "Sin tablas confiables" }, { message: "Docling no pudo convertir el documento." }], semantic_index_error: "Qdrant no disponible" };
  assert.deepEqual(sourceErrors({ ...source, processing_report: report }), ["No se encontraron tablas confiables, por lo que se conserva el archivo original.", "Docling no pudo convertir el documento."]);
});
