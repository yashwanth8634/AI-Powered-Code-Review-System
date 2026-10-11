"use client";

import { useEffect, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Navbar from "./components/Navbar";
import { useScanState } from "./providers";

interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  private: boolean;
  description: string | null;
}

export default function Home() {
  const { data: session, status } = useSession();
  const { startScan, isStarting } = useScanState();
  const router = useRouter();
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(null);
  const [connectedRepos, setConnectedRepos] = useState<string[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status !== "authenticated") {
      return;
    }

    async function loadRepositories() {
      setLoadingRepos(true);
      setError("");

      try {
        const [githubResponse, connectedResponse] = await Promise.all([
          fetch("/api/github/repos", { cache: "no-store" }),
          fetch("/api/github/connect", { cache: "no-store" }),
        ]);
        const githubData = await githubResponse.json();
        const connectedData = await connectedResponse.json();

        if (!githubResponse.ok) {
          throw new Error(githubData.error || "Unable to load GitHub repositories.");
        }
        if (!connectedResponse.ok) {
          throw new Error(connectedData.error || "Unable to load connected repositories.");
        }

        setRepos(githubData);
        setConnectedRepos(
          (connectedData.repositories ?? []).map(
            (repo: { ownerAndRepo: string }) => repo.ownerAndRepo,
          ),
        );
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load your repositories.",
        );
      } finally {
        setLoadingRepos(false);
      }
    }

    void loadRepositories();
  }, [status]);

  async function connectAndStartScan(repoToScan: GitHubRepo) {
    if (connecting || isStarting) {
      return;
    }

    setSelectedRepo(repoToScan);
    setConnecting(true);
    setError("");

    try {
      const [owner, repo] = repoToScan.full_name.split("/");
      const connectResponse = await fetch("/api/github/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ owner, repo }),
      });
      const connectData = await connectResponse.json();

      if (!connectResponse.ok) {
        throw new Error(connectData.error || "Unable to connect this repository.");
      }

      const scan = await startScan(repoToScan.html_url);
      router.push(`/scan?scanId=${scan.scanId}`);
    } catch (scanError) {
      setError(
        scanError instanceof Error
          ? scanError.message
          : "Unable to connect and start the scan.",
      );
    } finally {
      setConnecting(false);
    }
  }

  const isBusy = connecting || isStarting;

  return (
    <main className="min-h-screen bg-[#09090b] text-white">
      <Navbar />

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-[-280px] h-[620px] w-[620px] -translate-x-1/2 rounded-full bg-violet-600/15 blur-[140px]" />
        <div className="absolute bottom-[-260px] right-[-160px] h-[520px] w-[520px] rounded-full bg-blue-600/10 blur-[130px]" />
      </div>

      {status !== "authenticated" ? (
        <section className="relative z-10 mx-auto flex min-h-[calc(100vh-73px)] max-w-6xl flex-col items-center justify-center px-6 py-20 text-center">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/[0.06] px-4 py-2 text-xs font-medium text-emerald-300">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            AI-powered repository review
          </div>
          <h1 className="max-w-4xl text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
            Ship with confidence.
            <span className="block bg-gradient-to-r from-violet-400 via-blue-400 to-cyan-400 bg-clip-text pb-2 text-transparent">
              Understand your code first.
            </span>
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-zinc-400 sm:text-lg">
            Connect GitHub once and get architecture, security, and codebase
            insights for every repository you care about.
          </p>
          <button
            type="button"
            onClick={() => void signIn("github", { callbackUrl: "/" })}
            className="mt-10 inline-flex items-center gap-3 rounded-xl bg-white px-6 py-3.5 text-sm font-semibold text-zinc-950 shadow-xl shadow-black/30 transition hover:bg-zinc-200"
          >
            <GitHubIcon />
            Sign in with GitHub
          </button>
          <div className="mt-14 grid max-w-2xl gap-4 text-left sm:grid-cols-3">
            {[
              ["01", "Connect your account", "Secure GitHub OAuth sign-in."],
              ["02", "Choose a repository", "See the repositories you can access."],
              ["03", "Start your scan", "Review results and track history."],
            ].map(([number, title, description]) => (
              <div key={number} className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
                <span className="text-xs font-semibold text-violet-300">{number}</span>
                <h2 className="mt-3 text-sm font-semibold">{title}</h2>
                <p className="mt-1 text-xs leading-5 text-zinc-500">{description}</p>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <section className="relative z-10 mx-auto max-w-6xl px-6 py-14">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">
              Welcome back{session.user.name ? `, ${session.user.name}` : ""}
            </p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
              Choose a repository to scan
            </h1>
            <p className="mt-4 text-base leading-7 text-zinc-400">
              Select one repository, connect it to your account, and we&apos;ll
              start your first architecture and security review.
            </p>
          </div>

          {error && (
            <p className="mt-8 rounded-xl border border-red-400/20 bg-red-400/5 p-4 text-sm text-red-300" role="alert">
              {error}
            </p>
          )}

          {selectedRepo && isBusy && (
            <div className="mt-8 flex flex-col gap-4 rounded-2xl border border-violet-400/20 bg-violet-400/[0.06] p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-violet-300">Starting scan</p>
                <p className="mt-1 font-mono text-sm text-white">{selectedRepo.full_name}</p>
              </div>
              <span className="text-sm text-violet-200">Preparing repository...</span>
            </div>
          )}

          {loadingRepos ? (
            <p className="mt-12 text-sm text-zinc-400">Loading your GitHub repositories...</p>
          ) : repos.length === 0 ? (
            <div className="mt-12 rounded-2xl border border-white/10 bg-white/[0.025] p-8 text-sm text-zinc-400">
              No repositories are available for this GitHub account.
            </div>
          ) : (
            <div className="mt-10 grid gap-4 md:grid-cols-2">
              {repos.map((repo) => {
                const isConnected = connectedRepos.includes(repo.full_name);
                const isSelected = selectedRepo?.id === repo.id;

                return (
                  <article
                    key={repo.id}
                    className={`flex min-h-48 flex-col rounded-2xl border p-5 transition ${
                      isSelected
                        ? "border-violet-400/50 bg-violet-400/[0.08]"
                        : "border-white/10 bg-white/[0.025] hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="font-semibold">{repo.name}</h2>
                        <p className="mt-1 font-mono text-xs text-zinc-500">{repo.full_name}</p>
                      </div>
                      <span className="rounded-full border border-white/10 px-2 py-1 text-[10px] uppercase tracking-wider text-zinc-400">
                        {repo.private ? "Private" : "Public"}
                      </span>
                    </div>
                    <p className="mt-5 flex-1 text-sm leading-6 text-zinc-400">
                      {repo.description || "No description available."}
                    </p>
                    <div className="mt-5 flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => void connectAndStartScan(repo)}
                        disabled={isBusy}
                        aria-label={`Select ${repo.full_name} and start scan`}
                        className="rounded-xl bg-white px-3.5 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-200"
                      >
                        {isSelected && isBusy ? "Starting..." : isConnected ? "Scan again" : "Select & scan"}
                      </button>
                      <a href={repo.html_url} target="_blank" rel="noopener noreferrer" className="text-sm text-zinc-400 underline underline-offset-4 hover:text-white">
                        View on GitHub
                      </a>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}
    </main>
  );
}

function GitHubIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2C6.48 2 2 6.58 2 12.23c0 4.52 2.87 8.35 6.84 9.71.5.1.68-.22.68-.49v-1.7c-2.78.62-3.37-1.23-3.37-1.23-.46-1.2-1.1-1.51-1.1-1.51-.91-.64.07-.63.07-.63 1 .07 1.53 1.05 1.53 1.05.9 1.58 2.34 1.12 2.91.86.09-.67.35-1.12.63-1.38-2.22-.26-4.55-1.14-4.55-5.07 0-1.12.39-2.03 1.02-2.75-.1-.26-.44-1.3.1-2.71 0 0 .84-.28 2.75 1.05A9.29 9.29 0 0 1 12 7.14c.85 0 1.71.12 2.51.37 1.91-1.33 2.75-1.05 2.75-1.05.54 1.41.2 2.45.1 2.71.63.72 1.02 1.63 1.02 2.75 0 3.94-2.33 4.81-4.56 5.07.36.32.68.94.68 1.9v2.81c0 .27.18.59.69.49A10.23 10.23 0 0 0 22 12.23C22 6.58 17.52 2 12 2Z" />
    </svg>
  );
}
