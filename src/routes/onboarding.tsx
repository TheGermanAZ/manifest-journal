import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { AuthGuard } from "../components/AuthGuard";
import { ManifestoEditor } from "../components/ManifestoEditor";
import { CategoryCard } from "../components/CategoryCard";

export const Route = createFileRoute("/onboarding")({
  component: OnboardingPage,
});

const CATEGORIES = [
  { key: "career", label: "Career" },
  { key: "relationships", label: "Relationships" },
  { key: "health", label: "Health" },
  { key: "wealth", label: "Wealth" },
  { key: "creative", label: "Creative Expression" },
] as const;

function OnboardingPage() {
  return (
    <AuthGuard>
      <OnboardingFlow />
    </AuthGuard>
  );
}

function OnboardingFlow() {
  const navigate = useNavigate();
  const updateDreamProfile = useMutation(api.users.updateDreamProfile);

  const [step, setStep] = useState<1 | 2>(1);
  const [manifesto, setManifesto] = useState("");
  const [categories, setCategories] = useState({
    career: "",
    relationships: "",
    health: "",
    wealth: "",
    creative: "",
  });

  const wordCount =
    manifesto.trim() === "" ? 0 : manifesto.trim().split(/\s+/).length;
  const canContinue = wordCount >= 50;

  const handleCategoryChange = (key: string, value: string) => {
    setCategories((prev) => ({ ...prev, [key]: value }));
  };

  const handleFinish = async () => {
    await updateDreamProfile({ manifesto, categories });
    navigate({ to: "/" });
  };

  return (
    <main className="flex min-h-screen flex-col px-4 py-8">
      <div className="mx-auto w-full max-w-2xl">
        {/* Progress indicator */}
        <div className="mb-8 flex gap-2">
          <div
            className={`h-1.5 flex-1 ${
              step >= 1 ? "bg-[var(--ink)]" : "bg-[rgba(26,26,26,0.12)]"
            }`}
          />
          <div
            className={`h-1.5 flex-1 ${
              step >= 2 ? "bg-[var(--ink)]" : "bg-[rgba(26,26,26,0.12)]"
            }`}
          />
        </div>

        {step === 1 && (
          <div className="flex flex-col gap-6">
            <div>
              <h1 className="display-title text-3xl font-normal tracking-tight text-[var(--ink)]">
                Your Dream Life Manifesto
              </h1>
              <p className="mt-1 text-base text-[var(--ink-light)]">
                Step 1 of 2 &mdash; Write freely about your ideal life
              </p>
            </div>

            <ManifestoEditor value={manifesto} onChange={setManifesto} />

            <button
              onClick={() => setStep(2)}
              disabled={!canContinue}
              className="ink-cta self-end px-6 py-2 disabled:opacity-50"
            >
              Continue &rarr;
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-6">
            <div>
              <h1 className="display-title text-3xl font-normal tracking-tight text-[var(--ink)]">
                Life Dimensions
              </h1>
              <p className="mt-1 text-base text-[var(--ink-light)]">
                Step 2 of 2 &mdash; Define your vision for each area
              </p>
            </div>

            <div className="flex flex-col gap-4">
              {CATEGORIES.map(({ key, label }) => (
                <CategoryCard
                  key={key}
                  category={key}
                  label={label}
                  value={categories[key]}
                  onChange={(v) => handleCategoryChange(key, v)}
                />
              ))}
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => setStep(1)}
                className="border border-[rgba(26,26,26,0.15)] bg-transparent px-6 py-2 text-base font-medium text-[var(--ink)] hover:border-[var(--ink)] transition-colors"
              >
                &larr; Back
              </button>
              <button
                onClick={handleFinish}
                className="ink-cta px-6 py-2"
              >
                Start journaling &rarr;
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
