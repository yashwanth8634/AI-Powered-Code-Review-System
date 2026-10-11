"use client";

import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";

interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  private: boolean;
  description: string | null;
}

export default function GitHubReposPage() {
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function fetchRepos() {
      try {
        const response = await fetch("/api/github/repos");
        if (!response.ok) throw new Error("Unable to load GitHub repositories.");
        setRepos(await response.json());
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : "Unable to load GitHub repositories.");
      } finally {
        setLoading(false);
      }
    }
    void fetchRepos();
  }, []);

  async function connectRepository() {
    if (!selectedRepo) return;
    setConnecting(true);
    setMessage("");
    try {
      const [owner, repo] = selectedRepo.full_name.split("/");
      const response = await fetch("/api/github/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ owner, repo }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to connect repository.");
      setMessage("Repository connected successfully.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Something went wrong while connecting.");
    } finally {
      setConnecting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#09090b] text-white">
      <Navbar />
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:py-14">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">GitHub connection</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Choose a repository</h1>
          <p className="mt-3 text-base leading-7 text-zinc-400">
            Connect a repository once, then keep analysis settings and scan history in one place.
          </p>
        </div>

        {selectedRepo && (
          <div className="mt-8 flex flex-col gap-4 rounded-2xl border border-violet-400/20 bg-violet-400/[0.06] p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-violet-300">Selected repository</p>
              <p className="mt-1 font-mono text-sm text-white">{selectedRepo.full_name}</p>
            </div>
            <button type="button" onClick={connectRepository} disabled={connecting} className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60">
              {connecting ? "Connecting..." : "Connect repository"}
            </button>
          </div>
        )}

        {message && <p className="mt-4 text-sm text-emerald-300" role="status">{message}</p>}
        {loading && <p className="mt-10 text-sm text-zinc-400">Loading repositories...</p>}
        {error && <p className="mt-10 rounded-xl border border-red-400/20 bg-red-400/5 p-4 text-sm text-red-300" role="alert">{error}</p>}
        {!loading && !error && repos.length === 0 && <p className="mt-10 text-sm text-zinc-400">No repositories found.</p>}

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {repos.map((repo) => (
            <article key={repo.id} className="flex min-h-48 flex-col rounded-2xl border border-white/10 bg-white/[0.025] p-5 transition hover:border-white/20 hover:bg-white/[0.04]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-semibold text-white">{repo.name}</h2>
                  <p className="mt-1 font-mono text-xs text-zinc-500">{repo.full_name}</p>
                </div>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                  {repo.private ? "Private" : "Public"}
                </span>
              </div>
              <p className="mt-5 flex-1 text-sm leading-6 text-zinc-400">{repo.description || "No description available."}</p>
              <div className="mt-5 flex items-center gap-3">
                <button type="button" onClick={() => setSelectedRepo(repo)} className="rounded-xl bg-white px-3.5 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-200">
                  Select
                </button>
                <a href={repo.html_url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-zinc-400 underline decoration-zinc-700 underline-offset-4 transition hover:text-white">
                  View on GitHub
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
