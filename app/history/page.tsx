"use client";

import Link from "next/link";
import Navbar from "../components/Navbar";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type Scan = {
  id: number;
  date: string;
  time: string;
  score: number;
  high: number;
  medium: number;
  low: number;
  trigger: "Manual" | "Push";
  regression: boolean;
};

const scanHistory: Scan[] = [
  {
    id: 1,
    date: "Sep 14",
    time: "04:20 PM",
    score: 82,
    high: 2,
    medium: 3,
    low: 2,
    trigger: "Push",
    regression: true,
  },
  {
    id: 2,
    date: "Sep 13",
    time: "06:45 PM",
    score: 86,
    high: 1,
    medium: 3,
    low: 1,
    trigger: "Push",
    regression: false,
  },
  {
    id: 3,
    date: "Sep 12",
    time: "11:30 AM",
    score: 91,
    high: 1,
    medium: 1,
    low: 1,
    trigger: "Manual",
    regression: false,
  },
  {
    id: 4,
    date: "Sep 10",
    time: "03:15 PM",
    score: 94,
    high: 0,
    medium: 2,
    low: 1,
    trigger: "Push",
    regression: false,
  },
  {
    id: 5,
    date: "Sep 08",
    time: "10:10 AM",
    score: 96,
    high: 0,
    medium: 1,
    low: 1,
    trigger: "Manual",
    regression: false,
  },
];

const chartData = [...scanHistory].reverse().map((scan) => ({
  date: scan.date,
  High: scan.high,
  Medium: scan.medium,
  Low: scan.low,
}));

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

function TriggerBadge({ trigger }: { trigger: Scan["trigger"] }) {
  return (
    <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-zinc-400">
      {trigger}
    </span>
  );
}

export default function HistoryPage() {
  const latestScan = scanHistory[0];

  const totalHigh = scanHistory.reduce(
    (total, scan) => total + scan.high,
    0
  );

  const totalMedium = scanHistory.reduce(
    (total, scan) => total + scan.medium,
    0
  );

  const totalLow = scanHistory.reduce(
    (total, scan) => total + scan.low,
    0
  );

  return (
    <main className="min-h-screen bg-[#09090b] text-white">
      <Navbar/>
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

          <div className="flex items-center gap-5 text-sm">
            <Link
              href="/scan"
              className="text-zinc-500 transition hover:text-white"
            >
              Latest Scan
            </Link>

            <span className="text-white">History</span>
          </div>
        </div>
      </nav>

      {/* Main */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 py-10">
        {/* Header */}
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-violet-400/20 bg-violet-400/5 px-3 py-1 text-xs text-violet-300">
              Scan history
            </span>

            <span className="text-xs text-zinc-600">
              {scanHistory.length} total scans
            </span>
          </div>

          <h2 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl">
            History & Trends
          </h2>

          <p className="mt-2 font-mono text-sm text-zinc-500">
            github.com/example/sample-project
          </p>
        </div>

        {/* Top statistics */}
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <StatCard
            label="High Severity"
            value={totalHigh}
            description="Across all scans"
          />

          <StatCard
            label="Medium Severity"
            value={totalMedium}
            description="Across all scans"
          />

          <StatCard
            label="Low Severity"
            value={totalLow}
            description="Across all scans"
          />
        </div>

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
                Track how issue severity changes across scans.
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
            <ResponsiveContainer width="100%" height="100%">
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
                  dataKey="date"
                  tick={{
                    fill: "#71717a",
                    fontSize: 11,
                  }}
                  axisLine={false}
                  tickLine={false}
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
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "10px",
                    color: "#fff",
                  }}
                  labelStyle={{
                    color: "#a1a1aa",
                  }}
                />

                <Line
                  type="monotone"
                  dataKey="High"
                  stroke="#f87171"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />

                <Line
                  type="monotone"
                  dataKey="Medium"
                  stroke="#fbbf24"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />

                <Line
                  type="monotone"
                  dataKey="Low"
                  stroke="#60a5fa"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Regression */}
        {latestScan.regression && (
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
                  The latest push introduced new findings compared with
                  the previous scan. Review the new security and
                  architecture issues before merging additional changes.
                </p>

                <div className="mt-4 flex flex-wrap gap-3 text-xs">
                  <span className="rounded-md border border-red-400/10 bg-black/20 px-3 py-2 text-red-200/70">
                    +1 High
                  </span>

                  <span className="rounded-md border border-red-400/10 bg-black/20 px-3 py-2 text-red-200/70">
                    +0 Medium
                  </span>

                  <span className="rounded-md border border-red-400/10 bg-black/20 px-3 py-2 text-red-200/70">
                    +1 Low
                  </span>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Scan History */}
        <section className="mt-10">
          <div className="mb-5">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-blue-400">
              Timeline
            </p>

            <h3 className="mt-2 text-xl font-semibold">
              Recent Scans
            </h3>
          </div>

          <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025]">
            {scanHistory.map((scan, index) => (
              <div
                key={scan.id}
                className={`flex flex-col gap-5 p-5 transition hover:bg-white/[0.03] sm:flex-row sm:items-center sm:justify-between ${
                  index !== scanHistory.length - 1
                    ? "border-b border-white/10"
                    : ""
                }`}
              >
                {/* Date */}
                <div className="min-w-[150px]">
                  <p className="font-medium text-white">{scan.date}</p>

                  <p className="mt-1 text-xs text-zinc-600">
                    {scan.time}
                  </p>
                </div>

                {/* Score */}
                <div>
                  <p className="text-xs uppercase tracking-wider text-zinc-600">
                    Health
                  </p>

                  <p className="mt-1 text-xl font-bold text-white">
                    {scan.score}
                    <span className="text-xs font-normal text-zinc-600">
                      /100
                    </span>
                  </p>
                </div>

                {/* Findings */}
                <div className="flex gap-2">
                  <span className="rounded-md border border-red-400/10 bg-red-400/5 px-2.5 py-1.5 text-xs text-red-300">
                    {scan.high} High
                  </span>

                  <span className="rounded-md border border-amber-400/10 bg-amber-400/5 px-2.5 py-1.5 text-xs text-amber-300">
                    {scan.medium} Med
                  </span>

                  <span className="rounded-md border border-blue-400/10 bg-blue-400/5 px-2.5 py-1.5 text-xs text-blue-300">
                    {scan.low} Low
                  </span>
                </div>

                {/* Trigger */}
                <div className="flex items-center gap-3">
                  <TriggerBadge trigger={scan.trigger} />

                  {scan.regression && (
                    <span className="rounded-full border border-red-400/20 bg-red-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-red-300">
                      Regression
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Bottom buttons */}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/scan"
            className="rounded-lg border border-white/10 bg-white/[0.04] px-5 py-3 text-center text-sm font-medium text-zinc-300 transition hover:bg-white/[0.08] hover:text-white"
          >
            ← View Latest Scan
          </Link>

          <Link
            href="/"
            className="rounded-lg bg-white px-5 py-3 text-center text-sm font-semibold text-black transition hover:bg-zinc-200"
          >
            Analyze New Repository →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 mt-10 border-t border-white/10 py-6 text-center text-xs text-zinc-600">
        AI-Powered Code Review System
      </footer>
    </main>
  );
}