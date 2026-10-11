import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface User {
    id: string;
  }

  declare module "next-auth/jwt" {
    interface JWT {
      githubId?: string;
      githubAccessToken?: string;
      userId?: string;
    }
  }

  interface Session {
    user: User;
  }
}
