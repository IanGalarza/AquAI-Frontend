"use client";

import { useState } from "react";
import { useConversationAction } from "@/hooks/use-conversation-action";
import { ChatIcon } from "./chat-icon";

type EditableTitleProps = {
  title: string;
  onRename?: (title: string) => Promise<void>;
};

const titleClassName = "truncate text-sm font-medium tracking-[-0.02em] sm:text-base";

export function EditableTitle({ title, onRename }: EditableTitleProps) {
  const [editing, setEditing] = useState(false);
  const { busy, error, setError, run } = useConversationAction();

  async function save(value: string) {
    const next = value.trim();
    if (busy) return;
    // Un título vacío o sin cambios no se envía: se conserva el actual.
    if (!onRename || !next || next === title || await run(() => onRename(next))) setEditing(false);
  }

  if (editing) return (
    <div className="min-w-0 flex-1">
      <input
        autoFocus
        defaultValue={title}
        maxLength={200}
        readOnly={busy}
        aria-label="Título de la conversación"
        aria-invalid={!!error}
        onFocus={(event) => event.currentTarget.select()}
        onBlur={(event) => void save(event.currentTarget.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") void save(event.currentTarget.value);
          // Con un guardado en curso, Esc no oculta su resultado ni su error.
          if (event.key !== "Escape" || busy) return;
          // Restaurar el valor evita que el blur al desmontar guarde lo descartado.
          event.currentTarget.value = title;
          setEditing(false);
        }}
        className={`${titleClassName} h-9 w-full max-w-[640px] rounded-sm border border-primary/60 bg-background/60 px-2 outline-none`}
      />
      {error && <p role="alert" title={error} className="mt-1 truncate text-[11px] text-error">{error}</p>}
    </div>
  );

  return <>
    <h2 className={titleClassName}>{title}</h2>
    {onRename && <button type="button" onClick={() => { setError(null); setEditing(true); }} aria-label="Renombrar conversación" title="Renombrar"
      className="grid size-8 shrink-0 place-items-center rounded-sm text-foreground-secondary transition hover:bg-surface-elevated/60 hover:text-primary">
      <ChatIcon name="pencil" className="size-4" />
    </button>}
  </>;
}
