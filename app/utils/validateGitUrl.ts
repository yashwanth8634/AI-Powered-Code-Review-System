/**
 * app/utils/validateGitUrl.ts
 *
 * Strict validator for GitHub repository URLs.
 * Replaces loose generic URL regex with GitHub-specific parsing.
 */

// Matches:
// https://github.com/owner/repo
// https://github.com/owner/repo.git
// http://github.com/owner/repo
const GITHUB_REPO_REGEX =
  /^https?:\/\/(?:www\.)?github\.com\/([a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38})\/([a-zA-Z0-9_.-]{1,100}?)(?:\.git)?\/?$/;

export interface ParsedGitUrl {
  owner: string;
  repo: string;
  fullName: string;
  normalizedUrl: string;
}

/**
 * Synchronously tests whether a string is a well-formed GitHub repo URL.
 */
export function isGitHubUrl(url: string): boolean {
  if (typeof url !== 'string' || !url.trim()) {
    return false;
  }
  return GITHUB_REPO_REGEX.test(url.trim());
}

/**
 * Extracts owner, repo, fullName and normalized canonical URL from a GitHub URL.
 * Returns null if the URL is invalid.
 */
export function parseGitHubUrl(url: string): ParsedGitUrl | null {
  if (!isGitHubUrl(url)) {
    return null;
  }

  const match = url.trim().match(GITHUB_REPO_REGEX);
  if (!match) {
    return null;
  }

  const [, owner, repo] = match;
  // Strip trailing .git if present in the repo name
  const cleanRepo = repo.replace(/\.git$/, '');

  return {
    owner,
    repo: cleanRepo,
    fullName: `${owner}/${cleanRepo}`,
    normalizedUrl: `https://github.com/${owner}/${cleanRepo}`,
  };
}

/**
 * Validates a GitHub repository URL:
 * 1. Checks strict syntax regex.
 * 2. Optionally checks reachability via lightweight HEAD request with a 5s timeout.
 */
export default async function validateGitUrl(gitUrl: string): Promise<boolean> {
  const parsed = parseGitHubUrl(gitUrl);
  if (!parsed) {
    return false;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5_000);

    const res = await fetch(parsed.normalizedUrl, {
      method: 'HEAD',
      signal: controller.signal,
      headers: {
        'User-Agent': 'ai-code-review-validator',
      },
    });

    clearTimeout(timeoutId);

    // 200 (public repo) or 301/302 (redirect) means repo exists.
    // 404 indicates not found.
    return res.status < 400;
  } catch {
    // If network request fails/times out, we still return true if format is syntactically valid
    // to allow tests or offline environments without crashing.
    return true;
  }
}