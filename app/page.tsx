"use client";

import { FormEvent, useRef, useState } from "react";
import Navbar from "./components/Navbar";

export default function Home() {
  const [gitUrl, setGitUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const inputRef = useRef<HTMLInputElement>(null);

  const handleAnalyze = async (
    e: FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    if (loading) {
      return;
    }

    const url = gitUrl.trim();

    /* -----------------------------
       EMPTY INPUT
    ----------------------------- */

    if (!url) {
      setError("Please enter a GitHub repository URL.");
      inputRef.current?.focus();
      return;
    }

    /* -----------------------------
       GITHUB URL VALIDATION
    ----------------------------- */

    try {
      const parsedUrl = new URL(url);

      const isGitHub =
        parsedUrl.hostname === "github.com" ||
        parsedUrl.hostname === "www.github.com";

      const pathParts = parsedUrl.pathname
        .split("/")
        .filter(Boolean);

      if (!isGitHub || pathParts.length < 2) {
        setError(
          "Please enter a valid GitHub repository URL, such as https://github.com/username/repository."
        );

        inputRef.current?.focus();
        return;
      }
    } catch {
      setError(
        "Please enter a valid GitHub repository URL."
      );

      inputRef.current?.focus();
      return;
    }

    /* -----------------------------
       START SCAN
    ----------------------------- */

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        "/api/analyze",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            gitUrl: url,
          }),
        }
      );

      const contentType =
        response.headers.get("content-type") || "";

      const data = contentType.includes(
        "application/json"
      )
        ? await response.json()
        : {};

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Failed to start the scan. Please try again."
        );
      }

      if (!data.scanId) {
        throw new Error(
          "The scan was created, but no scan ID was returned."
        );
      }

      window.location.href =
        `/scan?scanId=${data.scanId}`;
    } catch (err) {
      if (err instanceof TypeError) {
        setError(
          "Could not reach the analysis server. Make sure the development server is running and try again."
        );
      } else {
        setError(
          err instanceof Error
            ? err.message
            : "Something went wrong while starting the scan."
        );
      }

      setLoading(false);

      inputRef.current?.focus();
    }
  };

  /* -----------------------------
     INPUT HANDLERS
  ----------------------------- */

  const handleInputChange = (
    value: string
  ) => {
    setGitUrl(value);

    if (error) {
      setError("");
    }
  };

  const clearUrl = () => {
    setGitUrl("");
    setError("");
    inputRef.current?.focus();
  };

  const useExampleRepo = () => {
    setGitUrl(
      "https://github.com/molliakhil07/test"
    );

    setError("");

    inputRef.current?.focus();
  };

  return (
    <main className="min-h-screen bg-[#09090b] text-white">
      <Navbar />

      {/* =====================================
          BACKGROUND EFFECTS
      ====================================== */}

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-[-320px] h-[650px] w-[650px] -translate-x-1/2 rounded-full bg-violet-600/10 blur-[130px]" />

        <div className="absolute bottom-[-280px] right-[-180px] h-[550px] w-[550px] rounded-full bg-blue-600/10 blur-[130px]" />

        <div className="absolute left-[-180px] top-[45%] h-[400px] w-[400px] rounded-full bg-cyan-500/5 blur-[120px]" />
      </div>

      {/* =====================================
          HERO
      ====================================== */}

      <section className="relative z-10 mx-auto flex max-w-6xl flex-col items-center px-6 pb-20 pt-20 text-center sm:pt-24">

        {/* Status badge */}

        <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/[0.05] px-4 py-2 text-xs font-medium text-emerald-300">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />

            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>

          AI analysis engine ready
        </div>

        {/* Heading */}

        <h1 className="max-w-4xl text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
          Understand your codebase

          <span className="block bg-gradient-to-r from-violet-400 via-blue-400 to-cyan-400 bg-clip-text pb-2 text-transparent">
            before you ship it.
          </span>
        </h1>

        {/* Description */}

        <p className="mt-6 max-w-2xl text-base leading-7 text-zinc-400 sm:text-lg">
          Analyze your GitHub repository for architectural
          problems, security issues, and codebase-level
          risks with AI-powered review.
        </p>

        {/* =====================================
            TRUST INDICATORS
        ====================================== */}

        <div className="mt-7 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11px] uppercase tracking-[0.16em] text-zinc-600">

          <span className="flex items-center gap-2">
            <span className="text-emerald-400">
              ✓
            </span>

            Whole-codebase analysis
          </span>

          <span className="hidden h-3 w-px bg-white/10 sm:block" />

          <span className="flex items-center gap-2">
            <span className="text-violet-400">
              ◈
            </span>

            Architecture + Security
          </span>

          <span className="hidden h-3 w-px bg-white/10 sm:block" />

          <span className="flex items-center gap-2">
            <span className="text-cyan-400">
              ◷
            </span>

            Scan history
          </span>
        </div>

        {/* =====================================
            ANALYZE CARD
        ====================================== */}

        <div className="mt-12 w-full max-w-3xl">

          <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-2 shadow-2xl shadow-black/40 backdrop-blur-xl">

            <form
              onSubmit={handleAnalyze}
              className="rounded-xl border border-white/[0.07] bg-[#111113] p-5 text-left sm:p-7"
            >

              {/* FORM HEADER */}

              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">

                <div>

                  <div className="flex items-center gap-2">

                    <span className="flex h-7 w-7 items-center justify-center rounded-md border border-white/10 bg-white/[0.05] text-sm">
                      ↗
                    </span>

                    <label
                      htmlFor="git-url"
                      className="text-sm font-semibold text-zinc-100"
                    >
                      GitHub Repository URL
                    </label>

                  </div>

                  <p className="mt-2 text-xs leading-5 text-zinc-500">
                    Paste the public GitHub repository you want
                    to analyze.
                  </p>

                </div>

                <span className="rounded-full border border-white/5 bg-white/[0.025] px-2.5 py-1 text-[10px] uppercase tracking-wider text-zinc-600">
                  Public repositories
                </span>

              </div>

              {/* =====================================
                  INPUT AREA
              ====================================== */}

              <div className="mt-5 flex flex-col gap-3 sm:flex-row">

                <div className="relative flex-1">

                  {/* GitHub icon */}

                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">

                    <svg
                      width="17"
                      height="17"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path d="M12 2C6.48 2 2 6.58 2 12.23c0 4.52 2.87 8.35 6.84 9.71.5.1.68-.22.68-.49v-1.7c-2.78.62-3.37-1.23-3.37-1.23-.46-1.2-1.12-1.52-1.12-1.52-.91-.64.07-.63.07-.63 1.01.07 1.55 1.08 1.55 1.08.9 1.59 2.35 1.13 2.93.86.09-.67.35-1.13.64-1.39-2.22-.26-4.56-1.15-4.56-5.08 0-1.12.39-2.03 1.02-2.75-.1-.26-.44-1.3.1-2.71 0 0 .83-.27 2.75 1.05A9.16 9.16 0 0 1 12 6.11c.85 0 1.7.12 2.5.36 1.92-1.32 2.75-1.05 2.75-1.05.54 1.41.2 2.45.1 2.71.63.72 1.02 1.63 1.02 2.75 0 3.94-2.35 4.82-4.58 5.07.36.32.68.94.68 1.9v2.82c0 .27.18.59.69.49A10.25 10.25 0 0 0 22 12.23C22 6.58 17.52 2 12 2Z" />
                    </svg>

                  </span>

                  {/* URL input */}

                  <input
                    ref={inputRef}
                    id="git-url"
                    type="url"
                    value={gitUrl}
                    onChange={(e) =>
                      handleInputChange(
                        e.target.value
                      )
                    }
                    placeholder="https://github.com/username/repository"
                    disabled={loading}
                    autoComplete="url"
                    spellCheck={false}
                    aria-invalid={Boolean(error)}
                    aria-describedby={
                      error
                        ? "git-url-error"
                        : "git-url-help"
                    }
                    className={`h-12 w-full rounded-xl border bg-white/[0.035] pl-11 pr-11 text-sm text-white outline-none transition duration-200 placeholder:text-zinc-600 focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                      error
                        ? "border-red-400/40 focus:border-red-400/60 focus:ring-red-400/5"
                        : "border-white/10 focus:border-violet-400/50 focus:bg-white/[0.055] focus:ring-violet-400/5"
                    }`}
                  />

                  {/* Clear button */}

                  {gitUrl && !loading && (
                    <button
                      type="button"
                      onClick={clearUrl}
                      aria-label="Clear repository URL"
                      className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-zinc-600 transition hover:bg-white/[0.06] hover:text-zinc-300"
                    >
                      ×
                    </button>
                  )}

                </div>

                {/* Analyze button */}

                <button
                  type="submit"
                  disabled={loading}
                  className="h-12 rounded-xl bg-white px-7 text-sm font-bold text-black shadow-lg shadow-white/5 transition duration-200 hover:-translate-y-0.5 hover:bg-zinc-200 active:translate-y-0 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 sm:min-w-[185px]"
                >

                  {loading ? (

                    <span
                      className="flex items-center justify-center gap-2"
                      aria-live="polite"
                    >
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/20 border-t-black" />

                      Starting scan...
                    </span>

                  ) : (

                    <span className="flex items-center justify-center gap-2">
                      Analyze Repository

                      <span className="text-base">
                        →
                      </span>
                    </span>

                  )}

                </button>

              </div>

              {/* =====================================
                  HELPER / EXAMPLE
              ====================================== */}

              {!error && !loading && (

                <div
                  id="git-url-help"
                  className="mt-4 flex flex-col gap-3 text-[11px] text-zinc-600 sm:flex-row sm:items-center sm:justify-between"
                >

                  <div className="flex items-center gap-2">

                    <span className="text-emerald-400">
                      ✓
                    </span>

                    <span>
                      No code changes required to start a scan.
                    </span>

                  </div>

                  <button
                    type="button"
                    onClick={useExampleRepo}
                    className="text-left text-zinc-600 underline decoration-zinc-800 underline-offset-4 transition hover:text-zinc-400 hover:decoration-zinc-600 sm:text-right"
                  >
                    Try example repository
                  </button>

                </div>

              )}

              {/* =====================================
                  LOADING EXPERIENCE
              ====================================== */}

              {loading && (

                <div
                  className="mt-4 overflow-hidden rounded-xl border border-violet-400/15 bg-violet-400/[0.035]"
                  aria-live="polite"
                  aria-busy="true"
                >

                  <div className="flex items-start gap-3 px-4 py-3.5">

                    <div className="relative mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">

                      <span className="absolute h-5 w-5 animate-ping rounded-full bg-violet-400/20" />

                      <span className="relative h-2 w-2 rounded-full bg-violet-400" />

                    </div>

                    <div className="min-w-0">

                      <p className="text-xs font-semibold text-violet-200">
                        Preparing your scan
                      </p>

                      <p className="mt-1 text-[11px] leading-5 text-violet-300/60">
                        Validating the repository and starting
                        the codebase analysis. You&apos;ll be
                        redirected to the live report shortly.
                      </p>

                    </div>

                    <div className="ml-auto flex items-center gap-1 pt-1">

                      <span className="h-1 w-1 animate-bounce rounded-full bg-violet-400 [animation-delay:-0.3s]" />

                      <span className="h-1 w-1 animate-bounce rounded-full bg-violet-400 [animation-delay:-0.15s]" />

                      <span className="h-1 w-1 animate-bounce rounded-full bg-violet-400" />

                    </div>

                  </div>

                  <div className="h-[2px] w-full overflow-hidden bg-white/[0.03]">

                    <div className="h-full w-1/3 animate-[loading_1.4s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-violet-400 to-transparent" />

                  </div>

                </div>

              )}

              {/* =====================================
                  ERROR EXPERIENCE
              ====================================== */}

              {error && (

                <div
                  id="git-url-error"
                  role="alert"
                  className="mt-4 overflow-hidden rounded-xl border border-red-400/20 bg-red-400/[0.05]"
                >

                  <div className="flex items-start gap-3 px-4 py-3.5">

                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-red-400/20 bg-red-400/10 text-xs font-bold text-red-300">
                      !
                    </span>

                    <div className="min-w-0 flex-1">

                      <p className="text-xs font-semibold text-red-300">
                        Unable to start scan
                      </p>

                      <p className="mt-1 text-xs leading-5 text-red-300/70">
                        {error}
                      </p>

                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setError("");
                        inputRef.current?.focus();
                      }}
                      className="shrink-0 rounded-md border border-red-400/10 px-2.5 py-1.5 text-[10px] font-medium text-red-300/70 transition hover:border-red-400/20 hover:bg-red-400/10 hover:text-red-200"
                    >
                      Try again
                    </button>

                  </div>

                </div>

              )}

            </form>

          </div>

          {/* CARD FOOTER */}

          <div className="mt-3 flex flex-col items-center justify-center gap-2 text-[10px] uppercase tracking-[0.15em] text-zinc-700 sm:flex-row sm:gap-4">

            <span>
              Public GitHub repositories
            </span>

            <span className="hidden h-1 w-1 rounded-full bg-zinc-700 sm:block" />

            <span>
              Results saved to scan history
            </span>

          </div>

        </div>

        {/* =====================================
            ANALYSIS FEATURES
        ====================================== */}

        <div className="mt-16 w-full max-w-5xl">

          <div className="mb-5 flex items-center justify-between">

            <div className="text-left">

              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-600">
                What gets analyzed
              </p>

              <h2 className="mt-1 text-sm font-medium text-zinc-400">
                One scan. Three perspectives.
              </h2>

            </div>

          </div>

          <div className="grid gap-4 text-left md:grid-cols-3">

            <FeatureCard
              icon="⌁"
              title="Architecture"
              description="Identify tight coupling, duplicated logic, and structural problems across your codebase."
              accent="violet"
            />

            <FeatureCard
              icon="◈"
              title="Security"
              description="Detect security risks with static analysis and explain findings using AI."
              accent="red"
            />

            <FeatureCard
              icon="◷"
              title="History"
              description="Track scan results over time and identify new issues introduced by changes."
              accent="cyan"
            />

          </div>

        </div>

      </section>

      {/* =====================================
          FOOTER
      ====================================== */}

      <footer className="relative z-10 border-t border-white/10 py-7 text-center">

        <p className="text-xs text-zinc-600">
          AI-Based Repo Review System
        </p>

        <p className="mt-1 text-[10px] text-zinc-700">
          Intelligent codebase analysis for modern repositories
        </p>

      </footer>

      {/* Loading animation */}

      <style jsx>{`
        @keyframes loading {
          0% {
            transform: translateX(-100%);
          }

          50% {
            transform: translateX(200%);
          }

          100% {
            transform: translateX(400%);
          }
        }
      `}</style>

    </main>
  );
}

