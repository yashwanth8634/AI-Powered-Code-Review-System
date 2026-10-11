import { auth } from "@/auth";
import { connectDb } from "@/lib/db/connect";
import { User } from "@/lib/db/models/User";

export async function getAuthenticatedUserId(): Promise<string | null> {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return null;
  }

  await connectDb();
  const user = await User.findOne({
    $or: [{ _id: userId }, { githubId: userId }],
  })
    .select("_id")
    .lean();
  return user ? String(user._id) : null;
}
