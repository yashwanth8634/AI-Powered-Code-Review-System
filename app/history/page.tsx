"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import Navbar from "../components/Navbar";
import type { ScanResult } from "@/lib/types";

function getHealthScore(scan: ScanResult) {
  const { summary } = scan;

  if (summary.totalIssues === 0) {
    return 100;
  }

  const penalty =
    summary.securityCritical * 15 +
    (summary.architectureHigh + summary.securityHigh) * 10 +
    (summary.architectureMedium + summary.securityMedium) * 5 +
    (summary.architectureLow + summary.securityLow) * 2;

  return Math.max(0, Math.min(100, 100 - penalty));
}

function getSeverityCounts(scan: ScanResult) {
  return {
    high:
      scan.summary.architectureHigh +
      scan.summary.securityHigh,

    medium:
      scan.summary.architectureMedium +
      scan.summary.securityMedium,

    low:
      scan.summary.architectureLow +
      scan.summary.securityLow,
  };
}

function formatDate(dateString: string) {
  if (!dateString) {
    return "Unknown date";
  }

  return new Date(dateString).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(dateString: string) {
  if (!dateString) {
    return "";
  }

  return new Date(dateString).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Chart label:
 * Shows both date and time so multiple scans on the same day
 * are clearly distinguishable.
 */
function formatChartLabel(dateString: string) {
  if (!dateString) {
    return "Unknown";
  }

  const date = new Date(dateString);

  const datePart = date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  });

  const timePart = date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return `${datePart} • ${timePart}`;
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
    <div className="rounded-xl border border-white/10 bg-white/[0.025] p-5 transition hover:border-white/15 hover:bg-white/[0.04]">
      <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
        {label}
      </p>

      <p className="mt-2 text-3xl font-bold text-white">
        {value}
      </p>

      <p className="mt-1 text-xs text-zinc-600">
        {description}
      </p>
    </div>
  );
}

function TriggerBadge({
  trigger,
}: {
  trigger: ScanResult["triggeredBy"];
}) {
  return (
    <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-zinc-400">
      {trigger === "on-demand" ? "Manual" : "Push"}
    </span>
  );
}

function StatusBadge({
  status,
}: {
  status: ScanResult["status"];
}) {
  if (status === "complete") {
    return (
      <span className="rounded-full border border-emerald-400/20 bg-emerald-400/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
        Complete
      </span>
    );
  }

  if (status === "running") {
    return (
      <span className="rounded-full border border-amber-400/20 bg-amber-400/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-amber-300">
        Running
      </span>
    );
  }

  if (status === "pending") {
    return (
      <span className="rounded-full border border-blue-400/20 bg-blue-400/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-blue-300">
        Pending
      </span>
    );
  }

  return (
    <span className="rounded-full border border-red-400/20 bg-red-400/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-red-300">
      Failed
    </span>
  );
}

