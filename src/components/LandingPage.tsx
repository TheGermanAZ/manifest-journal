import { Link } from "@tanstack/react-router";

const features = [
  {
    icon: "✦",
    title: "Define Your Dream",
    description:
      "Write your manifesto and set intentions across five life dimensions — career, relationships, health, wealth, and creativity. Your AI coach uses this as your north star.",
  },
  {
    icon: "✍",
    title: "Journal Your Way",
    description:
      "Free write, follow AI-generated prompts, or have a real conversation with your coach. Three modes that meet you where you are today.",
  },
  {
    icon: "◈",
    title: "Watch Your Momentum",
    description:
      "Track your streak, see your alignment score trend over time, and discover emotional patterns you didn't know you had.",
  },
];

export function LandingPage() {
  return (
    <div className="landing-page">
      {/* ── Hero ──────────────────────────────────── */}
      <section className="min-h-[100dvh] flex flex-col items-center justify-center px-6 text-center relative">
        {/* Decorative orb */}
        <div className="landing-orb" aria-hidden="true" />

        <p
          className="island-kicker rise-in mb-5"
          style={{ animationDelay: "100ms" }}
        >
          Manifest Journal
        </p>

        <h1
          className="display-title rise-in text-[clamp(2.2rem,6vw,4.2rem)] leading-[1.12] font-bold max-w-[780px] tracking-tight"
          style={{ animationDelay: "220ms" }}
        >
          Your dream life starts
          <br />
          with today's entry.
        </h1>

        <p
          className="rise-in mt-6 max-w-[520px] text-[var(--sea-ink-soft)] text-[1.05rem] leading-relaxed"
          style={{ animationDelay: "380ms" }}
        >
          Turn daily reflection into real momentum. Define your vision, write
          honestly, and let your coach connect the dots.
        </p>

        <div
          className="rise-in flex flex-col sm:flex-row items-center gap-3 mt-10"
          style={{ animationDelay: "520ms" }}
        >
          <Link
            to="/register"
            className="landing-cta-primary"
          >
            Start Journaling — Free
          </Link>
          <Link
            to="/login"
            className="landing-cta-secondary"
          >
            Already have an account? Sign in
          </Link>
        </div>

        {/* Scroll hint */}
        <div
          className="rise-in absolute bottom-8 text-[var(--sea-ink-soft)] opacity-40 text-xs tracking-widest uppercase"
          style={{ animationDelay: "900ms" }}
        >
          <span className="landing-scroll-hint">↓</span>
        </div>
      </section>

      {/* ── Features ──────────────────────────────── */}
      <section className="px-6 pb-24 pt-8">
        <div className="max-w-[960px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <article
              key={f.title}
              className="feature-card island-shell rounded-2xl p-6 border border-[var(--line)] landing-feature-reveal"
              style={{ animationDelay: `${200 + i * 140}ms` }}
            >
              <span className="text-2xl block mb-3 landing-feature-icon">
                {f.icon}
              </span>
              <h3 className="display-title text-lg font-bold mb-2">
                {f.title}
              </h3>
              <p className="text-[var(--sea-ink-soft)] text-sm leading-relaxed">
                {f.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* ── Closing CTA ──────────────────────────── */}
      <section className="landing-closing px-6 py-20 text-center">
        <div className="max-w-[520px] mx-auto landing-feature-reveal" style={{ animationDelay: "200ms" }}>
          <p className="display-title text-[clamp(1.4rem,3.5vw,2rem)] font-bold leading-snug mb-2">
            Five minutes a day.
          </p>
          <p className="text-[var(--sea-ink-soft)] text-sm mb-8">
            That's all it takes to start becoming the person you want to be.
          </p>
          <Link
            to="/register"
            className="landing-cta-primary"
          >
            Start Journaling — Free
          </Link>
        </div>
      </section>
    </div>
  );
}
