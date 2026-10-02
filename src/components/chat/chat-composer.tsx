import { ChatIcon } from "./chat-icon";

export function ChatComposer() {
  return (
    <div className="relative z-10 mx-auto w-full max-w-[920px] shrink-0 px-4 pb-5 sm:px-8 sm:pb-8 lg:px-10 lg:pb-9">
      <div className="chat-composer flex items-end gap-3 rounded-2xl border border-border bg-surface/90 p-2.5 pl-4 transition focus-within:border-primary/55 sm:pl-5">
        <label htmlFor="chat-query" className="sr-only">Tu consulta sobre calidad del agua</label>
        <textarea
          id="chat-query"
          rows={1}
          placeholder="Escribí tu consulta sobre calidad del agua..."
          className="max-h-36 min-h-11 flex-1 resize-none bg-transparent py-3 text-sm leading-5 text-foreground outline-none placeholder:text-foreground-secondary sm:text-[15px]"
        />
        <button
          type="button"
          aria-label="Enviar consulta (vista previa)"
          title="Enviar consulta (vista previa)"
          className="send-button grid size-11 shrink-0 place-items-center rounded-xl bg-primary transition hover:bg-primary-light active:scale-95"
        >
          <ChatIcon name="send" className="size-[21px]" />
        </button>
      </div>
    </div>
  );
}
