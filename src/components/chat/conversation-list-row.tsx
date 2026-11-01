import { useState } from "react";
import { useConversationAction } from "@/hooks/use-conversation-action";
import type { Conversation } from "@/types/conversations";
import { ChatIcon } from "./chat-icon";
import { ConfirmDialog } from "./confirm-dialog";

type ConversationListRowProps = {
  conversation: Conversation;
  selected: boolean;
  onSelect: () => void;
  onDelete?: () => Promise<void>;
};

//
// Muestra una conversación del listado con su acción de eliminar con confirmación.
//
export function ConversationListRow({ conversation, selected, onSelect, onDelete }: ConversationListRowProps) {
  const [confirming, setConfirming] = useState(false);
  const { busy, error, setError, run } = useConversationAction();

  return (
    <li className={`group flex items-center rounded-sm transition hover:bg-surface-elevated/60 ${selected ? "bg-primary/10 ring-1 ring-inset ring-primary/20" : ""}`}>
      <button
        type="button"
        onClick={onSelect}
        aria-current={selected ? "page" : undefined}
        title={conversation.title}
        className="flex min-h-12 min-w-0 flex-1 items-center gap-3 px-2.5 py-3 text-left text-[13px] text-foreground/90"
      >
        <ChatIcon name="message" className="size-[18px] shrink-0 text-foreground-secondary" />
        <span className="min-w-0 truncate">{conversation.title}</span>
      </button>
      {onDelete && <>
        <button type="button" onClick={() => { setError(null); setConfirming(true); }} aria-label={`Eliminar ${conversation.title}`} aria-haspopup="dialog" title="Eliminar"
          className={`mr-1 ${confirming ? "grid" : "hidden"} size-8 shrink-0 place-items-center rounded-sm text-foreground-secondary transition hover:text-error group-hover:grid group-focus-within:grid pointer-coarse:grid`}>
          <ChatIcon name="trash" className="size-4" />
        </button>
        {confirming && <ConfirmDialog title="Eliminar conversación" busy={busy} error={error}
          onConfirm={() => void run(onDelete)} onCancel={() => setConfirming(false)}>
          ¿Estás seguro de que deseas eliminar «{conversation.title}»? Se borrarán todos sus mensajes.
        </ConfirmDialog>}
      </>}
    </li>
  );
}
