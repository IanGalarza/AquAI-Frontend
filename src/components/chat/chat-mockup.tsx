"use client";

import { useEffect, useRef, useState } from "react";
import { ChatComposer } from "./chat-composer";
import { ChatMessages, type ChatMessage } from "./chat-messages";
import { ChatWelcome } from "./chat-welcome";
import { AquaiShell } from "../aquai-shell";

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
    <AquaiShell title="Nueva conversación" onNewConversation={startNewConversation} subdued={hasMessages}>
      <div ref={scrollRef} data-chat-scroll className="relative z-10 min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain">
        {hasMessages ? <ChatMessages messages={messages} /> : <ChatWelcome onSend={sendMessage} />}
      </div>
      <ChatComposer value={draft} onChange={setDraft} onSend={sendMessage} inputRef={inputRef} />
    </AquaiShell>
  );
}
