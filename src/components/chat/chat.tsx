"use client";

import { useEffect, useRef } from "react";
import { useConversations } from "@/hooks/use-conversations";
import { useFollowScroll } from "@/hooks/use-follow-scroll";
import { AquaiShell } from "../aquai-shell";
import { ChatComposer } from "./chat-composer";
import { ChatMessages } from "./chat-messages";
import { ChatWelcome } from "./chat-welcome";

//
// Muestra el chat completo: conversación activa, mensajes, bienvenida y campo de envío.
//
export function Chat() {
  const chat = useConversations();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollHeight = useRef(0);
  const previousView = useRef({ conversation: "", first: "", last: "" });
  const { thread } = chat;
  const hasMessages = thread.messages.length > 0;
  const loading = !chat.selectionReady || chat.opening;
  const conversationId = chat.conversation?.id;
  const lastMessage = thread.messages.at(-1);
  const lastKey = lastMessage ? `${lastMessage.id}:${"status" in lastMessage ? lastMessage.status.name : "local"}` : "";

  useEffect(() => {
    const viewport = scrollRef.current;
    if (!viewport) return;
    const firstId = thread.messages[0]?.id ?? "";
    const conversation = chat.selectedId ?? "new";
    const previous = previousView.current;
    if (previous.conversation === conversation && previous.first === firstId && previous.last === lastKey) return;
    if (previous.conversation === conversation && previous.first && firstId !== previous.first && previous.last === lastKey && scrollHeight.current > 0) {
      viewport.scrollTop += viewport.scrollHeight - scrollHeight.current;
    } else if (hasMessages) viewport.scrollTo({ top: viewport.scrollHeight, behavior: "instant" });
    previousView.current = { conversation, first: firstId, last: lastKey };
    scrollHeight.current = viewport.scrollHeight;
  }, [lastKey, thread.messages, hasMessages, chat.selectedId]);

  useFollowScroll(scrollRef, `${chat.selectedId ?? "new"}:${hasMessages}`);

  return <AquaiShell title={chat.conversation?.title ?? (loading ? "" : chat.selectedId ? "Conversación" : "Nueva conversación")}
    onNewConversation={chat.newConversation} subdued={hasMessages || !!(chat.opening && chat.conversation?.last_message_at)}
    onRename={conversationId ? (title) => chat.renameConversation(conversationId, title) : undefined}
    conversationSidebar={{ conversations: chat.conversations, selectedId: chat.selectedId, onSelect: chat.select,
      onDelete: chat.deleteConversation,
      loading: chat.listLoading, error: chat.listError, creating: chat.creating,
      hasMore: chat.loadedPages * 20 < chat.totalConversations,
      onLoadMore: () => void chat.refreshList(true), onRefresh: () => void chat.refreshList() }}>
    <div ref={scrollRef} data-chat-scroll className="relative z-10 min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain">
      {thread.oldestPage > 1 && <div className="px-4 pt-5 text-center">
        <button type="button" disabled={thread.loadingOlder} onClick={() => {
          scrollHeight.current = scrollRef.current?.scrollHeight ?? 0;
          void chat.loadOlder();
        }} className="rounded-sm border border-border bg-surface/80 px-4 py-2 text-xs text-foreground-secondary transition hover:border-primary/50 disabled:opacity-50">
          {thread.loadingOlder ? "Cargando mensajes…" : "Cargar mensajes anteriores"}
        </button>
        {chat.olderError && <p role="alert" className="mt-2 text-xs text-error">{chat.olderError}</p>}
      </div>}
      {hasMessages ? <ChatMessages messages={thread.messages} processing={chat.processing} checking={chat.checking}
        liveTurn={chat.liveTurn} revealing={chat.revealing} onRevealed={chat.finishReveal} detached={chat.detached} /> :
        loading ? <p role="status" className="px-4 py-6 text-center text-sm text-foreground-secondary">Cargando conversación…</p> :
        !thread.error && <ChatWelcome onSend={(text) => void chat.send(text)} disabled={chat.sendDisabled} />}
    </div>
    {(thread.error || thread.notice) && <div role={thread.error ? "alert" : "status"} className="relative z-10 mx-auto w-full max-w-[920px] px-4 pb-3 sm:px-8 lg:px-10">
      <div className={`flex flex-wrap items-center justify-between gap-2 rounded-sm border bg-surface/95 px-3.5 py-3 text-xs ${thread.error ? "border-error/35 text-error" : "border-warning/35 text-warning"}`}>
        <p className="min-w-0 flex-1 [overflow-wrap:anywhere]">{thread.error ?? thread.notice}</p>
        {chat.selectedId && <button type="button" disabled={thread.loading} onClick={() => void chat.checkState()} className="rounded-sm border border-current/25 px-2 py-1.5 font-medium disabled:opacity-50">Comprobar estado</button>}
      </div>
    </div>}
    <ChatComposer value={chat.draft} onChange={chat.setDraft} onSend={(text) => void chat.send(text)} inputRef={inputRef}
      disabled={chat.sendDisabled} processing={chat.processing} onCancel={chat.liveTurn ? () => void chat.cancel() : undefined}
      canCancel={chat.canCancel} cancelling={chat.liveTurn?.cancelling} />
  </AquaiShell>;
}
