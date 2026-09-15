/**
 * lib/github/getRepoMetadata.ts
 *
 * Fetches repository metadata from the GitHub REST API using @octokit/rest.
 */

import { Octokit } from '@octokit/rest';

export interface RepoMetadata {
  owner: string;
  repo: string;
  fullName: string;
  defaultBranch: string;
  isPrivate: boolean;
  description: string | null;
  htmlUrl: string;
  cloneUrl: string;
  language: string | null;
  starsCount: number;
  openIssuesCount: number;
}

/**
 * Retrieves repository metadata using GitHub REST API.
 * Uses GITHUB_TOKEN if available, otherwise makes unauthenticated requests (subject to lower rate limits).
 *
 * @param owner - GitHub repository owner / org.
 * @param repo - Repository name.
 */
export async function getRepoMetadata(
  owner: string,
  repo: string
): Promise<RepoMetadata> {
  const auth = process.env.GITHUB_TOKEN;
  const octokit = new Octokit(auth ? { auth } : undefined);

  const { data } = await octokit.rest.repos.get({
    owner,
    repo,
  });

  return {
    owner: data.owner.login,
    repo: data.name,
    fullName: data.full_name,
    defaultBranch: data.default_branch,
    isPrivate: data.private,
    description: data.description,
    htmlUrl: data.html_url,
    cloneUrl: data.clone_url,
    language: data.language ?? null,
    starsCount: data.stargazers_count,
    openIssuesCount: data.open_issues_count,
  };
}
