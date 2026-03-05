import { useState } from "react";
import { ShareableCard } from "./ShareableCard";

type CardVariant = "alignment" | "streak" | "tone" | "weekly";

interface ShareDialogProps {
  variants: Array<{
    variant: CardVariant;
    data: Record<string, any>;
  }>;
  onClose: () => void;
}

export function ShareDialog({ variants, onClose }: ShareDialogProps) {
  const [selectedVariant, setSelectedVariant] = useState(0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[var(--paper)] border border-[rgba(26,26,26,0.12)] p-6 max-w-sm mx-4 flex flex-col gap-4 shadow-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="display-title text-xl font-normal text-[var(--ink)]">
            Share Insight
          </h2>
          <button
            onClick={onClose}
            className="text-sm text-[var(--ink-light)] hover:text-[var(--ink)]"
          >
            Close
          </button>
        </div>

        {variants.length > 1 && (
          <div className="flex gap-1">
            {variants.map((v, i) => (
              <button
                key={i}
                onClick={() => setSelectedVariant(i)}
                className={`text-sm px-2 py-1 capitalize transition-colors ${
                  i === selectedVariant
                    ? "bg-[var(--ink)] text-[var(--paper)]"
                    : "text-[var(--ink-light)] hover:text-[var(--ink)]"
                }`}
              >
                {v.variant}
              </button>
            ))}
          </div>
        )}

        <div className="flex justify-center">
          <ShareableCard
            variant={variants[selectedVariant].variant}
            data={variants[selectedVariant].data}
          />
        </div>
      </div>
    </div>
  );
}
