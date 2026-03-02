import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState, useEffect } from "react";
import { AuthGuard } from "../components/AuthGuard";
import { ModeSelector } from "../components/ModeSelector";
import { ConversationView } from "../components/ConversationView";

export const Route = createFileRoute("/")({
  component: () => (
    <AuthGuard>
      <HomePage />
    </AuthGuard>
  ),
});

type JournalMode = "open" | "guided" | "conversational";

function HomePage() {
  const [mode, setMode] = useState<JournalMode>("open");
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Guided prompt state
  const [guidedPrompt, setGuidedPrompt] = useState<string | null>(null);
  const [isLoadingPrompt, setIsLoadingPrompt] = useState(false);

  // Conversational state
  const [conversationEntryId, setConversationEntryId] = useState<string | null>(
    null,
  );
  const [turns, setTurns] = useState<
    { role: "user" | "assistant"; content: string }[]
  >([]);
  const [isTurnLoading, setIsTurnLoading] = useState(false);

  const user = useQuery(api.users.currentUser);
  const recent = useQuery(api.entries.recentEntries, { limit: 7 });
  const createEntry = useMutation(api.entries.createEntry);
  const analyzeEntry = useAction(api.ai.analyzeEntry);
  const generatePrompt = useAction(api.ai.generateDailyPrompt);
  const addTurn = useMutation(api.conversations.addTurn);
  const convoTurn = useAction(api.ai.conversationalTurn);
  const navigate = useNavigate();

  // Redirect to onboarding if no dream profile
  if (user && !user.dreamProfile) {
    navigate({ to: "/onboarding" });
    return null;
  }

  // Guided prompt: generate when entering guided mode
  const hasDreamProfile = !!user?.dreamProfile;
  useEffect(() => {
    if (mode !== "guided" || !hasDreamProfile) return;
    let cancelled = false;
    (async () => {
      setIsLoadingPrompt(true);
      try {
        const recentContents = (recent ?? [])
          .slice(0, 3)
          .map((e) => e.content);
        const prompt = await generatePrompt({
          dreamProfile: user!.dreamProfile!,
          recentEntryContents: recentContents,
        });
        if (!cancelled) setGuidedPrompt(prompt);
      } finally {
        if (!cancelled) setIsLoadingPrompt(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, hasDreamProfile]);

  // Conversational mode handlers
  const handleConvoSend = async (message: string) => {
    if (!user?.dreamProfile) return;
    setIsTurnLoading(true);
    const userTurn = { role: "user" as const, content: message };
    setTurns((prev) => [...prev, userTurn]);

    try {
      let entryId = conversationEntryId;

      // On first message, create the entry
      if (!entryId) {
        entryId = await createEntry({
          content: message,
          mode: "conversational",
        });
        setConversationEntryId(entryId);
      }

      // Persist user turn
      await addTurn({
        entryId: entryId as any,
        role: "user",
        content: message,
      });

      // Get AI response
      const history = [...turns, userTurn].map((t) => ({
        role: t.role,
        content: t.content,
      }));
      const assistantContent = await convoTurn({
        dreamProfile: user.dreamProfile,
        history,
        message,
      });

      // Persist assistant turn
      await addTurn({
        entryId: entryId as any,
        role: "assistant",
        content: assistantContent,
      });

      setTurns((prev) => [
        ...prev,
        { role: "assistant", content: assistantContent },
      ]);
    } finally {
      setIsTurnLoading(false);
    }
  };

  const handleConvoFinish = async () => {
    if (!conversationEntryId || !user?.dreamProfile) return;
    setIsSubmitting(true);
    try {
      const fullContent = turns
        .filter((t) => t.role === "user")
        .map((t) => t.content)
        .join("\n\n");
      const recentContents = (recent ?? []).map((e) => e.content);
      await analyzeEntry({
        entryId: conversationEntryId as any,
        content: fullContent,
        dreamProfile: user.dreamProfile,
        recentEntryContents: recentContents,
      });
      navigate({
        to: "/response/$entryId",
        params: { entryId: conversationEntryId },
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    if (!content.trim() || !user?.dreamProfile) return;
    setIsSubmitting(true);
    try {
      const entryId = await createEntry({ content, mode });
      const recentContents = (recent ?? []).map((e) => e.content);
      await analyzeEntry({
        entryId,
        content,
        dreamProfile: user.dreamProfile,
        recentEntryContents: recentContents,
      });
      navigate({ to: "/response/$entryId", params: { entryId } });
    } finally {
      setIsSubmitting(false);
    }
  };

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-stone-400 uppercase tracking-wide">
              {today}
            </p>
            <h1 className="text-lg font-semibold text-stone-900">
              Daily Journal
            </h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => navigate({ to: "/history" })}
              className="text-xs text-stone-500 px-3 py-1.5 rounded-lg border border-stone-200 bg-white"
            >
              History
            </button>
            <button
              onClick={() => navigate({ to: "/dashboard" })}
              className="text-xs text-stone-500 px-3 py-1.5 rounded-lg border border-stone-200 bg-white"
            >
              Dashboard
            </button>
          </div>
        </div>

        {/* Mode selector */}
        <ModeSelector selected={mode} onSelect={setMode} />

        {/* Editor / Conversation */}
        {mode === "conversational" ? (
          <ConversationView
            turns={turns}
            onSend={handleConvoSend}
            isLoading={isTurnLoading}
            onFinish={handleConvoFinish}
          />
        ) : (
          <div className="bg-white border border-stone-200 rounded-2xl p-4 flex flex-col gap-4">
            {mode === "guided" && (
              <div className="bg-stone-50 rounded-xl px-4 py-3 text-sm text-stone-600 italic leading-relaxed border border-stone-100">
                {isLoadingPrompt ? (
                  <span className="animate-pulse text-stone-300">
                    Generating your prompt...
                  </span>
                ) : (
                  guidedPrompt ??
                  "What would the person you're becoming do differently today?"
                )}
              </div>
            )}
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What's on your mind today?"
              rows={12}
              className="w-full resize-none text-stone-800 text-sm leading-relaxed focus:outline-none"
            />
            <div className="flex justify-between items-center">
              <span className="text-xs text-stone-300">{wordCount} words</span>
              <button
                onClick={handleSubmit}
                disabled={!content.trim() || isSubmitting}
                className="bg-stone-900 text-white text-sm font-medium px-5 py-2 rounded-lg disabled:opacity-40"
              >
                {isSubmitting ? "Analyzing..." : "Submit"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
