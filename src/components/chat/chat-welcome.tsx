import { AquaiMark } from "./aquai-brand";

const suggestions = [
  "Analizá esta tabla de calidad del agua",
  "Compará pH y turbidez entre campañas",
  "Buscá normativa o antecedentes sobre cianobacterias",
];

type ChatWelcomeProps = {
  onSend: (message: string) => void;
};

export function ChatWelcome({ onSend }: ChatWelcomeProps) {
  return (
    <section aria-labelledby="welcome-title" className="chat-welcome relative z-10 flex min-h-full flex-col items-center justify-center px-5 py-10 text-center sm:px-8">
      <div className="welcome-mark mb-6">
        <AquaiMark large />
      </div>
      <h1 id="welcome-title" className="text-[30px] leading-tight font-medium tracking-[-0.045em] sm:text-[38px] lg:text-[42px]">
        Hola, soy <span className="aquai-accent font-semibold">AquAI</span>
      </h1>
      <p className="mt-4 max-w-[490px] text-sm leading-relaxed text-foreground-secondary sm:text-[16px] sm:leading-7">
        Preguntame sobre la calidad del agua, analizá tus datos,
        <br className="hidden sm:block" /> y consultá normativa y antecedentes.
      </p>
      <div className="mt-7 flex w-full max-w-[540px] flex-col items-center gap-2.5 sm:mt-8">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => onSend(suggestion)}
            className="suggestion-pill w-full rounded-2xl border border-primary/25 bg-surface/55 px-5 py-3 text-[13px] leading-5 text-foreground/90 transition duration-200 hover:border-primary/60 hover:bg-primary/5 sm:w-auto sm:min-w-[390px] sm:rounded-full sm:px-7 sm:text-sm"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </section>
  );
}
