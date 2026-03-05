import { useState, useRef, useEffect } from "react";

interface Turn {
  role: "user" | "assistant";
  content: string;
}

interface ConversationViewProps {
  turns: Turn[];
  onSend: (message: string) => void;
  isLoading: boolean;
  onFinish: () => void;
  onStartWriting?: () => void;
}

export function ConversationView({
  turns,
  onSend,
  isLoading,
  onFinish,
  onStartWriting,
}: ConversationViewProps) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [turns, isLoading]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    onSend(trimmed);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const canFinish = turns.filter((t) => t.role === "user").length >= 2;

  return (
    <div className="border border-[rgba(26,26,26,0.12)] bg-[rgba(255,255,255,0.5)] flex flex-col h-[480px]">
      {/* Messages area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-3"
      >
        {turns.length === 0 && !isLoading && (
          <p className="text-base text-[var(--ink-light)] italic text-center mt-12 display-title">
            Start writing — your coach will respond.
          </p>
        )}

        {turns.map((turn, i) => (
          <div
            key={i}
            className={`flex ${turn.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] px-4 py-2.5 text-base leading-relaxed ${
                turn.role === "user"
                  ? "bg-[var(--ink)] text-[var(--paper)]"
                  : "border border-[rgba(26,26,26,0.1)] text-[var(--ink)] bg-[rgba(255,255,255,0.4)]"
              }`}
            >
              {turn.content}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="border border-[rgba(26,26,26,0.1)] text-[var(--ink-light)] px-4 py-2.5 text-base">
              <span className="inline-flex gap-1 animate-pulse">
                <span>.</span>
                <span>.</span>
                <span>.</span>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Finish link */}
      {canFinish && (
        <div className="px-5 pb-2">
          <button
            onClick={onFinish}
            className="text-sm text-[var(--ink-light)] underline underline-offset-[3px] hover:text-[var(--vermillion)] transition-colors"
          >
            Finish session &amp; get analysis
          </button>
        </div>
      )}

      {/* Input area */}
      <div className="border-t border-[rgba(26,26,26,0.08)] px-5 py-3 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => {
            if (!input && e.target.value && onStartWriting) onStartWriting();
            setInput(e.target.value);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          disabled={isLoading}
          className="flex-1 text-base text-[var(--ink)] bg-transparent focus:outline-none disabled:opacity-50 placeholder:text-[var(--ink-light)] placeholder:opacity-50"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || isLoading}
          className="ink-cta py-1.5 px-4 text-base disabled:opacity-40"
        >
          Send
        </button>
      </div>
    </div>
  );
}
