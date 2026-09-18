"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Navbar from "../components/Navbar";
import type { ScanResult } from "@/lib/types";

const severityStyles = {
  high: {
    badge: "border-red-400/20 bg-red-400/10 text-red-300",
    dot: "bg-red-400",
  },
  medium: {
    badge: "border-amber-400/20 bg-amber-400/10 text-amber-300",
    dot: "bg-amber-400",
  },
  low: {
    badge: "border-blue-400/20 bg-blue-400/10 text-blue-300",
    dot: "bg-blue-400",
  },
  critical: {
    badge: "border-red-500/30 bg-red-500/10 text-red-200",
    dot: "bg-red-500",
  },
};

type Severity = keyof typeof severityStyles;

function FindingCard({
  title,
  explanation,
  severity,
  file,
  line,
}: {
  title: string;
  explanation: string;
  severity: Severity;
  file?: string;
  line?: number;
}) {
  const styles = severityStyles[severity];

  return (
    <div className="group rounded-xl border border-white/10 bg-white/[0.025] p-5 transition duration-300 hover:border-white/20 hover:bg-white/[0.04]">
      <div className="flex gap-4">
        <div
          className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${styles.dot}`}
        />

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="font-semibold text-white">
              {title}
            </h3>

            <span
              className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${styles.badge}`}
            >
              {severity}
            </span>
          </div>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
            {explanation}
          </p>

          {file && (
            <div className="mt-4 flex flex-wrap items-center gap-2 font-mono text-xs">
              <span className="rounded-md border border-white/10 bg-black/20 px-2.5 py-1.5 text-zinc-400">
                {file}
              </span>

              {line !== undefined && (
                <span className="rounded-md border border-white/10 bg-black/20 px-2.5 py-1.5 text-zinc-500">
                  Line {line}
                </span>
              )}
            </div>
          )}
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
  const config = {
    High: { icon: "!", tone: "border-red-400/20 bg-red-400/10 text-red-300" },
    Medium: { icon: "!", tone: "border-amber-400/20 bg-amber-400/10 text-amber-300" },
    Low: { icon: "i", tone: "border-blue-400/20 bg-blue-400/10 text-blue-300" },
  }[label] || { icon: "•", tone: "border-white/10 bg-white/[0.04] text-zinc-400" };

  return (
    <div className="group rounded-xl border border-white/10 bg-white/[0.025] p-5 transition duration-300 hover:border-white/20 hover:bg-white/[0.045]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600">
            {label} severity
          </p>

          <p className="mt-2 text-3xl font-bold text-white">{value}</p>
          <p className="mt-1 text-xs text-zinc-600">{description}</p>
        </div>

        <span className={`flex h-9 w-9 items-center justify-center rounded-lg border text-sm font-bold ${config.tone}`}>
          {config.icon}
        </span>
      </div>
    </div>
  );
}

function getHealthScore(scan: ScanResult) {
  const totalIssues = scan.summary.totalIssues;

  if (totalIssues === 0) {
    return 100;
  }

  const critical =
    scan.summary.securityCritical;

  const high =
    scan.summary.architectureHigh +
    scan.summary.securityHigh;

  const medium =
    scan.summary.architectureMedium +
    scan.summary.securityMedium;

  const low =
    scan.summary.architectureLow +
    scan.summary.securityLow;

  const penalty =
    critical * 15 +
    high * 10 +
    medium * 5 +
    low * 2;

  return Math.max(
    0,
    Math.min(100, 100 - penalty)
  );
}

function getHealthStatus(score: number) {
  if (score >= 90) {
    return {
      label: "Excellent",
      description:
        "The repository is in strong overall health.",
      badge:
        "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
      icon: "✓",
    };
  }

  if (score >= 75) {
    return {
      label: "Good",
      description:
        "A few improvements are recommended.",
      badge:
        "border-cyan-400/20 bg-cyan-400/10 text-cyan-300",
      icon: "✓",
    };
  }

  if (score >= 50) {
    return {
      label: "Needs Review",
      description:
        "Several findings should be reviewed.",
      badge:
        "border-amber-400/20 bg-amber-400/10 text-amber-300",
      icon: "!",
    };
  }

  return {
    label: "Critical Review",
    description:
      "Significant findings require attention.",
    badge:
      "border-red-400/20 bg-red-400/10 text-red-300",
    icon: "!",
  };
}

