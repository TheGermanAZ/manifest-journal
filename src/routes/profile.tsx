import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState, useEffect } from "react";
import { AuthGuard } from "../components/AuthGuard";
import { ManifestoEditor } from "../components/ManifestoEditor";
import { CategoryCard } from "../components/CategoryCard";

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

  useEffect(() => {
    if (user?.dreamProfile) {
      setManifesto(user.dreamProfile.manifesto);
      setCategories(user.dreamProfile.categories);
    }
  }, [user?.dreamProfile]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateProfile({ manifesto, categories });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-stone-900">Dream Profile</h1>
          <button
            onClick={() => navigate({ to: "/" })}
            className="text-xs text-stone-500 px-3 py-1.5 rounded-lg border border-stone-200 bg-white"
          >
            Journal
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-stone-700">Your manifesto</label>
          <ManifestoEditor value={manifesto} onChange={setManifesto} />
        </div>

        <div className="flex flex-col gap-3">
          <label className="text-sm font-medium text-stone-700">Five dimensions</label>
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

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-stone-900 text-white text-sm font-medium py-3 rounded-xl disabled:opacity-40"
        >
          {saved ? "Saved" : isSaving ? "Saving..." : "Save profile"}
        </button>
      </div>
    </div>
  );
}
