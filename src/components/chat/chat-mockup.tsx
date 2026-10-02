"use client";

import { useEffect, useRef, useState } from "react";
import { ChatComposer } from "./chat-composer";
import { ChatMessages, type ChatMessage } from "./chat-messages";
import { ChatSidebar } from "./chat-sidebar";
import { ChatWelcome } from "./chat-welcome";
import { MobileNavigation } from "./mobile-navigation";
import { ThemeToggle } from "./theme-toggle";
import { WaterBackground } from "./water-background";

export function ChatMockup() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const nextMessageId = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const hasMessages = messages.length > 0;

  useEffect(() => {
    const viewport = scrollRef.current;
    if (messages.length > 0 && viewport) {
      viewport.scrollTo({ top: viewport.scrollHeight, behavior: "instant" });
    }
  }, [messages.length]);

  function sendMessage(text: string) {
    const content = text.trim();
    if (!content) return;

    const message = { id: nextMessageId.current++, content };
    setMessages((current) => [...current, message]);
    setDraft("");
    inputRef.current?.focus({ preventScroll: true });
  }

  function startNewConversation() {
    setMessages([]);
    setDraft("");
    scrollRef.current?.scrollTo({ top: 0, behavior: "instant" });
    inputRef.current?.focus({ preventScroll: true });
  }

  return (
    <div className="aquai-chat grid h-dvh min-h-0 bg-background font-sans md:grid-cols-[270px_minmax(0,1fr)] lg:grid-cols-[292px_minmax(0,1fr)]">
      <a href="#chat-query" className="skip-to-chat sr-only focus:not-sr-only">Ir a la consulta</a>
      <aside aria-label="Barra lateral de AquAI" className="hidden min-h-0 border-r border-border/80 bg-surface/65 md:block">
        <ChatSidebar onNewConversation={startNewConversation} />
      </aside>
      <main className="relative isolate flex min-h-0 min-w-0 flex-col overflow-hidden">
        <WaterBackground subdued={hasMessages} />
        <header className="relative z-10 flex h-[72px] shrink-0 items-center justify-between gap-3 border-b border-border/65 px-4 sm:h-20 sm:px-7 lg:px-8">
          <div className="flex min-w-0 items-center gap-2">
            <MobileNavigation onNewConversation={startNewConversation} />
            <h2 className="truncate text-sm font-medium tracking-[-0.02em] sm:text-base">Nueva conversación</h2>
          </div>
          <ThemeToggle />
        </header>
        <div ref={scrollRef} data-chat-scroll className="relative z-10 min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain">
          {hasMessages ? <ChatMessages messages={messages} /> : <ChatWelcome onSend={sendMessage} />}
        </div>
        <ChatComposer value={draft} onChange={setDraft} onSend={sendMessage} inputRef={inputRef} />
      </main>
    </div>
  );
}
