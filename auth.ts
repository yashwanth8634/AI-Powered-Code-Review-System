import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import { connectDb } from "@/lib/db/connect";
import { User } from "@/lib/db/models/User";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    GitHub({
      authorization: {
        params: {
          scope: "read:user user:email repo admin:repo_hook",
        },
      },
    }),
  ],

  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider !== "github" || !user.id) {
        return false;
      }

      const githubId = account.providerAccountId || user.id;
      await connectDb();
      await User.findOneAndUpdate(
        { githubId },
        {
          githubId,
          name: user.name,
          email: user.email,
          image: user.image,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );

      return true;
    },

    async jwt({ token, account, user }) {
      if (account?.access_token) {
        token.githubAccessToken = account.access_token;
      }

      const githubId = String(
        account?.providerAccountId || user?.id || token.githubId || "",
      );

      if (githubId && !token.userId) {
        await connectDb();
        const persistedUser = await User.findOne({ githubId })
          .select("_id")
          .lean();

        if (!persistedUser) {
          throw new Error("Authenticated GitHub user was not persisted.");
        }

        token.githubId = String(githubId);
        token.userId = String(persistedUser._id);
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user && typeof token.userId === "string") {
        session.user.id = token.userId;
      }
      return session;
    },
  },
});