export default function HistoryPage() {
  const [scans, setScans] = useState<ScanResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const fetchHistory = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const response = await fetch("/api/scans?limit=100", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to load scan history."
        );
      }

      if (!Array.isArray(data)) {
        throw new Error("Invalid scan history response.");
      }

      setScans(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load scan history."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const completedScans = useMemo(() => {
    return scans.filter(
      (scan) => scan.status === "complete"
    );
  }, [scans]);

  const latestScan = completedScans[0];

  const totalHigh = completedScans.reduce(
    (total, scan) =>
      total + getSeverityCounts(scan).high,
    0
  );

  const totalMedium = completedScans.reduce(
    (total, scan) =>
      total + getSeverityCounts(scan).medium,
    0
  );

  const totalLow = completedScans.reduce(
    (total, scan) =>
      total + getSeverityCounts(scan).low,
    0
  );

  const totalIssues =
    totalHigh + totalMedium + totalLow;

  const averageHealth = useMemo(() => {
    if (completedScans.length === 0) {
      return 0;
    }

    const totalScore = completedScans.reduce(
      (total, scan) =>
        total + getHealthScore(scan),
      0
    );

    return Math.round(
      totalScore / completedScans.length
    );
  }, [completedScans]);

  /**
   * Trend chart data.
   *
   * The API returns newest scans first, so reverse the list
   * to display the trend chronologically from oldest → newest.
   */
  const chartData = useMemo(() => {
    return [...completedScans]
      .reverse()
      .map((scan) => {
        const counts = getSeverityCounts(scan);

        return {
          label: formatChartLabel(scan.startedAt),
          high: counts.high,
          medium: counts.medium,
          low: counts.low,
        };
      });
  }, [completedScans]);

  const regression = useMemo(() => {
    if (completedScans.length < 2) {
      return null;
    }

    const current = getSeverityCounts(
      completedScans[0]
    );

    const previous = getSeverityCounts(
      completedScans[1]
    );

    const highIncrease = Math.max(
      0,
      current.high - previous.high
    );

    const mediumIncrease = Math.max(
      0,
      current.medium - previous.medium
    );

    const lowIncrease = Math.max(
      0,
      current.low - previous.low
    );

    if (
      highIncrease === 0 &&
      mediumIncrease === 0 &&
      lowIncrease === 0
    ) {
      return null;
    }

    return {
      high: highIncrease,
      medium: mediumIncrease,
      low: lowIncrease,
    };
  }, [completedScans]);

  return (
    <main className="min-h-screen bg-[#09090b] text-white">
      <Navbar />

      {/* Background glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-[-300px] h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-violet-600/10 blur-[120px]" />

        <div className="absolute bottom-[-250px] right-[-150px] h-[500px] w-[500px] rounded-full bg-blue-600/10 blur-[120px]" />
      </div>

      {/* Main */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 py-10">
        {/* Header */}
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-violet-400/20 bg-violet-400/5 px-3 py-1 text-xs text-violet-300">
                Scan history
              </span>

              <span className="text-xs text-zinc-600">
                {completedScans.length} completed scan
                {completedScans.length === 1
                  ? ""
                  : "s"}
              </span>
            </div>

            <h2 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl">
              History & Trends
            </h2>

            <p className="mt-2 max-w-2xl text-sm text-zinc-500">
              Review previous repository scans and track
              finding trends over time.
            </p>

            {latestScan && (
              <p className="mt-3 break-all font-mono text-xs text-zinc-600">
                Latest repository:{" "}
                {latestScan.ownerAndRepo}
              </p>
            )}
          </div>

          {/* Refresh */}
          <button
            onClick={() => fetchHistory(true)}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 self-start rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-zinc-300 transition hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed disabled:opacity-50 lg:self-auto"
          >
            <span
              className={
                refreshing
                  ? "animate-spin"
                  : ""
              }
            >
              ↻
            </span>

            {refreshing
              ? "Refreshing..."
              : "Refresh History"}
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.025] p-8">
            <div className="flex items-center gap-4">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/10 border-t-violet-400" />

              <div>
                <p className="text-sm font-medium text-white">
                  Loading scan history...
                </p>

                <p className="mt-1 text-xs text-zinc-600">
                  Fetching previous scans from the database.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="mt-8 rounded-2xl border border-red-400/20 bg-red-400/[0.04] p-6">
            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-red-400/20 bg-red-400/10 text-red-300">
                !
              </div>

              <div className="flex-1">
                <h3 className="font-semibold text-red-200">
                  Unable to load history
                </h3>

                <p className="mt-2 text-sm leading-6 text-red-200/60">
                  {error}
                </p>

                <button
                  onClick={() => fetchHistory(true)}
                  disabled={refreshing}
                  className="mt-4 rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-medium text-zinc-300 transition hover:bg-white/[0.08] hover:text-white disabled:opacity-50"
                >
                  {refreshing
                    ? "Retrying..."
                    : "Try Again"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Empty */}
        {!loading &&
          !error &&
          completedScans.length === 0 && (
            <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.025] p-10 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-xl">
                ↗
              </div>

              <h3 className="mt-5 text-xl font-semibold">
                No completed scans yet
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-500">
                Start a repository analysis and your
                completed scans will appear here
                automatically.
              </p>

              <Link
                href="/"
                className="mt-6 inline-flex rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-zinc-200"
              >
                Analyze Repository
              </Link>
            </div>
          )}

        {/* Real History */}
        {!loading &&
          !error &&
          completedScans.length > 0 && (
            <>
              {/* Statistics */}
              <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  label="Total Issues"
                  value={totalIssues}
                  description="Across completed scans"
                />

                <StatCard
                  label="High Severity"
                  value={totalHigh}
                  description="Needs attention"
                />

                <StatCard
                  label="Medium Severity"
                  value={totalMedium}
                  description="Should review"
                />

                <StatCard
                  label="Average Health"
                  value={averageHealth}
                  description="Across completed scans"
                />
              </div>

              {/* Latest scan summary */}
              {latestScan && (
                <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.025] p-6">
                  <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <p className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-400">
                          Latest scan
                        </p>

                        <StatusBadge
                          status={latestScan.status}
                        />
                      </div>

                      <h3 className="mt-2 break-all text-lg font-semibold text-white">
                        {latestScan.ownerAndRepo}
                      </h3>

                      <div className="mt-2 flex flex-wrap gap-3 text-xs text-zinc-600">
                        <span>
                          {formatDate(
                            latestScan.startedAt
                          )}
                        </span>

                        <span>•</span>

                        <span>
                          {formatTime(
                            latestScan.startedAt
                          )}
                        </span>

                        <span>•</span>

                        <span>
                          {latestScan.triggeredBy ===
                          "on-demand"
                            ? "Manual scan"
                            : "Push triggered"}
                        </span>
                      </div>
                    </div>

                    <Link
                      href={`/scan?scanId=${latestScan.id}`}
                      className="rounded-lg bg-white px-5 py-2.5 text-center text-sm font-semibold text-black transition hover:bg-zinc-200"
                    >
                      View Latest Report →
                    </Link>
                  </div>
                </section>
              )}

              {/* Trend Chart */}
              <section className="mt-10 rounded-2xl border border-white/10 bg-white/[0.025] p-6 sm:p-8">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.2em] text-violet-400">
                      Analytics
                    </p>

                    <h3 className="mt-2 text-xl font-semibold">
                      Finding Trends
                    </h3>

                    <p className="mt-1 text-sm text-zinc-500">
                      Track how issue severity changes
                      across completed scans.
                    </p>
                  </div>

                  <div className="flex gap-4 text-xs text-zinc-500">
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-red-400" />
                      High
                    </span>

                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-amber-400" />
                      Medium
                    </span>

                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-blue-400" />
                      Low
                    </span>
                  </div>
                </div>

                <div className="mt-8 h-[320px] w-full">
                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                  >
                    <LineChart
                      data={chartData}
                      margin={{
                        top: 10,
                        right: 10,
                        left: -20,
                        bottom: 5,
                      }}
                    >
                      <CartesianGrid
                        stroke="rgba(255,255,255,0.08)"
                        vertical={false}
                      />

                      <XAxis
                        dataKey="label"
                        tick={{
                          fill: "#71717a",
                          fontSize: 10,
                        }}
                        axisLine={false}
                        tickLine={false}
                        minTickGap={20}
                      />

                      <YAxis
                        allowDecimals={false}
                        tick={{
                          fill: "#71717a",
                          fontSize: 11,
                        }}
                        axisLine={false}
                        tickLine={false}
                      />

                      <Tooltip
                        contentStyle={{
                          background: "#18181b",
                          border:
                            "1px solid rgba(255,255,255,0.1)",
                          borderRadius: "10px",
                          color: "#fff",
                        }}
                        labelStyle={{
                          color: "#a1a1aa",
                          marginBottom: "6px",
                        }}
                        labelFormatter={(label) =>
                          `Scan: ${label}`
                        }
                      />

                      <Line
                        type="monotone"
                        dataKey="high"
                        name="High"
                        stroke="#f87171"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        activeDot={{ r: 5 }}
                      />

                      <Line
                        type="monotone"
                        dataKey="medium"
                        name="Medium"
                        stroke="#fbbf24"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        activeDot={{ r: 5 }}
                      />

                      <Line
                        type="monotone"
                        dataKey="low"
                        name="Low"
                        stroke="#60a5fa"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Chart insight */}
                {completedScans.length >= 2 && (
                  <div className="mt-5 rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3">
                    <p className="text-xs text-zinc-500">
                      <span className="font-medium text-zinc-300">
                        Trend insight:
                      </span>{" "}
                      {(() => {
                        const newest =
                          getSeverityCounts(
                            completedScans[0]
                          );

                        const previous =
                          getSeverityCounts(
                            completedScans[1]
                          );

                        const newestTotal =
                          newest.high +
                          newest.medium +
                          newest.low;

                        const previousTotal =
                          previous.high +
                          previous.medium +
                          previous.low;

                        if (
                          newestTotal < previousTotal
                        ) {
                          return `Findings decreased from ${previousTotal} to ${newestTotal} in the latest scan.`;
                        }

                        if (
                          newestTotal > previousTotal
                        ) {
                          return `Findings increased from ${previousTotal} to ${newestTotal} in the latest scan.`;
                        }

                        return "The total number of findings is unchanged from the previous scan.";
                      })()}
                    </p>
                  </div>
                )}
              </section>

              {/* Regression */}
              {regression && (
                <section className="mt-6 rounded-2xl border border-red-400/20 bg-red-400/[0.04] p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-red-400/20 bg-red-400/10 text-red-300">
                      !
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="font-semibold text-red-200">
                          Regression detected
                        </h3>

                        <span className="rounded-full border border-red-400/20 bg-red-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-red-300">
                          New issues
                        </span>
                      </div>

                      <p className="mt-2 max-w-3xl text-sm leading-6 text-red-200/60">
                        The latest completed scan has
                        more findings in one or more
                        severity categories than the
                        previous scan.
                      </p>

                      <div className="mt-4 flex flex-wrap gap-3 text-xs">
                        {regression.high > 0 && (
                          <span className="rounded-md border border-red-400/10 bg-black/20 px-3 py-2 text-red-200/70">
                            +{regression.high} High
                          </span>
                        )}

                        {regression.medium > 0 && (
                          <span className="rounded-md border border-amber-400/10 bg-black/20 px-3 py-2 text-amber-200/70">
                            +{regression.medium} Medium
                          </span>
                        )}

                        {regression.low > 0 && (
                          <span className="rounded-md border border-blue-400/10 bg-black/20 px-3 py-2 text-blue-200/70">
                            +{regression.low} Low
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {/* Timeline */}
              <section className="mt-10">
                <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.2em] text-blue-400">
                      Timeline
                    </p>

                    <h3 className="mt-2 text-xl font-semibold">
                      Recent Scans
                    </h3>
                  </div>

                  <p className="text-xs text-zinc-600">
                    Newest scans appear first
                  </p>
                </div>

                <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025]">
                  {completedScans.map(
                    (scan, index) => {
                      const counts =
                        getSeverityCounts(scan);

                      const score =
                        getHealthScore(scan);

                      const previousScan =
                        completedScans[index + 1];

                      let scanRegression = false;

                      if (previousScan) {
                        const previousCounts =
                          getSeverityCounts(
                            previousScan
                          );

                        scanRegression =
                          counts.high >
                            previousCounts.high ||
                          counts.medium >
                            previousCounts.medium ||
                          counts.low >
                            previousCounts.low;
                      }

                      return (
                        <div
                          key={scan.id}
                          className={`flex flex-col gap-5 p-5 transition hover:bg-white/[0.03] lg:flex-row lg:items-center lg:justify-between ${
                            index !==
                            completedScans.length - 1
                              ? "border-b border-white/10"
                              : ""
                          }`}
                        >
                          {/* Date */}
                          <div className="min-w-[150px]">
                            <p className="font-medium text-white">
                              {formatDate(
                                scan.startedAt
                              )}
                            </p>

                            <p className="mt-1 text-xs text-zinc-600">
                              {formatTime(
                                scan.startedAt
                              )}
                            </p>
                          </div>

                          {/* Repository */}
                          <div className="min-w-0 flex-1 lg:max-w-[260px]">
                            <p className="text-xs uppercase tracking-wider text-zinc-600">
                              Repository
                            </p>

                            <p className="mt-1 truncate font-mono text-xs text-zinc-400">
                              {scan.ownerAndRepo}
                            </p>
                          </div>

                          {/* Health */}
                          <div>
                            <p className="text-xs uppercase tracking-wider text-zinc-600">
                              Health
                            </p>

                            <p className="mt-1 text-xl font-bold text-white">
                              {score}

                              <span className="text-xs font-normal text-zinc-600">
                                /100
                              </span>
                            </p>
                          </div>

                          {/* Findings */}
                          <div className="flex flex-wrap gap-2">
                            <span className="rounded-md border border-red-400/10 bg-red-400/5 px-2.5 py-1.5 text-xs text-red-300">
                              {counts.high} High
                            </span>

                            <span className="rounded-md border border-amber-400/10 bg-amber-400/5 px-2.5 py-1.5 text-xs text-amber-300">
                              {counts.medium} Med
                            </span>

                            <span className="rounded-md border border-blue-400/10 bg-blue-400/5 px-2.5 py-1.5 text-xs text-blue-300">
                              {counts.low} Low
                            </span>
                          </div>

                          {/* Status + Trigger */}
                          <div className="flex flex-wrap items-center gap-2">
                            <StatusBadge
                              status={scan.status}
                            />

                            <TriggerBadge
                              trigger={
                                scan.triggeredBy
                              }
                            />

                            {scanRegression && (
                              <span className="rounded-full border border-red-400/20 bg-red-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-red-300">
                                Regression
                              </span>
                            )}
                          </div>

                          {/* Report */}
                          <Link
                            href={`/scan?scanId=${scan.id}`}
                            className="rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2 text-center text-xs font-medium text-zinc-300 transition hover:bg-white/[0.08] hover:text-white"
                          >
                            View Report →
                          </Link>
                        </div>
                      );
                    }
                  )}
                </div>
              </section>

              {/* Bottom Actions */}
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/"
                  className="rounded-lg bg-white px-5 py-3 text-center text-sm font-semibold text-black transition hover:bg-zinc-200"
                >
                  Analyze New Repository
                </Link>

                {latestScan && (
                  <Link
                    href={`/scan?scanId=${latestScan.id}`}
                    className="rounded-lg border border-white/10 bg-white/[0.04] px-5 py-3 text-center text-sm font-medium text-zinc-300 transition hover:bg-white/[0.08] hover:text-white"
                  >
                    View Latest Scan
                  </Link>
                )}
              </div>
            </>
          )}
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 py-6 text-center text-xs text-zinc-600">
        AI-Based Repo Review System
      </footer>
    </main>
  );
}