import { auth } from "@/auth";
import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import { connectDb } from "@/lib/db/connect";
import { Repo } from "@/lib/db/models/Repo";
import { env } from "@/lib/config/env";
import { getAuthenticatedUserId } from "@/lib/auth/getUserId";

interface ConnectRepoRequest {
  owner: string;
  repo: string;
}

export async function POST(req: Request) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json(
      { error: "Not authenticated" },
      { status: 401 }
    );
  }

  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json(
      { error: "Authenticated account has no stable user id" },
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

  const webhookUrl = env.githubWebhookUrl();
  const webhookSecret = env.githubWebhookSecret();

  if (!webhookUrl) {
    return NextResponse.json(
      { error: "GITHUB_WEBHOOK_URL is not configured" },
      { status: 500 }
    );
  }

  if (!webhookSecret) {
    return NextResponse.json(
      { error: "GITHUB_WEBHOOK_SECRET is not configured" },
      { status: 500 }
    );
  }

  try {
    const body = (await req.json()) as ConnectRepoRequest;

    const owner = body.owner?.trim();
    const repo = body.repo?.trim();

    if (!owner || !repo) {
      return NextResponse.json(
        { error: "Owner and repo are required" },
        { status: 400 }
      );
    }

    const repoResponse = await fetch(
      `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
      {
        headers: {
          Authorization: `Bearer ${githubAccessToken}`,
          Accept: "application/vnd.github+json",
        },
        cache: "no-store",
      }
    );

    if (!repoResponse.ok) {
      const errorText = await repoResponse.text();

      console.error(
        "GitHub repository lookup failed:",
        repoResponse.status,
        errorText
      );

      return NextResponse.json(
        { error: "Unable to access the selected GitHub repository" },
        { status: repoResponse.status }
      );
    }

    const githubRepo = await repoResponse.json();

    const webhookResponse = await fetch(
      `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/hooks`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${githubAccessToken}`,
          Accept: "application/vnd.github+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "web",
          active: true,
          events: ["push"],
          config: {
            url: webhookUrl,
            content_type: "json",
            secret: webhookSecret,
            insecure_ssl: "0",
          },
        }),
      }
    );

    if (!webhookResponse.ok) {
      const errorText = await webhookResponse.text();

      console.error(
        "GitHub webhook creation failed:",
        webhookResponse.status,
        errorText
      );

      return NextResponse.json(
        {
          error: `GitHub rejected the webhook (${webhookResponse.status}): ${errorText}`,
        },
        { status: webhookResponse.status }
      );
    }

    const webhook = await webhookResponse.json();

    await connectDb();

    const connectedRepo = await Repo.findOneAndUpdate(
      { userId, ownerAndRepo: `${owner}/${repo}` },
      {
        userId,
        ownerAndRepo: `${owner}/${repo}`,
        cloneUrl: githubRepo.clone_url,
        connectedAt: new Date(),
        webhookId: webhook.id,
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );

    return NextResponse.json({
      message: "Repository connected successfully",
      repository: connectedRepo,
    });
  } catch (error) {
    console.error("Connect repository error:", error);

    return NextResponse.json(
      { error: "Something went wrong while connecting the repository" },
      { status: 500 }
    );
  }
}

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json(
      { error: "Not authenticated" },
      { status: 401 }
    );
  }

  try {
    await connectDb();

    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const repositories = await Repo.find({ userId })
      .sort({ connectedAt: -1 })
      .lean();

    return NextResponse.json({
      repositories,
      repository: repositories[0] ?? null,
    });
  } catch (error) {
    console.error("Get connected repository error:", error);

    return NextResponse.json(
      { error: "Failed to load connected repository" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json(
      { error: "Not authenticated" },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();

    const ownerAndRepo = body.ownerAndRepo?.trim();
    const settings = body.settings;

    if (!ownerAndRepo || !settings) {
      return NextResponse.json(
        { error: "Repository and settings are required" },
        { status: 400 }
      );
    }

    await connectDb();

    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const updatedRepo = await Repo.findOneAndUpdate(
      { userId, ownerAndRepo },
      {
        $set: {
          settings: {
            skipArchitecture: Boolean(settings.skipArchitecture),
            skipSecurity: Boolean(settings.skipSecurity),
            minSeverity: settings.minSeverity,
          },
        },
      },
      {
        new: true,
        runValidators: true,
      }
    ).lean();

    if (!updatedRepo) {
      return NextResponse.json(
        { error: "Connected repository not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "Settings saved successfully",
      repository: updatedRepo,
    });
  } catch (error) {
    console.error("Update repository settings error:", error);

    return NextResponse.json(
      { error: "Failed to save settings" },
      { status: 500 }
    );
  }
}