/**
 * lib/db/connect.ts
 *
 * Mongoose singleton connection for Next.js (App Router).
 * Next.js hot-reload creates new module instances; the singleton stored on
 * `global` persists across reloads so we don't leak connections.
 */

import mongoose from 'mongoose';
import { env } from '@/lib/config/env';
import { Repo } from '@/lib/db/models/Repo';
import { Scan } from '@/lib/db/models/Scan';

// Extend the Node.js global to hold our cached promise.
declare global {
  var _mongooseConnPromise: Promise<typeof mongoose> | undefined;
  var _repoIndexPromise: Promise<void> | undefined;
}

/**
 * Connects to MongoDB Atlas (or returns the cached connection).
 * Call this at the top of every API route and worker that touches the DB.
 */
export async function connectDb(): Promise<void> {
  const uri = env.mongodbUri();

  if (mongoose.connection.readyState !== 1) {
    if (!global._mongooseConnPromise) {
      global._mongooseConnPromise = mongoose.connect(uri, {
        bufferCommands: false,
      });
    }

    await global._mongooseConnPromise;
  }

  if (!global._repoIndexPromise) {
    global._repoIndexPromise = (async () => {
      const indexes = await Repo.collection.listIndexes().toArray();
      if (indexes.some((index) => index.name === 'ownerAndRepo_1')) {
        await Repo.collection.dropIndex('ownerAndRepo_1');
      }
      await Repo.syncIndexes();

      const repositories = await Repo.find()
        .select('_id userId ownerAndRepo')
        .lean();
      await Promise.all(
        repositories.map((repository) =>
          Scan.updateMany(
            {
              userId: repository.userId,
              ownerAndRepo: repository.ownerAndRepo,
              repoId: { $exists: false },
            },
            { $set: { repoId: repository._id } }
          )
        )
      );
    })().catch((error) => {
      global._repoIndexPromise = undefined;
      throw error;
    });
  }

  await global._repoIndexPromise;
}
