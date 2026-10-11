"use client";

import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";

type ScanSettings = {
  skipArchitecture: boolean;
  skipSecurity: boolean;
  minSeverity: "high" | "medium" | "low";
};

type Repository = {
  ownerAndRepo: string;
  cloneUrl?: string;
  connectedAt?: string;
  settings?: ScanSettings;
};

const defaultSettings: ScanSettings = { skipArchitecture: false, skipSecurity: false, minSeverity: "low" };

export default function SettingsPage() {
  const [repository, setRepository] = useState<Repository | null>(null);
  const [settings, setSettings] = useState<ScanSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadRepository() {
      try {
        const response = await fetch("/api/github/connect");
        if (!response.ok) throw new Error("Failed to load repository");
        const data = await response.json();
        const repo = data.repository ?? null;
        setRepository(repo);
        if (repo?.settings) setSettings({ ...defaultSettings, ...repo.settings });
      } catch (error) {
        console.error("Failed to load repository:", error);
        setMessage("Unable to load repository settings.");
      } finally {
        setLoading(false);
      }
    }
    void loadRepository();
  }, []);

  async function saveSettings() {
    if (!repository) return;
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/github/connect", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ownerAndRepo: repository.ownerAndRepo, settings }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to save settings");
      setRepository(data.repository);
      setMessage("Settings saved successfully.");
    } catch (error) {
      console.error("Failed to save settings:", error);
      setMessage(error instanceof Error ? error.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#09090b] text-white">
      <Navbar />
      <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:py-14">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">Workspace settings</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Analysis preferences</h1>
        <p className="mt-3 text-base leading-7 text-zinc-400">Control which checks run and the minimum severity shown in your reports.</p>

        {loading ? <p className="mt-10 text-sm text-zinc-400">Loading settings...</p> : (
          <>
            <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.025] p-5 sm:p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="font-semibold text-white">Connected repository</h2>
                  <p className="mt-1 text-sm text-zinc-500">The repository used for on-demand scans.</p>
                </div>
                <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${repository ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300" : "border-amber-400/20 bg-amber-400/10 text-amber-300"}`}>
                  {repository ? "Connected" : "Not connected"}
                </span>
              </div>
              {repository ? (
                <dl className="mt-6 grid gap-4 border-t border-white/10 pt-5 sm:grid-cols-2">
                  <div><dt className="text-xs text-zinc-500">Repository</dt><dd className="mt-1 font-mono text-sm text-zinc-200">{repository.ownerAndRepo}</dd></div>
                  <div><dt className="text-xs text-zinc-500">Connected</dt><dd className="mt-1 text-sm text-zinc-200">{repository.connectedAt ? new Date(repository.connectedAt).toLocaleString() : "Recently"}</dd></div>
                </dl>
              ) : <p className="mt-6 text-sm text-zinc-400">Connect a repository before changing analysis preferences.</p>}
            </section>

            {repository && <section className="mt-4 rounded-2xl border border-white/10 bg-white/[0.025] p-5 sm:p-6">
              <h2 className="font-semibold text-white">Checks and severity</h2>
              <div className="mt-6 space-y-4">
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-black/10 p-4 transition hover:bg-white/[0.03]">
                  <input type="checkbox" checked={settings.skipArchitecture} onChange={(event) => setSettings({ ...settings, skipArchitecture: event.target.checked })} className="mt-1 h-4 w-4 accent-violet-500" />
                  <span><span className="block text-sm font-medium text-zinc-200">Skip architecture checks</span><span className="mt-1 block text-xs leading-5 text-zinc-500">Exclude structure and maintainability analysis from new scans.</span></span>
                </label>
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-black/10 p-4 transition hover:bg-white/[0.03]">
                  <input type="checkbox" checked={settings.skipSecurity} onChange={(event) => setSettings({ ...settings, skipSecurity: event.target.checked })} className="mt-1 h-4 w-4 accent-violet-500" />
                  <span><span className="block text-sm font-medium text-zinc-200">Skip security checks</span><span className="mt-1 block text-xs leading-5 text-zinc-500">Exclude security findings from new scans.</span></span>
                </label>
                <label className="block max-w-xs">
                  <span className="block text-sm font-medium text-zinc-200">Minimum severity</span>
                  <span className="mt-1 block text-xs text-zinc-500">Only surface findings at or above this level.</span>
                  <select value={settings.minSeverity} onChange={(event) => setSettings({ ...settings, minSeverity: event.target.value as ScanSettings["minSeverity"] })} className="mt-3 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-200 outline-none transition focus:border-violet-400/60 focus:ring-2 focus:ring-violet-400/10">
                    <option value="low">Low and above</option><option value="medium">Medium and above</option><option value="high">High only</option>
                  </select>
                </label>
              </div>
              <div className="mt-7 flex flex-wrap items-center gap-4">
                <button type="button" onClick={saveSettings} disabled={saving} className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60">{saving ? "Saving..." : "Save preferences"}</button>
                {message && <p className="text-sm text-zinc-400" role="status">{message}</p>}
              </div>
            </section>}
          </>
        )}
      </section>
    </main>
  );
}
