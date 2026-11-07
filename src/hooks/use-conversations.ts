"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as api from "@/services/backend/conversations";
import { ApiError } from "@/services/api";
import type { ChatMessage, Conversation, LiveTurn, Message, TurnDoneEvent } from "@/types/conversations";
import { assistantSnapshot, conversationError, generationActive, generationLeaseExpired, mergeConversations, mergeMessages } from "@/utils/conversations";

const NEW = "new";
const PAGE_SIZE = 20;
type Thread = {
  conversation: Conversation | null;
  messages: ChatMessage[];
  total: number;
  oldestPage: number;
  loading: boolean;
  loadingOlder: boolean;
  checked: boolean;
  error: string | null;
  notice: string | null;
};
type Pending = { content: string; baseline: number; optimisticId: string; phase: "sending" | "checking" };

//
// Crea el estado inicial vacío de un hilo de conversación.
//
const emptyThread = (): Thread => ({ conversation: null, messages: [], total: 0, oldestPage: 1,
  loading: false, loadingOlder: false, checked: false, error: null, notice: null });

//
// Gestiona las conversaciones, sus mensajes, el envío de consultas y la selección activa.
//
export function useConversations() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectionReady, setSelectionReady] = useState(false);
  const [threads, setThreads] = useState<Record<string, Thread>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [pending, setPending] = useState<Record<string, Pending>>({});
  const pendingRef = useRef<Record<string, Pending>>({});
  const sendGuard = useRef(new Set<string>());
  const creatingRef = useRef(false);
  const [creating, setCreating] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [totalConversations, setTotalConversations] = useState(0);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [loadedPages, setLoadedPages] = useState(0);
  const pagesRef = useRef(0);
  const listController = useRef<AbortController | null>(null);
  const [olderError, setOlderError] = useState<string | null>(null);
  const [live, setLive] = useState<Record<string, LiveTurn>>({});
  const liveRef = useRef<Record<string, LiveTurn>>({});
  const [revealing, setRevealing] = useState<Record<string, number>>({});
  const [reattach, setReattach] = useState(0);
  const unfollowable = useRef(new Map<string, string | null>());
  const [detached, setDetached] = useState<Record<string, true>>({});

  const updateThread = useCallback((id: string, update: (thread: Thread) => Thread) => {
    setThreads((current) => ({ ...current, [id]: update(current[id] ?? emptyThread()) }));
  }, []);
  const updatePending = useCallback((id: string, value: Pending | null) => {
    const next = { ...pendingRef.current };
    if (value) next[id] = value;
    else delete next[id];
    pendingRef.current = next;
    setPending(next);
  }, []);
  const writeLive = useCallback((id: string, value: LiveTurn | null) => {
    const next = { ...liveRef.current };
    if (value) next[id] = value;
    else delete next[id];
    liveRef.current = next;
    setLive(next);
  }, []);
  const changeLive = useCallback((id: string, owner: string, change: ((turn: LiveTurn) => LiveTurn) | null) => {
    const current = liveRef.current[id];
    if (current?.owner === owner) writeLive(id, change && change(current));
  }, [writeLive]);
  const unfollowableNow = useCallback((message: Message) =>
    unfollowable.current.has(message.id) && unfollowable.current.get(message.id) === (message.updated_at ?? null), []);
  const navigate = useCallback((id: string | null) => {
    setSelectedId(id);
    setOlderError(null);
    const url = new URL(window.location.href);
    url.pathname = "/";
    if (id) url.searchParams.set("conversation", id);
    else url.searchParams.delete("conversation");
    if (url.href !== window.location.href) window.history.pushState(null, "", `${url.pathname}${url.search}`);
  }, []);

  const refreshList = useCallback(async (loadMore = false) => {
    listController.current?.abort();
    const controller = new AbortController();
    listController.current = controller;
    setListLoading(true);
    setListError(null);
    const lastPage = loadMore ? Math.max(1, pagesRef.current + 1) : Math.max(1, pagesRef.current);
    try {
      const pages = await Promise.all(Array.from({ length: lastPage }, (_, index) => api.listConversations(index + 1, controller.signal)));
      if (controller.signal.aborted) return;
      setConversations(mergeConversations([], pages.flatMap((page) => page.items)));
      setTotalConversations(pages[0].total);
      pagesRef.current = lastPage;
      setLoadedPages(lastPage);
    } catch (error) {
      if (!controller.signal.aborted) setListError(conversationError(error));
    } finally {
      if (!controller.signal.aborted) setListLoading(false);
    }
  }, []);

  const refreshThread = useCallback(async (id: string, signal?: AbortSignal) => {
    const [conversation, first] = await Promise.all([api.getConversation(id, signal), api.getMessages(id, 1, 1, signal)]);
    let pageNumber = Math.max(1, Math.ceil(first.total / PAGE_SIZE));
    let page = first.total ? await api.getMessages(id, pageNumber, PAGE_SIZE, signal) : { ...first, items: [] };
    const latestPage = Math.max(1, Math.ceil(page.total / PAGE_SIZE));
    if (latestPage !== pageNumber) {
      pageNumber = latestPage;
      page = await api.getMessages(id, pageNumber, PAGE_SIZE, signal);
    }
    if (signal?.aborted) return;
    updateThread(id, (current) => ({ ...current, conversation, total: page.total,
      messages: mergeMessages(current.messages, page.items, pendingRef.current[id]),
      oldestPage: current.messages.some((message) => !("optimistic" in message)) ? Math.min(current.oldestPage, pageNumber) : pageNumber,
      checked: true, loading: false, error: null }));
    setConversations((current) => mergeConversations(current, [conversation]));
    return page.items;
  }, [updateThread]);

  const finishCheck = useCallback((id: string, latest: Message[] | undefined, turn: Pending) => {
    const found = latest?.some((message) => message.role === "user" && message.sequence_number > turn.baseline && message.content === turn.content);
    if (!found) setDrafts((current) => ({ ...current, [id]: current[id] || turn.content }));
    updatePending(id, null);
    updateThread(id, (current) => ({ ...current,
      messages: current.messages.filter((message) => message.id !== turn.optimisticId), checked: true,
      notice: "Se comprobó el historial. No hay una generación activa; no se reenvió la pregunta." }));
  }, [updatePending, updateThread]);

  const turnListeners = useCallback((id: string, owner: string, sending: boolean): api.TurnListeners => ({
    started: (event) => {
      changeLive(id, owner, (turn) => ({ ...turn, messageId: event.assistant_message_id, startedAt: Date.parse(event.started_at) }));
      if (!sending) return;
      void refreshThread(id).catch(() => undefined);
      void refreshList();
    },
    stage: (event) => changeLive(id, owner, (turn) => ({ ...turn, stages: [...turn.stages, event.stage] })),
  }), [changeLive, refreshThread, refreshList]);

  const showDone = useCallback((id: string, done: TurnDoneEvent) => {
    const { message, outcome } = done;
    const notice = api.outcomeNotice(outcome);
    const structured = message && outcome === "completed" && message.presentation && assistantSnapshot(message);
    if (structured) {
      const startedAt = performance.now();
      setRevealing((current) => ({ ...current, [message.id]: startedAt }));
    }
    updateThread(id, (current) => ({ ...current, notice: notice ?? current.notice,
      messages: message ? mergeMessages(current.messages, [message]) : current.messages }));
  }, [updateThread]);

  const finishReveal = useCallback((id: string) => {
    setRevealing((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
  }, []);

  useEffect(() => {
    function readSelection() {
      if (window.location.pathname !== "/") return;
      const id = new URL(window.location.href).searchParams.get("conversation");
      setSelectedId(id);
      setSelectionReady(true);
    }
    readSelection();
    window.addEventListener("popstate", readSelection);
    void refreshList();
    return () => {
      window.removeEventListener("popstate", readSelection);
      listController.current?.abort();
    };
  }, [refreshList]);

  useEffect(() => {
    if (!selectedId) return;
    const controller = new AbortController();
    async function load() {
      updateThread(selectedId!, (current) => ({ ...current, loading: true, checked: false, error: null }));
      try {
        await refreshThread(selectedId!, controller.signal);
      } catch (error) {
        if (!controller.signal.aborted) updateThread(selectedId!, (current) => ({ ...current, loading: false, checked: false, error: conversationError(error) }));
      }
    }
    void load();
    return () => controller.abort();
  }, [selectedId, refreshThread, updateThread]);

  const key = selectedId ?? NEW;
  const thread = threads[key] ?? emptyThread();
  const conversation = thread.conversation ?? conversations.find((item) => item.id === selectedId) ?? null;
  const opening = !!selectedId && !thread.conversation && !thread.error;
  const liveTurn = live[key] ?? null;
  const activeMessage = thread.messages.find((message): message is Message => generationActive(message) &&
    (message.id === liveTurn?.messageId || !generationLeaseExpired(message)));
  const isSending = !!pending[key];
  const checking = pending[key]?.phase === "checking";
  const shouldPoll = !!selectedId && !liveTurn && (isSending || thread.messages.some(generationActive));
  const pollEvery = isSending || activeMessage ? 5_000 : 30_000;

  useEffect(() => {
    if (!selectedId || !shouldPoll) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    let knownTotal = Math.max(1, thread.total);
    let failures = 0;
    const controller = new AbortController();
    async function poll() {
      try {
        let page = await api.getMessages(selectedId!, knownTotal, 1, controller.signal);
        if (page.total > 0 && page.total !== knownTotal) page = await api.getMessages(selectedId!, page.total, 1, controller.signal);
        if (stopped) return;
        const turn = pendingRef.current[selectedId!];
        let incoming = page.items;
        let conversation: Conversation | undefined;
        if (turn && page.total > turn.baseline && page.total !== knownTotal) {
          const [previous, updated] = await Promise.all([
            api.getMessages(selectedId!, Math.max(1, page.total - 1), 1, controller.signal),
            api.getConversation(selectedId!, controller.signal),
          ]);
          incoming = [...previous.items, ...incoming];
          conversation = updated;
        }
        if (stopped) return;
        knownTotal = Math.max(1, page.total);
        failures = 0;
        const waiting = page.items.some((message) => generationActive(message) && !generationLeaseExpired(message));
        if (!waiting && turn?.phase === "checking") {
          const latest = await refreshThread(selectedId!, controller.signal);
          if (stopped) return;
          finishCheck(selectedId!, latest, turn);
          void refreshList();
        } else if (!waiting && !turn && !page.items.some(generationActive)) {
          await refreshThread(selectedId!, controller.signal);
          void refreshList();
        } else {
          updateThread(selectedId!, (current) => ({ ...current, total: page.total, conversation: conversation ?? current.conversation,
            messages: mergeMessages(current.messages, incoming, turn), error: null }));
          if (conversation) setConversations((current) => mergeConversations(current, [conversation!]));
          const followable = page.items.some((message) => generationActive(message) && !generationLeaseExpired(message) && !unfollowableNow(message));
          if (followable) setReattach((count) => count + 1);
        }
      } catch (error) {
        if (stopped) return;
        failures += 1;
        updateThread(selectedId!, (current) => ({ ...current, error: conversationError(error) }));
        if (error instanceof ApiError && [404, 422].includes(error.status)) return;
      }
      if (!stopped) timer = setTimeout(() => void poll(), Math.min(pollEvery * 2 ** Math.min(failures, 3), 30_000));
    }
    timer = setTimeout(() => void poll(), 1500);
    return () => { stopped = true; clearTimeout(timer); controller.abort(); };
  }, [selectedId, shouldPoll, pollEvery, thread.total, refreshList, refreshThread, finishCheck, updateThread, unfollowableNow]);

  const activeId = activeMessage?.id;
  const activeCreatedAt = activeMessage?.created_at;
  const activeUpdatedAt = activeMessage?.updated_at ?? null;
  useEffect(() => {
    if (!selectedId || !activeId || !activeCreatedAt || liveRef.current[selectedId]) return;
    if (unfollowable.current.has(activeId) && unfollowable.current.get(activeId) === activeUpdatedAt) return;
    const target = selectedId;
    const messageId = activeId;
    const renewedAt = activeUpdatedAt;
    const owner = `follow-${crypto.randomUUID()}`;
    const controller = new AbortController();
    writeLive(target, { owner, messageId, stages: [], startedAt: Date.parse(activeCreatedAt), cancelling: false, resumed: true });
    async function follow() {
      try {
        const done = await api.followGeneration(target, messageId, turnListeners(target, owner, false), controller.signal);
        const turn = pendingRef.current[target];
        if (turn) {
          updatePending(target, null);
          updateThread(target, (current) => ({ ...current, notice: null,
            messages: current.messages.filter((message) => message.id !== turn.optimisticId) }));
        }
        showDone(target, done);
        if (done.message) changeLive(target, owner, null);
        await refreshThread(target);
        void refreshList();
      } catch (error) {
        if (!controller.signal.aborted && error instanceof ApiError && error.status === 404) {
          unfollowable.current.set(messageId, renewedAt);
          setDetached((current) => ({ ...current, [messageId]: true }));
        }
      } finally {
        changeLive(target, owner, null);
      }
    }
    void follow();
    return () => {
      controller.abort();
      changeLive(target, owner, null);
    };
  }, [selectedId, activeId, activeCreatedAt, activeUpdatedAt, reattach, writeLive, changeLive, turnListeners, showDone, updatePending, updateThread, refreshThread, refreshList]);

  const newConversation = () => {
    updateThread(NEW, (current) => ({ ...current, notice: null }));
    navigate(null);
  };

  async function renameConversation(id: string, title: string) {
    const conversation = await api.renameConversation(id, title);
    setConversations((current) => mergeConversations(current, [conversation]));
    setThreads((current) => current[id] ? { ...current, [id]: { ...current[id], conversation } } : current);
    void refreshList();
  }

  async function deleteConversation(id: string) {
    try {
      await api.deleteConversation(id);
    } catch (error) {
      if (!(error instanceof ApiError && error.status === 404)) throw error;
    }
    setConversations((current) => current.filter((item) => item.id !== id));
    setThreads((current) => Object.fromEntries(Object.entries(current).filter(([threadId]) => threadId !== id)));
    if (id === selectedId) navigate(null);
    void refreshList();
  }

  async function send(text: string) {
    const content = text.trim();
    if (!content || content.length > 6000 || sendGuard.current.has(key) || creatingRef.current || isSending || activeMessage ||
        (selectedId && (!thread.checked || thread.loading || thread.error))) return;
    sendGuard.current.add(key);
    const optimisticId = `local-${crypto.randomUUID()}`;
    const baseline = Math.max(0, ...thread.messages.filter((message): message is Message => !("optimistic" in message)).map((message) => message.sequence_number));
    const turn: Pending = { content, baseline, optimisticId, phase: "sending" };
    let id = selectedId;
    updateThread(key, (current) => ({ ...current, messages: [...current.messages, { id: optimisticId, role: "user", content, optimistic: true }], notice: null, error: null }));
    setDrafts((current) => ({ ...current, [key]: "" }));
    try {
      if (!id) {
        creatingRef.current = true;
        setCreating(true);
        try {
          const conversation = await api.createConversation();
          id = conversation.id;
          updateThread(id, () => ({ ...emptyThread(), conversation, checked: true,
            messages: [{ id: optimisticId, role: "user", content, optimistic: true }] }));
          updateThread(NEW, () => emptyThread());
          setConversations((current) => mergeConversations(current, [conversation]));
          navigate(id);
        } finally {
          creatingRef.current = false;
          setCreating(false);
        }
      }
      const target = id;
      const owner = `send-${optimisticId}`;
      sendGuard.current.add(target);
      updatePending(target, turn);
      writeLive(target, { owner, messageId: null, stages: [], startedAt: Date.now(), cancelling: false });
      try {
        const done = await api.streamMessage(target, content, turnListeners(target, owner, true));
        showDone(target, done);
        if (done.message) changeLive(target, owner, null);
        await refreshThread(target);
        updatePending(target, null);
      } catch (error) {
        const rejected = error instanceof ApiError && !(error instanceof api.TurnError) && [404, 409, 422].includes(error.status);
        updatePending(target, { ...turn, phase: "checking" });
        updateThread(target, (current) => ({ ...current, notice: conversationError(error), checked: false,
          messages: rejected ? current.messages.filter((message) => message.id !== optimisticId) : current.messages }));
        if (rejected) setDrafts((current) => ({ ...current, [target]: current[target] || content }));
        try {
          const latest = await refreshThread(target);
          if (!latest?.some((message) => generationActive(message) && !generationLeaseExpired(message))) {
            updatePending(target, null);
            const accepted = latest?.some((message) => message.role === "user" && message.sequence_number > baseline && message.content === content);
            updateThread(target, (current) => ({ ...current, messages: current.messages.filter((message) => message.id !== optimisticId),
              notice: `${conversationError(error)}${!accepted && !rejected ? " No se encontró el turno en el historial; podés revisar la pregunta y enviarla manualmente." : ""}` }));
            if (!accepted && !rejected) setDrafts((current) => ({ ...current, [target]: current[target] || content }));
          } else {
            setReattach((count) => count + 1);
          }
        } catch (checkError) {
          updateThread(target, (current) => ({ ...current, checked: false, error: conversationError(checkError) }));
        }
      } finally {
        changeLive(target, owner, null);
      }
      void refreshList();
    } catch (error) {
      updateThread(key, (current) => ({ ...current, messages: current.messages.filter((message) => message.id !== optimisticId), notice: conversationError(error) }));
      setDrafts((current) => ({ ...current, [key]: current[key] || content }));
    } finally {
      sendGuard.current.delete(key);
      if (id) sendGuard.current.delete(id);
    }
  }

  async function cancel() {
    const turn = liveRef.current[key];
    if (!selectedId || !turn?.messageId || turn.cancelling) return;
    const target = selectedId;
    changeLive(target, turn.owner, (current) => ({ ...current, cancelling: true }));
    try {
      await api.cancelGeneration(target, turn.messageId);
    } catch (error) {
      changeLive(target, turn.owner, (current) => ({ ...current, cancelling: false }));
      updateThread(target, (current) => ({ ...current, notice: conversationError(error) }));
    }
  }

  async function checkState() {
    if (!selectedId) return;
    updateThread(selectedId, (current) => ({ ...current, loading: true, error: null }));
    try {
      const latest = await refreshThread(selectedId);
      const turn = pendingRef.current[selectedId];
      if (!latest?.some((message) => generationActive(message) && !generationLeaseExpired(message)) && turn?.phase === "checking") finishCheck(selectedId, latest, turn);
      void refreshList();
    } catch (error) {
      updateThread(selectedId, (current) => ({ ...current, loading: false, checked: false, error: conversationError(error) }));
    }
  }

  async function loadOlder() {
    if (!selectedId || thread.oldestPage <= 1 || thread.loadingOlder) return;
    const target = selectedId;
    updateThread(target, (current) => ({ ...current, loadingOlder: true }));
    setOlderError(null);
    try {
      const page = await api.getMessages(target, thread.oldestPage - 1, PAGE_SIZE);
      updateThread(target, (current) => ({ ...current, messages: mergeMessages(current.messages, page.items), oldestPage: page.page, loadingOlder: false }));
    } catch (error) {
      updateThread(target, (current) => ({ ...current, loadingOlder: false }));
      setOlderError(conversationError(error));
    }
  }

  return {
    selectedId, select: navigate, newConversation, renameConversation, deleteConversation, creating, selectionReady,
    conversations, totalConversations, loadedPages, listLoading, listError, refreshList,
    thread, conversation, opening, draft: drafts[key] ?? "", setDraft: (text: string) => setDrafts((current) => ({ ...current, [key]: text })),
    send, checkState, isSending, checking, processing: !!activeMessage || (isSending && !checking && !!liveTurn) || creating,
    sendDisabled: !selectionReady || creating || isSending || !!activeMessage || !!(selectedId && (!thread.checked || thread.loading || thread.error)),
    liveTurn, cancel, canCancel: !!liveTurn?.messageId && !liveTurn.cancelling, revealing, finishReveal, detached,
    loadOlder, olderError,
  };
}
