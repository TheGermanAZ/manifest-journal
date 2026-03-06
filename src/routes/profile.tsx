import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState, useEffect } from "react";
import { AuthGuard } from "../components/AuthGuard";
import { ManifestoEditor } from "../components/ManifestoEditor";
import { CategoryCard } from "../components/CategoryCard";
import { GraceDaySelector } from "../components/GraceDaySelector";
import { NotificationSettings } from "../components/NotificationSettings";
import { ProfileTimeline } from "../components/ProfileTimeline";

export const Route = createFileRoute("/profile")({
  component: () => (
    <AuthGuard>
      <ProfilePage />
    </AuthGuard>
  ),
});

const CATEGORIES = [
  { key: "career", label: "Career" },
  { key: "relationships", label: "Relationships" },
  { key: "health", label: "Health" },
  { key: "wealth", label: "Wealth" },
  { key: "creative", label: "Creative Expression" },
] as const;

function ProfilePage() {
  const user = useQuery(api.users.currentUser);
  const updateProfile = useMutation(api.users.updateDreamProfile);
  const navigate = useNavigate();

  const [manifesto, setManifesto] = useState("");
  const [categories, setCategories] = useState({
    career: "", relationships: "", health: "", wealth: "", creative: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [editingManifesto, setEditingManifesto] = useState(false);

  useEffect(() => {
    if (user?.dreamProfile) {
      setManifesto(user.dreamProfile.manifesto);
      setCategories(user.dreamProfile.categories);
    }
  }, [user?.dreamProfile]);

  const generateManifesto = () => {
    const parts = CATEGORIES
      .map(({ key, label }) => categories[key] ? `${label}: ${categories[key]}` : "")
      .filter(Boolean);
    return parts.join(". ") + ".";
  };

  const handleRegenerateManifesto = () => {
    setManifesto(generateManifesto());
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const finalManifesto = manifesto.trim() || generateManifesto();
      await updateProfile({ manifesto: finalManifesto, categories });
      setManifesto(finalManifesto);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen">
      <div className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="display-title font-normal text-[var(--ink)]">Dream Profile</h1>
          <button
            onClick={() => navigate({ to: "/" })}
            className="text-sm text-[var(--ink-light)] px-3 py-1.5 border border-[rgba(26,26,26,0.15)] bg-transparent hover:border-[var(--ink)] transition-colors"
          >
            Journal
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <label className="text-xs font-medium uppercase tracking-wide text-[var(--ink-light)]">Five dimensions</label>
          {CATEGORIES.map(({ key, label }) => (
            <CategoryCard
              key={key}
              category={key}
              label={label}
              value={categories[key]}
              onChange={(val) => setCategories((c) => ({ ...c, [key]: val }))}
            />
          ))}
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium uppercase tracking-wide text-[var(--ink-light)]">Anything else</label>
            <div className="flex gap-2">
              <button
                onClick={handleRegenerateManifesto}
                className="text-sm text-[var(--ink-light)] hover:text-[var(--ink)] transition-colors"
              >
                Regenerate from dimensions
              </button>
              <button
                onClick={() => setEditingManifesto(!editingManifesto)}
                className="text-sm text-[var(--ink-light)] hover:text-[var(--ink)] transition-colors"
              >
                {editingManifesto ? "Done" : "Edit"}
              </button>
            </div>
          </div>
          {editingManifesto ? (
            <ManifestoEditor value={manifesto} onChange={setManifesto} />
          ) : (
            <div
              className="border border-[rgba(26,26,26,0.12)] bg-[rgba(255,255,255,0.5)] p-4 text-base text-[var(--ink)] leading-relaxed whitespace-pre-wrap cursor-pointer"
              onClick={() => setEditingManifesto(true)}
            >
              {manifesto || <span className="text-[var(--ink-light)] italic">Add anything about your dream life that doesn't fit into the five pillars</span>}
            </div>
          )}
        </div>

        {/* Streak preferences */}
        <div className="border-t border-[rgba(26,26,26,0.12)] pt-6">
          <GraceDaySelector />
        </div>

        {/* Notification settings */}
        <div className="border-t border-[rgba(26,26,26,0.12)] pt-6">
          <NotificationSettings />
        </div>

        {/* Profile evolution timeline */}
        <div className="border-t border-[rgba(26,26,26,0.12)] pt-6">
          <ProfileTimeline />
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="ink-cta w-full py-3 text-center disabled:opacity-40"
        >
          {saved ? "Saved" : isSaving ? "Saving..." : "Save profile"}
        </button>
      </div>
    </div>
  );
}
