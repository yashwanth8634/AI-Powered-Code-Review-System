"use client";

import Link from "next/link";
import Navbar from "../components/Navbar";

type Severity = "High" | "Medium" | "Low";

type Finding = {
  severity: Severity;
  title: string;
  description: string;
  file?: string;
  line?: number;
};

const architectureFindings: Finding[] = [
  {
    severity: "High",
    title: "Tightly Coupled Modules",
    description:
      "Several modules have direct dependencies on each other, making the application harder to maintain and test independently.",
  },
  {
    severity: "Medium",
    title: "Duplicated Business Logic",
    description:
      "Similar logic appears across multiple files. Consider extracting the shared functionality into a reusable module.",
  },
  {
    severity: "Low",
    title: "Inconsistent Component Patterns",
    description:
      "Some components follow different implementation patterns, which can make the codebase harder to understand.",
  },
  {
    severity: "Medium",
    title: "Missing Separation of Concerns",
    description:
      "Business logic and presentation logic are mixed in some components. Separating these responsibilities could improve maintainability.",
  },
];

const securityFindings: Finding[] = [
  {
    severity: "High",
    title: "Hardcoded Secret Detected",
    description:
      "A sensitive credential appears to be directly stored in source code. Move secrets to environment variables.",
    file: "src/config.ts",
    line: 24,
  },
  {
    severity: "High",
    title: "Missing Input Validation",
    description:
      "User-controlled input reaches an application operation without sufficient validation.",
    file: "src/api/users.ts",
    line: 67,
  },
  {
    severity: "Medium",
    title: "Potential Injection Risk",
    description:
      "External input is used in a way that may allow malicious data to influence an application query.",
    file: "src/database/query.ts",
    line: 41,
  },
];

const severityStyles = {
  High: {
    badge: "border-red-400/20 bg-red-400/10 text-red-300",
    dot: "bg-red-400",
  },
  Medium: {
    badge: "border-amber-400/20 bg-amber-400/10 text-amber-300",
    dot: "bg-amber-400",
  },
  Low: {
    badge: "border-blue-400/20 bg-blue-400/10 text-blue-300",
    dot: "bg-blue-400",
  },
};

function FindingCard({ finding }: { finding: Finding }) {
  const styles = severityStyles[finding.severity];

  return (
    <div className="group rounded-xl border border-white/10 bg-white/[0.025] p-5 transition duration-300 hover:border-white/20 hover:bg-white/[0.04]">
        
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-4">
          <div
            className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${styles.dot}`}
          />

          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="font-semibold text-white">
                {finding.title}
              </h3>

              <span
                className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${styles.badge}`}
              >
                {finding.severity}
              </span>
            </div>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
              {finding.description}
            </p>

            {finding.file && (
              <div className="mt-4 flex flex-wrap items-center gap-2 font-mono text-xs">
                <span className="rounded-md border border-white/10 bg-black/20 px-2.5 py-1.5 text-zinc-400">
                  {finding.file}
                </span>

                <span className="rounded-md border border-white/10 bg-black/20 px-2.5 py-1.5 text-zinc-500">
                  Line {finding.line}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  description,
}: {
  label: string;
  value: number;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.025] p-5">
      <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
        {label}
      </p>

      <p className="mt-2 text-3xl font-bold text-white">{value}</p>

      <p className="mt-1 text-xs text-zinc-600">{description}</p>
    </div>
  );
}

