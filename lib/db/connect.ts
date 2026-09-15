/**
 * lib/db/connect.ts
 *
 * Mongoose singleton connection for Next.js (App Router).
 * Next.js hot-reload creates new module instances; the singleton stored on
 * `global` persists across reloads so we don't leak connections.
 */

import mongoose from 'mongoose';

// Extend the Node.js global to hold our cached promise.
declare global {
  var _mongooseConnPromise: Promise<typeof mongoose> | undefined;
}

/**
 * Connects to MongoDB Atlas (or returns the cached connection).
 * Call this at the top of every API route and worker that touches the DB.
 */
export async function connectDb(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not set. Add it to .env.local.');
  }

  if (mongoose.connection.readyState === 1) {
    // Already connected — nothing to do.
    return;
  }

  if (!global._mongooseConnPromise) {
    global._mongooseConnPromise = mongoose.connect(uri, {
      bufferCommands: false,
    });
  }

  await global._mongooseConnPromise;
}
