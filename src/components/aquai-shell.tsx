"use client";

import type { ReactNode } from "react";
import { ChatSidebar } from "./chat/chat-sidebar";
import { MobileNavigation } from "./chat/mobile-navigation";
import { ThemeToggle } from "./chat/theme-toggle";
import { WaterBackground } from "./chat/water-background";

type AquaiShellProps = {
  title: string;
  children: ReactNode;
  onNewConversation?: () => void;
  subdued?: boolean;
  sources?: boolean;
};

export function AquaiShell({ title, children, onNewConversation, subdued = false, sources = false }: AquaiShellProps) {
  return (
    <div className="aquai-chat grid h-dvh min-h-0 bg-background font-sans md:grid-cols-[270px_minmax(0,1fr)] lg:grid-cols-[292px_minmax(0,1fr)]">
      <a href={sources ? "#sources-content" : "#chat-query"} className="skip-to-chat sr-only focus:not-sr-only">
        {sources ? "Ir a las fuentes" : "Ir a la consulta"}
      </a>
      <aside aria-label="Barra lateral de AquAI" className="hidden min-h-0 border-r border-border/80 bg-surface/65 md:block">
        <ChatSidebar onNewConversation={onNewConversation} />
      </aside>
      <main className="relative isolate flex min-h-0 min-w-0 flex-col overflow-hidden">
        <WaterBackground subdued={subdued} />
        <header className="relative z-10 flex h-[72px] shrink-0 items-center justify-between gap-3 border-b border-border/65 px-4 sm:h-20 sm:px-7 lg:px-8">
          <div className="flex min-w-0 items-center gap-2">
            <MobileNavigation onNewConversation={onNewConversation} />
            <h2 className="truncate text-sm font-medium tracking-[-0.02em] sm:text-base">{title}</h2>
          </div>
          <ThemeToggle />
        </header>
        {children}
      </main>
    </div>
  );
}
