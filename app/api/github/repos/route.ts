import { auth } from "@/auth";
import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import { env } from "@/lib/config/env";

export async function GET(req: Request) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json(
      { error: "Not authenticated" },
      { status: 401 }
    );
  }

  const token = await getToken({
    req,
    secret: env.authSecret(),
  });

  const githubAccessToken = token?.githubAccessToken as string | undefined;

  if (!githubAccessToken) {
    return NextResponse.json(
      { error: "GitHub access token not found" },
      { status: 401 }
    );
  }

  try {
    const response = await fetch(
      "https://api.github.com/user/repos?sort=updated&per_page=100",
      {
        headers: {
          Authorization: `Bearer ${githubAccessToken}`,
          Accept: "application/vnd.github+json",
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      const errorText = await response.text();

      console.error("GitHub API error:", response.status, errorText);

      return NextResponse.json(
        { error: "Failed to fetch GitHub repositories" },
        { status: response.status }
      );
    }

    const repos = await response.json();

    return NextResponse.json(repos);
  } catch (error) {
    console.error("GitHub API request failed:", error);

    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}