export default function ScanReport() {
  const highCount =
    [...architectureFindings, ...securityFindings].filter(
      (finding) => finding.severity === "High"
    ).length;

  const mediumCount =
    [...architectureFindings, ...securityFindings].filter(
      (finding) => finding.severity === "Medium"
    ).length;

  const lowCount =
    [...architectureFindings, ...securityFindings].filter(
      (finding) => finding.severity === "Low"
    ).length;

  const totalFindings = highCount + mediumCount + lowCount;

  return (
    <main className="min-h-screen bg-[#09090b] text-white">
        <Navbar />
      {/* Background glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-[-300px] h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-violet-600/10 blur-[120px]" />

        <div className="absolute bottom-[-250px] right-[-150px] h-[500px] w-[500px] rounded-full bg-blue-600/10 blur-[120px]" />
      </div>

      {/* Navbar */}
      <nav className="relative z-10 border-b border-white/10 bg-[#09090b]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white font-bold text-black">
              AI
            </div>

            <div>
              <h1 className="text-sm font-semibold tracking-wide">
                AI BASED REPO REVIEW
              </h1>

              <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                Intelligent Analysis
              </p>
            </div>
          </Link>

          <Link
            href="/"
            className="text-sm text-zinc-400 transition hover:text-white"
          >
            ← Analyze another repository
          </Link>
        </div>
      </nav>

      {/* Main */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 py-10">
        {/* Heading */}
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-emerald-400/20 bg-emerald-400/5 px-3 py-1 text-xs text-emerald-300">
              Scan completed
            </span>

            <span className="text-xs text-zinc-600">
              Just now
            </span>
          </div>

          <h2 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl">
            Scan Report
          </h2>

          <p className="mt-2 font-mono text-sm text-zinc-500">
            github.com/example/sample-project
          </p>
        </div>

        {/* Overall Summary */}
        <div className="mt-8 grid gap-4 lg:grid-cols-[1.3fr_2fr]">
          {/* Score */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-7">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">
              Overall Code Health
            </p>

            <div className="mt-6 flex items-end gap-2">
              <span className="text-7xl font-bold tracking-tight">
                82
              </span>

              <span className="mb-2 text-lg text-zinc-600">
                /100
              </span>
            </div>

            <div className="mt-6 h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full w-[82%] rounded-full bg-gradient-to-r from-violet-500 to-cyan-400" />
            </div>

            <p className="mt-4 text-sm text-zinc-500">
              Good overall health, but several issues should be addressed
              before production deployment.
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard
              label="High"
              value={highCount}
              description="Needs attention"
            />

            <StatCard
              label="Medium"
              value={mediumCount}
              description="Should review"
            />

            <StatCard
              label="Low"
              value={lowCount}
              description="Improvements"
            />
          </div>
        </div>

        {/* Summary bar */}
        <div className="mt-4 flex flex-col justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-5 py-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-medium text-zinc-200">
              {totalFindings} findings detected
            </p>

            <p className="mt-1 text-xs text-zinc-600">
              Architecture and security analysis
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs text-zinc-500">
            <span>{architectureFindings.length} architecture</span>
            <span>{securityFindings.length} security</span>
          </div>
        </div>

        {/* Architecture */}
        <section className="mt-10">
          <div className="mb-5 flex items-end justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-violet-400">
                Architecture
              </p>

              <h3 className="mt-2 text-xl font-semibold">
                Architecture Findings
              </h3>
            </div>

            <span className="text-xs text-zinc-600">
              {architectureFindings.length} findings
            </span>
          </div>

          <div className="space-y-3">
            {architectureFindings.map((finding, index) => (
              <FindingCard
                key={`architecture-${index}`}
                finding={finding}
              />
            ))}
          </div>
        </section>

        {/* Security */}
        <section className="mt-12">
          <div className="mb-5 flex items-end justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-red-400">
                Security
              </p>

              <h3 className="mt-2 text-xl font-semibold">
                Security Findings
              </h3>
            </div>

            <span className="text-xs text-zinc-600">
              {securityFindings.length} findings
            </span>
          </div>

          <div className="space-y-3">
            {securityFindings.map((finding, index) => (
              <FindingCard
                key={`security-${index}`}
                finding={finding}
              />
            ))}
          </div>
        </section>

        {/* Bottom CTA */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.025] p-6 sm:flex-row">
          <div>
            <p className="font-medium text-white">
              Want to analyze another repository?
            </p>

            <p className="mt-1 text-sm text-zinc-500">
              Start a new codebase scan from the dashboard.
            </p>
          </div>

          <Link
            href="/"
            className="rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-zinc-200"
          >
            New Scan →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 py-6 text-center text-xs text-zinc-600">
        AI-Powered Code Review System
      </footer>
    </main>
  );
}