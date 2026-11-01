import { useId, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AquaiBrand } from "./aquai-brand";
import { ChatIcon } from "./chat-icon";
import { ConversationListRow } from "./conversation-list-row";
import type { Conversation } from "@/types/conversations";

export type ChatSidebarProps = {
  onNewConversation?: () => void;
  onSourcesNavigate?: () => void;
  conversations?: Conversation[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  onDelete?: (id: string) => Promise<void>;
  loading?: boolean;
  creating?: boolean;
  error?: string | null;
  hasMore?: boolean;
  onLoadMore?: () => void;
  onRefresh?: () => void;
};

//
// Muestra la barra lateral con conversaciones, búsqueda y acceso a las fuentes.
//
export function ChatSidebar({ onNewConversation, onSourcesNavigate, conversations = [], selectedId, onSelect, onDelete,
  loading = false, creating = false, error, hasMore = false, onLoadMore, onRefresh }: ChatSidebarProps) {
  const searchId = useId();
  const pathname = usePathname();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const matching = conversations.filter((conversation) => conversation.title.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));

  return (
    <div className="chat-sidebar flex h-full min-h-0 flex-col px-5 pb-6 pt-7 lg:px-6 lg:pb-7 lg:pt-8">
      <div className="mb-8 pl-2">
        <AquaiBrand />
      </div>

      <button
        type="button"
        onClick={() => onNewConversation ? onNewConversation() : router.push("/")}
        disabled={creating}
        className="new-conversation flex min-h-12 w-full items-center justify-center gap-2.5 rounded-sm bg-action px-3 py-3 text-sm font-semibold transition duration-200 enabled:hover:bg-action-hover enabled:active:scale-[0.99] disabled:opacity-50"
      >
        <ChatIcon name="plus" className="size-[18px]" />
        {creating ? "Creando conversación…" : "Nueva conversación"}
      </button>

      <div className="chat-search mt-4 flex items-center gap-2.5 rounded-sm border border-border bg-background/40 px-3.5 transition focus-within:border-primary/60">
        <ChatIcon name="search" className="size-[18px] shrink-0 text-foreground-secondary" />
        <label htmlFor={searchId} className="sr-only">Buscar entre las conversaciones cargadas</label>
        <input
          id={searchId}
          type="search"
          value={search}
          onChange={(event) => setSearch(event.currentTarget.value)}
          placeholder="Buscar conversaciones..."
          className="h-12 w-full min-w-0 bg-transparent text-[13px] text-foreground outline-none placeholder:text-foreground-secondary"
          autoComplete="off"
        />
      </div>

      <nav aria-label="Conversaciones recientes" className="mt-8 flex-1 overflow-y-auto">
        <div className="mb-3 flex items-center justify-between px-2">
          <h2 className="text-[11px] font-semibold tracking-[0.18em] text-foreground-secondary">RECIENTES</h2>
          {onRefresh && <button type="button" onClick={onRefresh} disabled={loading} aria-label="Actualizar conversaciones" className="rounded-sm p-1 text-foreground-secondary hover:text-primary disabled:opacity-40"><ChatIcon name="refresh" className="size-3.5" /></button>}
        </div>
        {search.trim() && hasMore && <p className="mb-3 px-2 text-[11px] leading-relaxed text-foreground-secondary">Búsqueda entre conversaciones cargadas. Cargá más para ampliar la búsqueda.</p>}
        {!conversations.length && !loading && !error && <p className="px-2 py-3 text-xs leading-relaxed text-foreground-secondary">Todavía no hay conversaciones. Creá una para comenzar.</p>}
        {!!conversations.length && !matching.length && <p className="px-2 py-3 text-xs text-foreground-secondary">Sin coincidencias en las conversaciones cargadas.</p>}
        <ul className="space-y-1">
          {matching.map((conversation) => (
            <ConversationListRow
              key={conversation.id}
              conversation={conversation}
              selected={selectedId === conversation.id}
              onSelect={() => onSelect ? onSelect(conversation.id) : router.push(`/?conversation=${encodeURIComponent(conversation.id)}`)}
              onDelete={onDelete && (() => onDelete(conversation.id))}
            />
          ))}
        </ul>
        {loading && <p role="status" className="px-2 py-3 text-xs text-foreground-secondary">Cargando conversaciones…</p>}
        {error && <div role="alert" className="px-2 py-3 text-xs leading-relaxed text-error"><p>{error}</p>{onRefresh && <button type="button" onClick={onRefresh} disabled={loading} className="mt-2 underline underline-offset-4">Volver a cargar</button>}</div>}
        {hasMore && <button type="button" disabled={loading} onClick={onLoadMore} className="mt-3 min-h-9 w-full rounded-sm border border-border px-2 py-2 text-xs text-foreground-secondary hover:border-primary/50 disabled:opacity-50">Cargar más conversaciones</button>}
      </nav>

      <Link
        href="/sources"
        scroll={false}
        onClick={onSourcesNavigate}
        aria-current={pathname === "/sources" ? "page" : undefined}
        className="sources-button mt-6 flex min-h-14 w-full shrink-0 items-center justify-center gap-3 rounded-sm border border-primary/50 bg-primary/5 px-3 py-3.5 text-sm font-medium transition hover:border-primary hover:bg-primary/10"
      >
        <ChatIcon name="database" className="size-[22px] text-primary" />
        Administrar fuentes
      </Link>
    </div>
  );
}
