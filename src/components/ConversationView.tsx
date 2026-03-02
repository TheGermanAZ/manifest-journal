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
}

export function ConversationView({
  turns,
  onSend,
  isLoading,
  onFinish,
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
    <div className="bg-white border border-stone-200 rounded-2xl flex flex-col h-[480px]">
      {/* Messages area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3"
      >
        {turns.length === 0 && !isLoading && (
          <p className="text-sm text-stone-400 italic text-center mt-12">
            Start writing — your coach will respond.
          </p>
        )}

        {turns.map((turn, i) => (
          <div
            key={i}
            className={`flex ${turn.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                turn.role === "user"
                  ? "bg-stone-900 text-white"
                  : "bg-stone-100 text-stone-700"
              }`}
            >
              {turn.content}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-stone-100 text-stone-400 rounded-2xl px-4 py-2.5 text-sm">
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
        <div className="px-4 pb-2">
          <button
            onClick={onFinish}
            className="text-xs text-stone-400 underline hover:text-stone-600 transition"
          >
            Finish session &amp; get analysis
          </button>
        </div>
      )}

      {/* Input area */}
      <div className="border-t border-stone-100 px-4 py-3 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          disabled={isLoading}
          className="flex-1 text-sm text-stone-800 bg-transparent focus:outline-none disabled:opacity-50"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || isLoading}
          className="bg-stone-900 text-white text-sm font-medium px-4 py-1.5 rounded-lg disabled:opacity-40"
        >
          Send
        </button>
      </div>
    </div>
  );
}
