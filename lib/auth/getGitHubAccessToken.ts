import { getToken } from "next-auth/jwt";
import { env } from "@/lib/config/env";

export async function getGitHubAccessToken(
  request: Request,
): Promise<string | null> {
  const token = await getToken({
    req: request,
    secret: env.authSecret(),
    secureCookie: process.env.NODE_ENV === "production",
    cookieName:
      process.env.NODE_ENV === "production"
        ? "__Secure-authjs.session-token"
        : "authjs.session-token",
  });

  return typeof token?.githubAccessToken === "string"
    ? token.githubAccessToken
    : null;
}
