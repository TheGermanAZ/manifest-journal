import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState, useEffect } from "react";
import { ModeSelector } from "../components/ModeSelector";
import { ConversationView } from "../components/ConversationView";
import { LandingPage } from "../components/LandingPage";
import { authClient } from "../lib/auth-client";
import { useAuthSettled } from "../lib/useAuthSettled";

export const Route = createFileRoute("/")({
  component: IndexPage,
});

function IndexPage() {
  const { isAuthenticated, isPending } = useAuthSettled();

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-[var(--ink-light)] text-sm">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LandingPage />;
  }

  return <HomePage />;
}

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

  const hasDreamProfile = !!user?.dreamProfile;

  // Redirect to onboarding if no dream profile
  useEffect(() => {
    if (user && !hasDreamProfile) {
      navigate({ to: "/onboarding" });
    }
  }, [user, hasDreamProfile, navigate]);

  // Guided prompt: generate when entering guided mode
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

  if (user && !hasDreamProfile) {
    return null;
  }

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
        userMessage: message,
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
    <div className="min-h-screen">
      <div className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-[var(--ink-light)] uppercase tracking-[0.08em]">
              {today}
            </p>
            <h1 className="display-title text-xl font-normal text-[var(--ink)]">
              Daily Journal
            </h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => navigate({ to: "/history" })}
              className="text-xs text-[var(--ink-light)] px-3 py-1.5 border border-[rgba(26,26,26,0.15)] bg-transparent hover:border-[var(--ink)] transition-colors"
            >
              History
            </button>
            <button
              onClick={() => navigate({ to: "/dashboard" })}
              className="text-xs text-[var(--ink-light)] px-3 py-1.5 border border-[rgba(26,26,26,0.15)] bg-transparent hover:border-[var(--ink)] transition-colors"
            >
              Dashboard
            </button>
            <button
              onClick={async () => {
                await authClient.signOut();
                navigate({ to: "/login" });
              }}
              className="text-xs text-[var(--ink-light)] px-3 py-1.5 border border-[rgba(26,26,26,0.15)] bg-transparent hover:border-[var(--ink)] transition-colors"
            >
              Sign out
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
          <div className="border border-[rgba(26,26,26,0.12)] bg-[rgba(255,255,255,0.5)] p-5 flex flex-col gap-4">
            {mode === "guided" && (
              <div className="border-l-2 border-[var(--vermillion)] pl-4 py-2 text-sm text-[var(--ink-light)] italic leading-relaxed">
                {isLoadingPrompt ? (
                  <span className="animate-pulse text-[var(--ink-light)] opacity-50">
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
              className="w-full resize-none text-[var(--ink)] text-sm leading-relaxed bg-transparent focus:outline-none placeholder:text-[var(--ink-light)] placeholder:opacity-50"
            />
            <div className="flex justify-between items-center">
              <span className="text-xs text-[var(--ink-light)] opacity-50">{wordCount} words</span>
              <button
                onClick={handleSubmit}
                disabled={!content.trim() || isSubmitting}
                className="ink-cta py-2 px-5 text-sm disabled:opacity-40"
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
