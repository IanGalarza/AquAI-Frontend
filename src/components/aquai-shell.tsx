"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ChatIcon } from "./chat/chat-icon";
import { ChatSidebar, type ChatSidebarProps } from "./chat/chat-sidebar";
import { EditableTitle } from "./chat/editable-title";
import { MobileNavigation } from "./chat/mobile-navigation";
import { ThemeToggle } from "./chat/theme-toggle";
import { WaterBackground } from "./chat/water-background";

type AquaiShellProps = {
  title: string;
  children: ReactNode;
  onNewConversation?: () => void;
  onRename?: (title: string) => Promise<void>;
  onBack?: () => void;
  subdued?: boolean;
  sources?: boolean;
  conversationSidebar?: ChatSidebarProps;
};

export function AquaiShell({ title, children, onNewConversation, onRename, onBack, subdued = false, sources = false, conversationSidebar }: AquaiShellProps) {
  const backClassName = "inline-flex min-h-10 shrink-0 items-center gap-2 rounded-sm px-2 text-sm text-foreground-secondary transition hover:bg-surface-elevated/60 hover:text-foreground";

  return (
    <div className={`aquai-chat h-dvh min-h-0 bg-background font-sans ${sources ? "flex flex-col" : "grid md:grid-cols-[270px_minmax(0,1fr)] lg:grid-cols-[292px_minmax(0,1fr)]"}`}>
      <a href={sources ? "#sources-content" : "#chat-query"} className="skip-to-chat sr-only focus:not-sr-only">
        {sources ? "Ir a las fuentes" : "Ir a la consulta"}
      </a>
      {!sources && <aside aria-label="Barra lateral de AquAI" className="hidden min-h-0 border-r border-border/80 bg-sidebar md:block">
        <ChatSidebar {...conversationSidebar} onNewConversation={onNewConversation} />
      </aside>}
      <main className="relative isolate flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <WaterBackground subdued={subdued} />
        <header className={`relative z-10 flex shrink-0 items-center justify-between gap-3 border-b border-border/65 px-4 sm:px-7 lg:px-8 ${sources ? "h-14 sm:h-16" : "h-[72px] sm:h-20"}`}>
          <div className="flex min-w-0 flex-1 items-center gap-2">
            {sources ? <>
              {onBack ? <button type="button" onClick={onBack} aria-label="Volver al chat" className={backClassName}>
                <ChatIcon name="arrow-left" className="size-5" />
                <span className="hidden sm:inline">Volver al chat</span>
              </button> : <Link href="/" aria-label="Volver al chat" className={backClassName}>
                <ChatIcon name="arrow-left" className="size-5" />
                <span className="hidden sm:inline">Volver al chat</span>
              </Link>}
              <span aria-hidden="true" className="mx-1 h-5 border-l border-border" />
            </> : <MobileNavigation onNewConversation={onNewConversation} conversationSidebar={conversationSidebar} />}
            {/* Cambiar de conversación descarta una edición en curso: nunca renombra otro chat. */}
            <EditableTitle key={conversationSidebar?.selectedId ?? "new"} title={title} onRename={onRename} />
          </div>
          <ThemeToggle />
        </header>
        {children}
      </main>
    </div>
  );
}
