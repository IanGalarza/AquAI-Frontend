import { useId } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AquaiBrand } from "./aquai-brand";
import { ChatIcon } from "./chat-icon";

const recentConversations = [
  "pH en Laguna Chascomús",
  "Turbidez en 2023",
  "Comparar cianobacterias",
  "Normativa de agua",
];

type ChatSidebarProps = {
  onNewConversation?: () => void;
  onSourcesNavigate?: () => void;
};

export function ChatSidebar({ onNewConversation, onSourcesNavigate }: ChatSidebarProps) {
  const searchId = useId();
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="chat-sidebar flex h-full min-h-0 flex-col px-5 pb-6 pt-7 lg:px-6 lg:pb-7 lg:pt-8">
      <div className="mb-8 pl-2">
        <AquaiBrand />
      </div>

      <button
        type="button"
        onClick={() => onNewConversation ? onNewConversation() : router.push("/")}
        className="new-conversation flex min-h-12 w-full items-center justify-center gap-2.5 rounded-xl bg-primary px-3 py-3 text-sm font-semibold transition duration-200 hover:bg-primary-light active:scale-[0.99]"
      >
        <ChatIcon name="plus" className="size-[18px]" />
        Nueva conversación
      </button>

      <div className="chat-search mt-4 flex items-center gap-2.5 rounded-xl border border-border bg-background/40 px-3.5 transition focus-within:border-primary/60">
        <ChatIcon name="search" className="size-[18px] shrink-0 text-foreground-secondary" />
        <label htmlFor={searchId} className="sr-only">Buscar conversaciones</label>
        <input
          id={searchId}
          type="search"
          placeholder="Buscar conversaciones..."
          className="h-12 w-full min-w-0 bg-transparent text-[13px] text-foreground outline-none placeholder:text-foreground-secondary"
          autoComplete="off"
        />
      </div>

      <nav aria-label="Conversaciones recientes" className="mt-8 flex-1 overflow-y-auto">
        <h2 className="mb-3 px-2 text-[11px] font-semibold tracking-[0.18em] text-foreground-secondary">
          RECIENTES
        </h2>
        <ul className="space-y-1">
          {recentConversations.map((conversation) => (
            <li key={conversation}>
              <button
                type="button"
                className="flex min-h-12 w-full items-center gap-3 rounded-lg px-2.5 py-3 text-left text-[13px] text-foreground/90 transition hover:bg-surface-elevated/60"
              >
                <ChatIcon name="message" className="size-[18px] shrink-0 text-foreground-secondary" />
                <span>{conversation}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <Link
        href="/sources"
        onClick={onSourcesNavigate}
        aria-current={pathname === "/sources" ? "page" : undefined}
        className="sources-button mt-6 flex min-h-14 w-full shrink-0 items-center justify-center gap-3 rounded-xl border border-primary/50 bg-primary/5 px-3 py-3.5 text-sm font-medium transition hover:border-primary hover:bg-primary/10"
      >
        <ChatIcon name="database" className="size-[22px] text-primary" />
        Administrar fuentes
      </Link>
    </div>
  );
}
