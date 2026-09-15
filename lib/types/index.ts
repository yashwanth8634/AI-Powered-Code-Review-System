/**
 * lib/types/index.ts
 *
 * Single source of truth for all shared TypeScript interfaces.
 * Import from here everywhere — never redefine these shapes elsewhere.
 */

// ---------------------------------------------------------------------------
// Ingestion
// ---------------------------------------------------------------------------

/** Raw file metadata collected during the file-tree walk. */
export interface FileEntry {
  relativePath: string;
  sizeBytes: number;
  extension: string;
}

/** A single key source file selected for inclusion in the LLM prompt. */
export interface KeyFile {
  relativePath: string;
  /** Raw UTF-8 content, possibly truncated at FILE_TRUNCATE_BYTES. */
  content: string;
}

/**
 * The complete context package produced by the ingestion module.
 * Passed into the analysis and security modules.
 */
export interface RepoContext {
  repoUrl: string;
  /** "owner/repo-name" extracted from the GitHub URL. */
  ownerAndRepo: string;
  /** Absolute path to the temp dir where the repo was cloned. */
  clonePath: string;
  /** Human-readable indented tree string (like `tree` CLI output). */
  fileTree: string;
  keyFileContents: KeyFile[];
  totalFileCount: number;
  /** File count after applying exclusion filters. */
  filteredFileCount: number;
}

// ---------------------------------------------------------------------------
// Analysis findings
// ---------------------------------------------------------------------------

/** One architecture finding produced by the LLM architecture pass. */
export interface ArchitectureFinding {
  /** UUID generated at parse time. */
  id: string;
  severity: 'high' | 'medium' | 'low';
  category: 'coupling' | 'duplication' | 'pattern' | 'dependency' | 'other';
  title: string;
  explanation: string;
  /** May be empty when the LLM cannot pinpoint specific files. */
  affectedFiles: string[];
}

// ---------------------------------------------------------------------------
// Security findings
// ---------------------------------------------------------------------------

/** One Semgrep finding before the LLM explanation pass. */
export interface SemgrepRawFinding {
  ruleId: string;
  filePath: string;
  startLine: number;
  endLine: number;
  /** Semgrep's own message string. */
  message: string;
  /** Semgrep's own severity label (INFO / WARNING / ERROR). */
  severity: string;
}

/** One security finding after the LLM plain-language explanation pass. */
export interface SecurityFinding {
  /** UUID generated at parse time. */
  id: string;
  ruleId: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  /** Plain-language explanation written by the LLM. */
  explanation: string;
  filePath: string;
  startLine: number;
  endLine: number;
  /** 1 = most dangerous. Assigned by the LLM. */
  riskRank: number;
}

// ---------------------------------------------------------------------------
// Scan result — the canonical output shape (share with teammates)
// ---------------------------------------------------------------------------

export interface ScanSummary {
  architectureHigh: number;
  architectureMedium: number;
  architectureLow: number;
  securityCritical: number;
  securityHigh: number;
  securityMedium: number;
  securityLow: number;
  totalIssues: number;
}

/**
 * The full result object persisted to MongoDB and returned to the dashboard.
 * Person 2 (Akhil) consumes this shape from GET /api/scans/[scanId].
 */
export interface ScanResult {
  id: string;
  repoUrl: string;
  ownerAndRepo: string;
  triggeredBy: 'on-demand' | 'webhook';
  startedAt: string; // ISO 8601
  completedAt: string; // ISO 8601
  status: 'pending' | 'running' | 'complete' | 'failed';
  errorMessage?: string;
  architectureFindings: ArchitectureFinding[];
  securityFindings: SecurityFinding[];
  summary: ScanSummary;
}

// ---------------------------------------------------------------------------
// API contracts
// ---------------------------------------------------------------------------

/**
 * Body shape for POST /api/analyze.
 * Person 3 (Srija) populates `settings` from the DB before calling this.
 */
export interface AnalyzeRequestBody {
  gitUrl: string;
  settings?: ScanSettings;
}

/**
 * Per-repo scan settings stored in MongoDB and read by runFullScan.
 * Person 3 (Srija) owns writing these; Person 1 (Yashwanth) owns reading them.
 */
export interface ScanSettings {
  skipArchitecture: boolean;
  skipSecurity: boolean;
  minSeverity: 'high' | 'medium' | 'low';
}

/** Payload from GitHub's push webhook. */
export interface GitHubPushPayload {
  /** e.g. "refs/heads/main" */
  ref: string;
  repository: {
    /** e.g. "owner/repo" */
    full_name: string;
    clone_url: string;
    html_url: string;
    default_branch: string;
  };
  pusher: {
    name: string;
  };
}

/** Shape returned by POST /api/analyze (202 Accepted). */
export interface AnalyzeAcceptedResponse {
  scanId: string;
  message: string;
}
