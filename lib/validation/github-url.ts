const GITHUB_REPO_REGEX =
  /^https?:\/\/(?:www\.)?github\.com\/([a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38})\/([a-zA-Z0-9_.-]{1,100}?)(?:\.git)?\/?$/;

export interface ParsedGitUrl {
  owner: string;
  repo: string;
  fullName: string;
  normalizedUrl: string;
}

export function isGitHubUrl(url: string): boolean {
  return typeof url === "string" && GITHUB_REPO_REGEX.test(url.trim());
}

export function parseGitHubUrl(url: string): ParsedGitUrl | null {
  const match = typeof url === "string" ? url.trim().match(GITHUB_REPO_REGEX) : null;
  if (!match) {
    return null;
  }

  const [, owner, rawRepo] = match;
  const repo = rawRepo.replace(/\.git$/, "");
  return {
    owner,
    repo,
    fullName: `${owner}/${repo}`,
    normalizedUrl: `https://github.com/${owner}/${repo}`,
  };
}

export default async function validateGitUrl(gitUrl: string): Promise<boolean> {
  const parsed = parseGitHubUrl(gitUrl);
  if (!parsed) {
    return false;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5_000);

  try {
    const response = await fetch(parsed.normalizedUrl, {
      method: "HEAD",
      signal: controller.signal,
      headers: { "User-Agent": "ai-code-review-validator" },
    });
    return response.status < 400;
  } catch {
    // Syntax validation remains useful when the service is offline.
    return true;
  } finally {
    clearTimeout(timeoutId);
  }
}