function getReviewSummary(scan: ScanResult) {
  const total = scan.summary.totalIssues;
  const critical = scan.summary.securityCritical;
  const high = scan.summary.architectureHigh + scan.summary.securityHigh;
  const medium = scan.summary.architectureMedium + scan.summary.securityMedium;

  if (total === 0) {
    return {
      title: "No findings detected",
      text: "The completed analysis did not report architecture or security findings for this scan.",
      tone: "border-emerald-400/15 bg-emerald-400/[0.035]",
      icon: "✓",
    };
  }

  if (critical > 0) {
    return {
      title: "Critical security findings require review",
      text: `${critical} critical security finding${critical === 1 ? "" : "s"} ${critical === 1 ? "was" : "were"} reported in this scan.`,
      tone: "border-red-400/15 bg-red-400/[0.035]",
      icon: "!",
    };
  }

  if (high > 0) {
    return {
      title: "High-priority findings detected",
      text: `${high} high-severity finding${high === 1 ? "" : "s"} ${high === 1 ? "was" : "were"} reported and should be reviewed.`,
      tone: "border-red-400/15 bg-red-400/[0.035]",
      icon: "!",
    };
  }

  if (medium > 0) {
    return {
      title: "Review recommended",
      text: `${medium} medium-severity finding${medium === 1 ? "" : "s"} ${medium === 1 ? "was" : "were"} reported in the completed analysis.`,
      tone: "border-amber-400/15 bg-amber-400/[0.035]",
      icon: "!",
    };
  }

  return {
    title: "Minor improvements identified",
    text: `${total} low-severity finding${total === 1 ? "" : "s"} ${total === 1 ? "was" : "were"} reported.`,
    tone: "border-blue-400/15 bg-blue-400/[0.035]",
    icon: "i",
  };
}

