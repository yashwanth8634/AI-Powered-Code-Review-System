/**
 * lib/db/models/Repo.ts
 *
 * Mongoose model for a connected GitHub repository.
 * Person 3 (Srija) writes to this model when a user connects a repo.
 * Person 1 (Yashwanth) reads `settings` from here before running a scan.
 */

import mongoose, { Schema, model, models, type Document } from 'mongoose';
import type { ScanSettings } from '@/lib/types';

const ScanSettingsSchema = new Schema<ScanSettings>(
  {
    skipArchitecture: { type: Boolean, default: false },
    skipSecurity: { type: Boolean, default: false },
    minSeverity: {
      type: String,
      enum: ['high', 'medium', 'low'],
      default: 'low',
    },
  },
  { _id: false }
);

export interface RepoDocument extends Document {
  /** "owner/repo" — unique identifier for a GitHub repository. */
  ownerAndRepo: string;
  cloneUrl: string;
  connectedAt: Date;
  /** GitHub's numeric webhook ID — needed if we ever need to delete the webhook. */
  webhookId?: number;
  settings: ScanSettings;
}

const RepoSchema = new Schema<RepoDocument>(
  {
    ownerAndRepo: { type: String, required: true, unique: true },
    cloneUrl: { type: String, required: true },
    connectedAt: { type: Date, required: true, default: () => new Date() },
    webhookId: { type: Number },
    settings: { type: ScanSettingsSchema, default: () => ({}) },
  },
  { timestamps: false }
);

export const Repo =
  (models.Repo as mongoose.Model<RepoDocument>) ??
  model<RepoDocument>('Repo', RepoSchema);
