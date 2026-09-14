"use client";

import { FormEvent, useState } from "react";

export default function Home() {
  const [gitUrl, setGitUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleAnalyze = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setError("");

    if (!gitUrl.trim()) {
      setError("Please enter a GitHub repository URL.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          giturl: gitUrl.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Unable to analyze repository.");
        return;
      }

      console.log("Analysis response:", data);

      // Temporary success message.
      // We will replace this with navigation to the
      // Scan Report page in a later stage.
      alert("Repository URL is valid and ready for analysis!");
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#09090b] text-white">
      {/* Background glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-[-300px] h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-violet-600/10 blur-[120px]" />
        <div className="absolute bottom-[-250px] right-[-150px] h-[500px] w-[500px] rounded-full bg-blue-600/10 blur-[120px]" />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 border-b border-white/10 bg-[#09090b]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-black font-bold">
              AI
            </div>

            <div>
              <h1 className="text-sm font-semibold tracking-wide">
                AI CODE REVIEW
              </h1>
              <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                Intelligent Analysis
              </p>
            </div>
          </div>

          <div className="hidden items-center gap-6 text-sm text-zinc-400 sm:flex">
            <span className="cursor-pointer transition hover:text-white">
              Dashboard
            </span>
            <span className="cursor-pointer transition hover:text-white">
              History
            </span>
            <span className="cursor-pointer transition hover:text-white">
              Settings
            </span>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 mx-auto flex max-w-6xl flex-col items-center px-6 pb-20 pt-24 text-center">
        {/* Status badge */}
        <div className="mb-8 flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/5 px-4 py-2 text-xs text-emerald-300">
          <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
          AI analysis engine ready
        </div>

        {/* Heading */}
        <h2 className="max-w-4xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl md:text-6xl">
          Understand your codebase
          <span className="block bg-gradient-to-r from-violet-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
            before you ship it.
          </span>
        </h2>

        <p className="mt-6 max-w-2xl text-base leading-7 text-zinc-400 sm:text-lg">
          Analyze your GitHub repository for architectural problems,
          security issues, and codebase-level risks with AI-powered review.
        </p>

        {/* Analyze Card */}
        <div className="mt-12 w-full max-w-3xl rounded-2xl border border-white/10 bg-white/[0.03] p-2 shadow-2xl shadow-black/40 backdrop-blur-xl">
          <form
            onSubmit={handleAnalyze}
            className="rounded-xl border border-white/5 bg-[#111113] p-5 sm:p-6"
          >
            <div className="mb-4 text-left">
              <label
                htmlFor="git-url"
                className="text-sm font-medium text-zinc-200"
              >
                GitHub Repository URL
              </label>

              <p className="mt-1 text-xs text-zinc-500">
                Enter the public GitHub repository you want to analyze.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">
                  ↗
                </span>

                <input
                  id="git-url"
                  type="url"
                  value={gitUrl}
                  onChange={(e) => setGitUrl(e.target.value)}
                  placeholder="https://github.com/username/repository"
                  disabled={loading}
                  className="h-12 w-full rounded-lg border border-white/10 bg-white/[0.04] pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-violet-400/50 focus:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="h-12 rounded-lg bg-white px-6 text-sm font-semibold text-black transition hover:bg-zinc-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/20 border-t-black" />
                    Analyzing...
                  </span>
                ) : (
                  "Analyze Repository →"
                )}
              </button>
            </div>

            {/* Error */}
            {error && (
              <div className="mt-4 rounded-lg border border-red-400/20 bg-red-400/5 px-4 py-3 text-left text-sm text-red-300">
                {error}
              </div>
            )}
          </form>
        </div>

        {/* Feature cards */}
        <div className="mt-16 grid w-full max-w-5xl gap-4 text-left md:grid-cols-3">
          <FeatureCard
            icon="⌁"
            title="Architecture"
            description="Identify tight coupling, duplicated logic, and structural problems across your codebase."
          />

          <FeatureCard
            icon="◈"
            title="Security"
            description="Detect security risks with static analysis and explain findings using AI."
          />

          <FeatureCard
            icon="◷"
            title="History"
            description="Track scan results over time and identify new issues introduced by changes."
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 py-6 text-center text-xs text-zinc-600">
        AI-Powered Code Review System
      </footer>
    </main>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="group rounded-xl border border-white/10 bg-white/[0.025] p-6 transition duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.04]">
      <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/[0.05] text-lg text-zinc-300">
        {icon}
      </div>

      <h3 className="text-base font-semibold text-white">{title}</h3>

      <p className="mt-2 text-sm leading-6 text-zinc-500">
        {description}
      </p>
    </div>
  );
}