export type ChatMessage = {
  id: number;
  content: string;
};

type ChatMessagesProps = {
  messages: ChatMessage[];
};

export function ChatMessages({ messages }: ChatMessagesProps) {
  return (
    <section
      role="log"
      aria-label="Mensajes de la conversación"
      aria-live="polite"
      aria-relevant="additions"
      className="mx-auto w-full max-w-[920px] px-4 py-6 sm:px-8 sm:py-9 lg:px-10"
    >
      <ol className="space-y-4">
        {messages.map((message) => (
          <li key={message.id} data-user-message className="flex justify-end">
            <div className="max-w-[90%] rounded-md rounded-br-md border border-primary/20 bg-primary/10 px-4 py-3 text-sm leading-relaxed text-foreground sm:max-w-[78%] sm:px-5 sm:text-[15px]">
              <span className="sr-only">Vos: </span>
              <p className="whitespace-pre-wrap [overflow-wrap:anywhere]">{message.content}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