export default function ScanReport() {
  const searchParams = useSearchParams();
  const scanId = searchParams.get("scanId");

  const [scan, setScan] = useState<ScanResult | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!scanId) {
      setError("No scan ID was provided.");
      setLoading(false);
      return;
    }

    let intervalId: ReturnType<typeof setInterval> | null =
      null;

    const fetchScan = async () => {
      try {
        const response = await fetch(
          `/api/scans/${scanId}`,
          {
            cache: "no-store",
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error || "Failed to fetch scan."
          );
        }

        setScan(data);

        if (
          data.status === "complete" ||
          data.status === "failed"
        ) {
          setLoading(false);

          if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
          }
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to fetch scan results."
        );

        setLoading(false);

        if (intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
      }
    };

    fetchScan();

    intervalId = setInterval(
      fetchScan,
      2000
    );

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [scanId]);

  // No scan ID
  if (!scanId) {
    return (
      <main className="min-h-screen bg-[#09090b] text-white">
        <Navbar />

        <section className="mx-auto flex min-h-[70vh] max-w-3xl flex-col items-center justify-center px-6 text-center">
          <div className="rounded-full border border-red-400/20 bg-red-400/10 px-4 py-2 text-sm text-red-300">
            Missing Scan ID
          </div>

          <h2 className="mt-6 text-2xl font-bold">
            No scan was selected
          </h2>

          <p className="mt-2 text-sm text-zinc-500">
            Start a repository analysis from the dashboard.
          </p>

          <Link
            href="/"
            className="mt-6 rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-zinc-200"
          >
            Back to Dashboard
          </Link>
        </section>
      </main>
    );
  }

  // Initial loading state
  if (loading && !scan) {
    return (
      <main className="min-h-screen bg-[#09090b] text-white">
        <Navbar />

        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute left-1/2 top-[-300px] h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-violet-600/10 blur-[120px]" />

          <div className="absolute bottom-[-250px] right-[-150px] h-[500px] w-[500px] rounded-full bg-blue-600/10 blur-[120px]" />
        </div>

        <section className="relative z-10 mx-auto flex min-h-[75vh] max-w-3xl flex-col items-center justify-center px-6 text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/10 border-t-violet-400" />

          <h2 className="mt-6 text-2xl font-bold">
            Scan in progress
          </h2>

          <p className="mt-2 max-w-md text-sm leading-6 text-zinc-500">
            Your repository is being analyzed for architectural
            problems and security issues.
          </p>

          <div className="mt-6 rounded-lg border border-white/10 bg-white/[0.025] px-4 py-3">
            <p className="text-[10px] uppercase tracking-wider text-zinc-600">
              Scan ID
            </p>

            <p className="mt-1 font-mono text-xs text-zinc-400">
              {scanId}
            </p>
          </div>

          <p className="mt-5 text-xs text-zinc-600">
            This page automatically checks for updates.
          </p>
        </section>
      </main>
    );
  }

  // Error state
  if (error) {
    return (
      <main className="min-h-screen bg-[#09090b] text-white">
        <Navbar />

        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute left-1/2 top-[-300px] h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-red-600/5 blur-[120px]" />
        </div>

        <section className="relative z-10 mx-auto flex min-h-[75vh] max-w-3xl flex-col items-center justify-center px-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-red-400/20 bg-red-400/10 text-2xl">
            !
          </div>

          <h2 className="mt-6 text-2xl font-bold">
            Unable to load scan
          </h2>

          <p className="mt-3 max-w-lg text-sm leading-6 text-zinc-500">
            {error}
          </p>

          <Link
            href="/"
            className="mt-6 rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-zinc-200"
          >
            Back to Dashboard
          </Link>
        </section>
      </main>
    );
  }

  // Failed scan
  if (scan?.status === "failed") {
    return (
      <main className="min-h-screen bg-[#09090b] text-white">
        <Navbar />

        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute left-1/2 top-[-300px] h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-red-600/5 blur-[120px]" />
        </div>

        <section className="relative z-10 mx-auto flex min-h-[75vh] max-w-3xl flex-col items-center justify-center px-6 text-center">
          <div className="rounded-full border border-red-400/20 bg-red-400/10 px-4 py-2 text-sm text-red-300">
            Scan failed
          </div>

          <h2 className="mt-6 text-2xl font-bold">
            Repository analysis failed
          </h2>

          <p className="mt-3 max-w-lg text-sm leading-6 text-zinc-500">
            {scan.errorMessage ||
              "The scan could not be completed."}
          </p>

          <div className="mt-6 flex gap-3">
            <Link
              href="/"
              className="rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-zinc-200"
            >
              New Scan
            </Link>

            <button
              onClick={() =>
                window.location.reload()
              }
              className="rounded-lg border border-white/10 bg-white/[0.04] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/[0.08]"
            >
              Retry
            </button>
          </div>
        </section>
      </main>
    );
  }

  if (!scan) {
    return null;
  }

  const architectureFindings =
    scan.architectureFindings;

  const securityFindings =
    scan.securityFindings;

  const highCount =
    scan.summary.architectureHigh +
    scan.summary.securityHigh;

  const mediumCount =
    scan.summary.architectureMedium +
    scan.summary.securityMedium;

  const lowCount =
    scan.summary.architectureLow +
    scan.summary.securityLow;

  const totalFindings =
    scan.summary.totalIssues;

  const healthScore =
    getHealthScore(scan);

  const healthStatus =
    getHealthStatus(healthScore);

  const reviewSummary = getReviewSummary(scan);

  const startedTime =
    new Date(
      scan.startedAt
    ).toLocaleString("en-IN");

  const completedTime = scan.completedAt
    ? new Date(
        scan.completedAt
      ).toLocaleString("en-IN")
    : null;

  return (
    <main className="min-h-screen bg-[#09090b] text-white">
      <Navbar />

      {/* Background glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-[-300px] h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-violet-600/10 blur-[120px]" />

        <div className="absolute bottom-[-250px] right-[-150px] h-[500px] w-[500px] translate-x-1/3 rounded-full bg-blue-600/10 blur-[120px]" />
      </div>

      {/* Main */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 py-10">
        {/* Header */}
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/5 px-3 py-1 text-xs font-medium text-emerald-300">
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-400/10">
                  ✓
                </span>
                Scan completed
              </span>

              <span className="text-xs text-zinc-600">
                {completedTime || startedTime}
              </span>
            </div>

            <h2 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl">
              Scan Report
            </h2>

            <p className="mt-2 break-all font-mono text-sm text-zinc-500">
              {scan.ownerAndRepo || scan.repoUrl}
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-xs text-zinc-500">
                {scan.triggeredBy ===
                "on-demand"
                  ? "Manual scan"
                  : "Push triggered"}
              </span>

              <span className="rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1.5 font-mono text-[10px] text-zinc-600">
                ID: {scan.id}
              </span>
            </div>
          </div>

          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-zinc-300 transition hover:bg-white/[0.08] hover:text-white"
          >
            ← Analyze another repository
          </Link>
        </div>

        {/* Health + Overview */}
        <div className="mt-8 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
          {/* Health Score */}
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025] p-7">
            <div className="pointer-events-none absolute right-[-80px] top-[-80px] h-56 w-56 rounded-full bg-violet-500/10 blur-[70px]" />

            <div className="relative">
              <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">
                    Overall Code Health
                  </p>

                  <div className="mt-4 flex items-end gap-2">
                    <span className="text-6xl font-bold tracking-tight sm:text-7xl">
                      {healthScore}
                    </span>

                    <span className="mb-2 text-lg text-zinc-600">
                      /100
                    </span>
                  </div>
                </div>

                <div
                  className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${healthStatus.badge}`}
                >
                  <span>
                    {healthStatus.icon}
                  </span>

                  {healthStatus.label}
                </div>
              </div>

              {/* Progress */}
              <div className="mt-6">
                <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-wider text-zinc-600">
                  <span>Code health</span>
                  <span>{healthScore}%</span>
                </div>

                <div className="h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 transition-all duration-700"
                    style={{
                      width: `${healthScore}%`,
                    }}
                  />
                </div>
              </div>

              <p className="mt-4 text-sm leading-6 text-zinc-500">
                {healthStatus.description}
                {totalFindings > 0 && (
                  <>
                    {" "}
                    {totalFindings} issue
                    {totalFindings === 1
                      ? ""
                      : "s"} detected across architecture
                    and security analysis.
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Scan Overview */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-7">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">
              Scan Overview
            </p>

            <h3 className="mt-2 text-xl font-semibold text-white">
              Analysis results
            </h3>

            <div className="mt-6 space-y-3">
              <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-md bg-violet-400/10 text-xs text-violet-300">
                    A
                  </span>

                  <span className="text-sm text-zinc-300">
                    Architecture
                  </span>
                </div>

                <span className="font-semibold text-white">
                  {architectureFindings.length}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-md bg-red-400/10 text-xs text-red-300">
                    S
                  </span>

                  <span className="text-sm text-zinc-300">
                    Security
                  </span>
                </div>

                <span className="font-semibold text-white">
                  {securityFindings.length}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-400/10 text-xs text-emerald-300">
                    ✓
                  </span>

                  <span className="text-sm text-zinc-300">
                    Total findings
                  </span>
                </div>

                <span className="font-semibold text-white">
                  {totalFindings}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Severity Statistics */}
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
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

        {/* Architecture */}
        <section className="mt-10">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-violet-400">
                Architecture
              </p>

              <h3 className="mt-2 text-xl font-semibold">
                Architecture Findings
              </h3>

              <p className="mt-1 text-sm text-zinc-500">
                Structural and maintainability observations from the codebase.
              </p>
            </div>

            <span className="text-xs text-zinc-600">
              {architectureFindings.length} findings
            </span>
          </div>

          {architectureFindings.length === 0 ? (
            <div className="rounded-xl border border-emerald-400/10 bg-emerald-400/[0.025] p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-emerald-400/20 bg-emerald-400/10 text-emerald-300">
                  ✓
                </span>

                <div>
                  <p className="text-sm font-medium text-emerald-200">
                    No architecture issues detected
                  </p>

                  <p className="mt-1 text-xs text-zinc-600">
                    The architecture analysis did not report any findings.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {architectureFindings.map(
                (finding) => (
                  <FindingCard
                    key={finding.id}
                    title={finding.title}
                    explanation={finding.explanation}
                    severity={finding.severity}
                    file={
                      finding.affectedFiles?.[0]
                    }
                  />
                )
              )}
            </div>
          )}
        </section>

        {/* Security */}
        <section className="mt-12">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-red-400">
                Security
              </p>

              <h3 className="mt-2 text-xl font-semibold">
                Security Findings
              </h3>

              <p className="mt-1 text-sm text-zinc-500">
                Security issues identified during static analysis.
              </p>
            </div>

            <span className="text-xs text-zinc-600">
              {securityFindings.length} findings
            </span>
          </div>

          {securityFindings.length === 0 ? (
            <div className="rounded-xl border border-emerald-400/10 bg-emerald-400/[0.025] p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-emerald-400/20 bg-emerald-400/10 text-emerald-300">
                  ✓
                </span>

                <div>
                  <p className="text-sm font-medium text-emerald-200">
                    No security issues detected
                  </p>

                  <p className="mt-1 text-xs text-zinc-600">
                    The security analysis did not report any findings.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {securityFindings.map(
                (finding) => (
                  <FindingCard
                    key={finding.id}
                    title={finding.title}
                    explanation={finding.explanation}
                    severity={finding.severity}
                    file={finding.filePath}
                    line={finding.startLine}
                  />
                )
              )}
            </div>
          )}
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
        AI-Based Repo Review System
      </footer>
    </main>
  );
}