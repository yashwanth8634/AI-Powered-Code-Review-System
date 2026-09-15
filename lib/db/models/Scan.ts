/**
 * lib/db/models/Scan.ts
 *
 * Mongoose model for a scan result.
 * The document shape mirrors the ScanResult interface in lib/types/index.ts exactly.
 */

import mongoose, { Schema, model, models, type Document } from 'mongoose';
import type {
  ScanResult,
  ArchitectureFinding,
  SecurityFinding,
  ScanSummary,
} from '@/lib/types';

// ---------------------------------------------------------------------------
// Sub-document schemas
// ---------------------------------------------------------------------------

const ArchitectureFindingSchema = new Schema<ArchitectureFinding>(
  {
    id: { type: String, required: true },
    severity: { type: String, enum: ['high', 'medium', 'low'], required: true },
    category: {
      type: String,
      enum: ['coupling', 'duplication', 'pattern', 'dependency', 'other'],
      required: true,
    },
    title: { type: String, required: true },
    explanation: { type: String, required: true },
    affectedFiles: { type: [String], default: [] },
  },
  { _id: false }
);

const SecurityFindingSchema = new Schema<SecurityFinding>(
  {
    id: { type: String, required: true },
    ruleId: { type: String, required: true },
    severity: {
      type: String,
      enum: ['critical', 'high', 'medium', 'low'],
      required: true,
    },
    title: { type: String, required: true },
    explanation: { type: String, required: true },
    filePath: { type: String, required: true },
    startLine: { type: Number, required: true },
    endLine: { type: Number, required: true },
    riskRank: { type: Number, required: true },
  },
  { _id: false }
);

const SummarySchema = new Schema<ScanSummary>(
  {
    architectureHigh: { type: Number, default: 0 },
    architectureMedium: { type: Number, default: 0 },
    architectureLow: { type: Number, default: 0 },
    securityCritical: { type: Number, default: 0 },
    securityHigh: { type: Number, default: 0 },
    securityMedium: { type: Number, default: 0 },
    securityLow: { type: Number, default: 0 },
    totalIssues: { type: Number, default: 0 },
  },
  { _id: false }
);

// ---------------------------------------------------------------------------
// Root schema
// ---------------------------------------------------------------------------

export interface ScanDocument extends Omit<ScanResult, 'id'>, Document {}

const ScanSchema = new Schema<ScanDocument>(
  {
    repoUrl: { type: String, required: true },
    ownerAndRepo: { type: String, required: true, index: true },
    triggeredBy: {
      type: String,
      enum: ['on-demand', 'webhook'],
      required: true,
    },
    startedAt: { type: String, required: true },
    completedAt: { type: String },
    status: {
      type: String,
      enum: ['pending', 'running', 'complete', 'failed'],
      required: true,
      default: 'pending',
    },
    errorMessage: { type: String },
    architectureFindings: { type: [ArchitectureFindingSchema], default: [] },
    securityFindings: { type: [SecurityFindingSchema], default: [] },
    summary: { type: SummarySchema, default: () => ({}) },
  },
  {
    timestamps: false,
    // Return plain objects (no Mongoose Document overhead) by default.
    toJSON: { virtuals: false },
    toObject: { virtuals: false },
  }
);

// Prevent model re-registration during Next.js hot-reload.
export const Scan =
  (models.Scan as mongoose.Model<ScanDocument>) ??
  model<ScanDocument>('Scan', ScanSchema);
