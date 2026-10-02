import { ChatComposer } from "./chat-composer";
import { ChatSidebar } from "./chat-sidebar";
import { ChatWelcome } from "./chat-welcome";
import { MobileNavigation } from "./mobile-navigation";
import { ThemeToggle } from "./theme-toggle";
import { WaterBackground } from "./water-background";

export function ChatMockup() {
  return (
    <div className="aquai-chat grid min-h-svh bg-background font-sans md:h-dvh md:grid-cols-[270px_minmax(0,1fr)] lg:grid-cols-[292px_minmax(0,1fr)]">
      <a href="#chat-query" className="skip-to-chat sr-only focus:not-sr-only">Ir a la consulta</a>
      <aside aria-label="Barra lateral de AquAI" className="hidden min-h-0 border-r border-border/80 bg-surface/65 md:block">
        <ChatSidebar />
      </aside>
      <main className="relative isolate flex min-h-svh min-w-0 flex-col overflow-x-hidden overflow-y-auto md:min-h-0">
        <WaterBackground />
        <header className="relative z-10 flex h-[72px] shrink-0 items-center justify-between gap-3 border-b border-border/65 px-4 sm:h-20 sm:px-7 lg:px-8">
          <div className="flex min-w-0 items-center gap-2">
            <MobileNavigation />
            <h2 className="truncate text-sm font-medium tracking-[-0.02em] sm:text-base">Nueva conversación</h2>
          </div>
          <ThemeToggle />
        </header>
        <ChatWelcome />
        <ChatComposer />
      </main>
    </div>
  );
}
