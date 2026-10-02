import { useLayoutEffect, type KeyboardEvent, type RefObject } from "react";
import { ChatIcon } from "./chat-icon";

type ChatComposerProps = {
  value: string;
  onChange: (value: string) => void;
  onSend: (message: string) => void;
  inputRef: RefObject<HTMLTextAreaElement | null>;
};

export function ChatComposer({ value, onChange, onSend, inputRef }: ChatComposerProps) {
  const canSend = value.trim().length > 0;

  useLayoutEffect(() => {
    const input = inputRef.current;
    if (!input) return;

    input.style.height = "auto";
    input.style.height = `${input.scrollHeight}px`;
  }, [value, inputRef]);

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing || event.keyCode === 229) return;

    event.preventDefault();
    if (canSend) onSend(value);
  }

  return (
    <div className="relative z-10 mx-auto w-full max-w-[920px] shrink-0 px-4 pb-5 sm:px-8 sm:pb-8 lg:px-10 lg:pb-9">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (canSend) onSend(value);
        }}
        className="chat-composer flex items-end gap-3 rounded-2xl border border-border bg-surface/90 p-2.5 pl-4 transition focus-within:border-primary/55 sm:pl-5"
      >
        <label htmlFor="chat-query" className="sr-only">Tu consulta sobre calidad del agua</label>
        <textarea
          ref={inputRef}
          id="chat-query"
          value={value}
          onChange={(event) => onChange(event.currentTarget.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          enterKeyHint="send"
          placeholder="Escribí tu consulta sobre calidad del agua..."
          className="max-h-36 min-h-11 min-w-0 flex-1 resize-none bg-transparent py-3 text-sm leading-5 text-foreground outline-none placeholder:text-foreground-secondary sm:text-[15px]"
        />
        <button
          type="submit"
          disabled={!canSend}
          aria-label="Enviar consulta"
          title="Enviar consulta"
          className="send-button grid size-11 shrink-0 place-items-center rounded-xl bg-primary transition enabled:hover:bg-primary-light enabled:active:scale-95 disabled:cursor-default disabled:opacity-40"
        >
          <ChatIcon name="send" className="size-[21px]" />
        </button>
      </form>
    </div>
  );
}
