import { Link } from "@tanstack/react-router";

const features = [
  {
    num: "一",
    title: "Define Your Dream",
    description:
      "Write your manifesto and set intentions across five life dimensions. Your coach uses this as your north star.",
  },
  {
    num: "二",
    title: "Journal Your Way",
    description:
      "Free write, follow coach-generated prompts, or have a real conversation with your coach. Three modes that meet you where you are.",
  },
  {
    num: "三",
    title: "Watch Your Momentum",
    description:
      "Track your streak, see your alignment score trend, and discover emotional patterns you didn't know you had.",
  },
];

export function LandingPage() {
  return (
    <div className="landing-page">
      {/* ── Hero ──────────────────────────────────── */}
      <section className="min-h-[100dvh] flex flex-col items-center justify-center px-6 text-center relative">
        <div className="enso" aria-hidden="true" />

        <h1
          className="display-title rise-in text-[clamp(2.4rem,5.5vw,4rem)] leading-[1.15] font-normal max-w-[600px] tracking-tight"
          style={{ animationDelay: "600ms" }}
        >
          Your dream life starts with <em className="italic text-[var(--vermillion)]">today's</em> entry.
        </h1>

        <p
          className="rise-in mt-6 max-w-[400px] text-[var(--ink-light)] text-[0.92rem]"
          style={{ animationDelay: "900ms" }}
        >
          Journaling that turns daily reflection into real momentum.
        </p>

        <div
          className="rise-in mt-10"
          style={{ animationDelay: "1200ms" }}
        >
          <Link to="/register" className="ink-cta">
            Start Journaling
          </Link>
        </div>

        <p
          className="rise-in mt-4 text-[0.8rem] text-[var(--ink-light)]"
          style={{ animationDelay: "1400ms" }}
        >
          Already have an account?{" "}
          <Link
            to="/login"
            className="text-[var(--ink-light)] underline underline-offset-[3px]"
          >
            Sign in
          </Link>
        </p>
      </section>

      {/* ── Divider ──────────────────────────────── */}
      <div className="ink-divider" aria-hidden="true" />

      {/* ── Features ─────────────────────────────── */}
      <section className="ink-features">
        {features.map((f) => (
          <div key={f.title} className="ink-feature">
            <span className="ink-feature-num">{f.num}</span>
            <div>
              <h3>{f.title}</h3>
              <p>{f.description}</p>
            </div>
          </div>
        ))}
      </section>

      {/* ── Closing ──────────────────────────────── */}
      <section className="ink-closing">
        <p>Five minutes a day. That's all it takes.</p>
        <Link to="/register" className="ink-cta">
          Begin
        </Link>
      </section>
    </div>
  );
}
