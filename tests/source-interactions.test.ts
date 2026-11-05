import assert from "node:assert/strict";
import { test, type TestContext } from "node:test";
import { act, createElement, useState, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { JSDOM } from "jsdom";
import { SourceListRow } from "../src/components/sources/source-list-row";
import { SourceNotice } from "../src/components/sources/source-notice";
import { useSourceActivation } from "../src/hooks/use-source-activation";
import { useSourceResource } from "../src/hooks/use-source-resource";
import { NOTICE_DURATION_MS, useTransientNotice } from "../src/hooks/use-transient-notice";
import type { SourceActivation, SourceListItem } from "../src/types/sources";

type Deferred<T> = { promise: Promise<T>; resolve: (value: T) => void; reject: (reason: unknown) => void };
type ActivationRequest = (id: string, active: boolean, signal?: AbortSignal) => Promise<SourceActivation>;

//
// Crea una promesa que la prueba resuelve o rechaza en el momento que necesita.
//
function deferred<T>(): Deferred<T> {
  let resolve!: Deferred<T>["resolve"];
  let reject!: Deferred<T>["reject"];
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

//
// Monta un hook en un DOM de prueba, con soporte de popover, y lo desmonta al terminar.
//
async function renderHook<T>(context: TestContext, callback: () => T, view?: (value: T) => ReactNode) {
  const dom = new JSDOM("<!doctype html><div id='root'></div>", { url: "http://localhost/" });
  const globals = { window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true };
  const previous = new Map(Object.keys(globals).map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  const container = dom.window.document.getElementById("root")!;
  const root = createRoot(container);
  const openPopovers = new WeakSet<Element>();
  const matches = dom.window.Element.prototype.matches;
  dom.window.HTMLElement.prototype.showPopover = function (this: HTMLElement) { openPopovers.add(this); };
  dom.window.HTMLElement.prototype.hidePopover = function (this: HTMLElement) { openPopovers.delete(this); };
  dom.window.Element.prototype.matches = function (this: Element, selector: string) {
    return selector === ":popover-open" ? openPopovers.has(this) : matches.call(this, selector);
  };
  let current!: T;
  let mounted = true;

  async function unmount() {
    if (!mounted) return;
    mounted = false;
    await act(async () => root.unmount());
  }

  context.after(async () => {
    await unmount();
    dom.window.close();
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  });

  function Harness() { current = callback(); return view?.(current) ?? null; }
  await act(async () => root.render(createElement(Harness)));

  return { get current() { return current; }, container, unmount };
}

const confirmed = (id: string, isActive: boolean): SourceActivation => ({
  id, isActive, queryable: isActive, processing_status: "ready", semantic_index_status: "pending",
});

test("el guardado espera la respuesta y bloquea solicitudes repetidas de inmediato", async (context) => {
  const response = deferred<SourceActivation>();
  const calls: { id: string; active: boolean }[] = [];
  const successes: SourceActivation[] = [];
  const hook = await renderHook(context, () => useSourceActivation({
    request: async (id, active) => { calls.push({ id, active }); return response.promise; },
    onSuccess: (source) => successes.push(source), onError: (error) => assert.fail(String(error)),
  }));
  let operation!: Promise<void>;
  await act(async () => {
    operation = hook.current.toggle({ id: "a", isActive: true });
    void hook.current.toggle({ id: "a", isActive: true });
    void hook.current.toggle({ id: "a", isActive: true });
  });
  assert.equal(hook.current.pending.has("a"), true);
  assert.deepEqual(calls, [{ id: "a", active: false }]);
  assert.deepEqual(successes, []);
  await act(async () => { response.resolve(confirmed("a", false)); await operation; });
  assert.equal(hook.current.pending.size, 0);
  assert.deepEqual(successes, [confirmed("a", false)]);
});

test("si falla el guardado se retira la espera y se informa el error", async (context) => {
  const response = deferred<SourceActivation>();
  const errors: unknown[] = [];
  const hook = await renderHook(context, () => useSourceActivation({
    request: () => response.promise, onSuccess: () => assert.fail("No debe confirmar un fallo"),
    onError: (error) => errors.push(error),
  }));
  let operation!: Promise<void>;
  await act(async () => { operation = hook.current.toggle({ id: "a", isActive: false }); });
  assert.equal(hook.current.pending.has("a"), true);
  const error = new Error("No se pudo guardar");
  await act(async () => { response.reject(error); await operation; });
  assert.equal(hook.current.pending.size, 0);
  assert.deepEqual(errors, [error]);
});

test("las fuentes independientes pueden guardar en paralelo sin compartir el bloqueo", async (context) => {
  const responses: Record<string, Deferred<SourceActivation>> = { a: deferred(), b: deferred() };
  const successes: string[] = [];
  const hook = await renderHook(context, () => useSourceActivation({
    request: (id) => responses[id].promise,
    onSuccess: (source) => successes.push(source.id), onError: (error) => assert.fail(String(error)),
  }));
  let first!: Promise<void>;
  let second!: Promise<void>;
  await act(async () => {
    first = hook.current.toggle({ id: "a", isActive: true });
    second = hook.current.toggle({ id: "b", isActive: false });
  });
  assert.deepEqual([...hook.current.pending], ["a", "b"]);
  await act(async () => { responses.b.resolve(confirmed("b", true)); await second; });
  assert.deepEqual([...hook.current.pending], ["a"]);
  await act(async () => { responses.a.resolve(confirmed("a", false)); await first; });
  assert.deepEqual(successes, ["b", "a"]);
});

//
// Monta una fila del listado conectada a la activación real.
//
async function renderSourceRow(
  context: TestContext,
  active: boolean,
  request: ActivationRequest,
  onError: (error: unknown) => void = (error) => assert.fail(String(error)),
) {
  return renderHook(context, () => {
    const [source, setSource] = useState<SourceListItem>({
      id: "a", name: "Medidas.xlsx", isActive: active,
      file_type: "xlsx", file_size_bytes: 13000, dataset_count: 3,
      created_at: "2026-10-14T18:38:00-03:00",
      processing_status: "ready_with_warnings", semantic_index_status: "ready",
    });
    const activation = useSourceActivation({
      request, onError, onSuccess: (updated) => setSource((current) => ({ ...current, ...updated })),
    });
    return { source, ...activation };
  }, (value) => createElement("ul", null, createElement(SourceListRow, {
    source: value.source, busy: value.pending.has(value.source.id),
    onSelect: () => {}, onToggle: () => void value.toggle(value.source),
  })));
}

//
// Devuelve la celda con el estado de búsqueda de una fila.
//
function searchBadge(container: Element): Element {
  const label = Array.from(container.querySelectorAll("dt")).find((item) => item.textContent === "Búsqueda");
  return label!.nextElementSibling!;
}

for (const initialActive of [true, false]) {
  test(`el interruptor conserva el estado ${initialActive ? "activo" : "inactivo"} con spinner hasta recibir confirmación`, async (context) => {
    const response = deferred<SourceActivation>();
    const calls: boolean[] = [];
    const hook = await renderSourceRow(context, initialActive, async (_id, active) => {
      calls.push(active);
      return response.promise;
    });
    const button = hook.container.querySelector<HTMLButtonElement>("[role='switch']")!;
    await act(async () => { button.click(); button.click(); });
    assert.equal(button.getAttribute("aria-checked"), String(initialActive));
    assert.equal(button.getAttribute("aria-busy"), "true");
    assert.equal(button.disabled, true);
    assert.ok(button.querySelector(".animate-spin"));
    assert.match(button.textContent!, /Guardando/);
    assert.equal(searchBadge(hook.container).textContent, initialActive ? "Disponible" : "Desactivada");
    assert.deepEqual(calls, [!initialActive]);
    await act(async () => {
      response.resolve({ ...confirmed("a", !initialActive), semantic_index_status: "ready" });
      await response.promise;
    });
    assert.equal(button.getAttribute("aria-checked"), String(!initialActive));
    assert.equal(button.getAttribute("aria-busy"), "false");
    assert.equal(button.disabled, false);
    assert.equal(button.querySelector(".animate-spin"), null);
    assert.equal(searchBadge(hook.container).textContent, initialActive ? "Desactivada" : "Disponible");
  });
}

test("un guardado fallido conserva el interruptor y la disponibilidad confirmados", async (context) => {
  const response = deferred<SourceActivation>();
  const errors: unknown[] = [];
  const hook = await renderSourceRow(context, true, () => response.promise, (error) => errors.push(error));
  const button = hook.container.querySelector<HTMLButtonElement>("[role='switch']")!;
  await act(async () => button.click());
  const error = new Error("No se pudo guardar");
  await act(async () => { response.reject(error); await response.promise.catch(() => {}); });
  assert.equal(button.getAttribute("aria-checked"), "true");
  assert.equal(button.disabled, false);
  assert.equal(button.querySelector(".animate-spin"), null);
  assert.equal(searchBadge(hook.container).textContent, "Disponible");
  assert.deepEqual(errors, [error]);
});

test("una fuente desactivada con índice preparado no aparece como disponible", async (context) => {
  const hook = await renderSourceRow(context, false, async () => assert.fail("No debe modificar la fuente"));
  const badge = searchBadge(hook.container);
  assert.equal(badge.textContent, "Desactivada");
  assert.equal(badge.querySelector(".source-status-ready"), null);
  assert.equal(hook.container.querySelector("[role='switch']")!.getAttribute("aria-checked"), "false");
});

test("cerrar la vista cancela el guardado y evita notificaciones tardías", async (context) => {
  const response = deferred<SourceActivation>();
  let signal: AbortSignal | undefined;
  const hook = await renderHook(context, () => useSourceActivation({
    request: (_id, _active, currentSignal) => { signal = currentSignal; return response.promise; },
    onSuccess: () => assert.fail("La vista ya se cerró"), onError: () => assert.fail("No debe avisar una cancelación"),
  }));
  let operation!: Promise<void>;
  await act(async () => { operation = hook.current.toggle({ id: "a", isActive: true }); });
  await hook.unmount();
  assert.equal(signal?.aborted, true);
  response.resolve(confirmed("a", false));
  await operation;
});

test("una lectura anterior no revierte una activación confirmada", async (context) => {
  const oldRead = deferred<{ active: boolean }>();
  const revalidation = deferred<{ active: boolean }>();
  const signals: AbortSignal[] = [];
  const request = (signal: AbortSignal) => {
    signals.push(signal);
    return signals.length === 1 ? Promise.resolve({ active: true }) : signals.length === 2 ? oldRead.promise : revalidation.promise;
  };
  const shouldPoll = () => false;
  const hook = await renderHook(context, () => useSourceResource("catalog", request, shouldPoll));
  await act(async () => hook.current.refresh());
  await act(async () => hook.current.update((data) => ({ ...data, active: false })));
  assert.equal(signals[1].aborted, true);
  assert.equal(hook.current.data?.active, false);
  await act(async () => oldRead.resolve({ active: true }));
  assert.equal(hook.current.data?.active, false);
  await act(async () => revalidation.resolve({ active: false }));
  assert.equal(hook.current.data?.active, false);
});

test("la notificación vence y una nueva notificación recibe su propio plazo", async (context) => {
  const hook = await renderHook(context, () => useTransientNotice());
  context.mock.timers.enable({ apis: ["setTimeout"] });
  await act(async () => hook.current.show("Fuente desactivada."));
  await act(async () => context.mock.timers.tick(2000));
  await act(async () => hook.current.show("Fuente activada."));
  await act(async () => context.mock.timers.tick(NOTICE_DURATION_MS - 2000));
  assert.equal(hook.current.notice?.message, "Fuente activada.");
  await act(async () => context.mock.timers.tick(2000));
  assert.equal(hook.current.notice, null);
});

test("cerrar una notificación limpia su plazo sin afectar la siguiente", async (context) => {
  const hook = await renderHook(context, () => useTransientNotice());
  context.mock.timers.enable({ apis: ["setTimeout"] });
  await act(async () => hook.current.show("Fuente desactivada."));
  await act(async () => context.mock.timers.tick(2000));
  await act(async () => hook.current.dismiss());
  assert.equal(hook.current.notice, null);
  await act(async () => hook.current.show("No se pudo guardar.", "error"));
  await act(async () => context.mock.timers.tick(2500));
  assert.deepEqual(hook.current.notice, { id: 1, message: "No se pudo guardar.", tone: "error" });
  await act(async () => context.mock.timers.tick(2000));
  assert.equal(hook.current.notice, null);
});

test("la alerta abre un popover accesible y se cierra al vencer o al pulsar la cruz", async (context) => {
  const hook = await renderHook(context, () => useTransientNotice(), (value) => createElement(SourceNotice, {
    notice: value.notice, onDismiss: value.dismiss,
  }));
  context.mock.timers.enable({ apis: ["setTimeout"] });
  await act(async () => hook.current.show("Fuente desactivada."));
  const popover = hook.container.querySelector("[popover]")!;
  assert.equal(popover.matches(":popover-open"), true);
  assert.equal(popover.getAttribute("role"), "status");
  assert.match(popover.textContent!, /Fuente desactivada\./);
  await act(async () => context.mock.timers.tick(NOTICE_DURATION_MS));
  assert.equal(popover.matches(":popover-open"), false);
  await act(async () => hook.current.show("Fuente activada."));
  await act(async () => hook.container.querySelector("button")!.click());
  assert.equal(popover.matches(":popover-open"), false);
  assert.equal(hook.current.notice, null);
});