/* ==========================================
   FEATURE CARD
========================================== */

function FeatureCard({
  icon,
  title,
  description,
  accent,
}: {
  icon: string;
  title: string;
  description: string;
  accent: "violet" | "red" | "cyan";
}) {
  const accentStyles = {
    violet: {
      icon: "border-violet-400/20 bg-violet-400/[0.06] text-violet-300",
      glow: "group-hover:bg-violet-400/5",
    },

    red: {
      icon: "border-red-400/20 bg-red-400/[0.06] text-red-300",
      glow: "group-hover:bg-red-400/5",
    },

    cyan: {
      icon: "border-cyan-400/20 bg-cyan-400/[0.06] text-cyan-300",
      glow: "group-hover:bg-cyan-400/5",
    },
  };

  const styles = accentStyles[accent];

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025] p-6 transition duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.04] ${styles.glow}`}
    >

      <div
        className={`mb-5 flex h-11 w-11 items-center justify-center rounded-xl border text-lg transition duration-300 group-hover:scale-105 ${styles.icon}`}
      >
        {icon}
      </div>

      <h3 className="text-base font-semibold text-white">
        {title}
      </h3>

      <p className="mt-2 text-sm leading-6 text-zinc-500">
        {description}
      </p>

      <div className="mt-5 flex items-center gap-2 text-[10px] font-medium uppercase tracking-wider text-zinc-700 transition group-hover:text-zinc-500">
        Explore findings

        <span>
          →
        </span>
      </div>

    </div>
  );
}