import { useRef, useState } from "react";
import { downloadCard, copyCardToClipboard } from "../lib/cardCapture";

type CardVariant = "alignment" | "streak" | "tone" | "weekly";

interface ShareableCardProps {
  variant: CardVariant;
  data: {
    alignmentScore?: number;
    streak?: number;
    tone?: string;
    weekRange?: string;
    avgAlignment?: number;
    entryCount?: number;
  };
}

export function ShareableCard({ variant, data }: ShareableCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  const handleDownload = () => {
    if (cardRef.current) downloadCard(cardRef.current);
  };

  const handleCopy = async () => {
    if (cardRef.current) {
      const success = await copyCardToClipboard(cardRef.current);
      if (success) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Card preview */}
      <div
        ref={cardRef}
        className="w-[270px] h-[270px] bg-[var(--paper)] border border-[rgba(26,26,26,0.12)] p-6 flex flex-col items-center justify-center gap-3"
        style={{ fontFamily: "'Cormorant Garamond', serif" }}
      >
        <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--ink-light)]">
          Manifest Journal
        </p>

        {variant === "alignment" && (
          <>
            <span className="text-4xl font-bold text-[var(--vermillion)]">
              {data.alignmentScore}/10
            </span>
            <p className="text-xs text-[var(--ink-light)]">Alignment Score</p>
          </>
        )}

        {variant === "streak" && (
          <>
            <span className="text-4xl font-bold text-[var(--ink)]">
              {data.streak}
            </span>
            <p className="text-xs text-[var(--ink-light)]">Day Streak</p>
          </>
        )}

        {variant === "tone" && (
          <>
            <span className="text-2xl capitalize text-[var(--ink)]">
              {data.tone}
            </span>
            <p className="text-xs text-[var(--ink-light)]">Dominant Tone</p>
          </>
        )}

        {variant === "weekly" && (
          <>
            <span className="text-sm text-[var(--ink)]">{data.weekRange}</span>
            <span className="text-2xl font-bold text-[var(--vermillion)]">
              {data.avgAlignment}/10
            </span>
            <p className="text-xs text-[var(--ink-light)]">
              {data.entryCount} entries this week
            </p>
          </>
        )}

        <div className="w-8 h-px bg-[var(--vermillion)] mt-2" />
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={handleDownload}
          className="text-xs text-[var(--ink-light)] px-3 py-1.5 border border-[rgba(26,26,26,0.15)] hover:border-[var(--ink)] transition-colors"
        >
          Download
        </button>
        <button
          onClick={handleCopy}
          className="text-xs text-[var(--ink-light)] px-3 py-1.5 border border-[rgba(26,26,26,0.15)] hover:border-[var(--ink)] transition-colors"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
    </div>
  );
}
