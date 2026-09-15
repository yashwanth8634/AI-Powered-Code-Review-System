/**
 * lib/errors/index.ts
 *
 * Typed error hierarchy for the entire backend pipeline.
 * All errors carry a `code` string for programmatic handling in catch blocks.
 */

// ---------------------------------------------------------------------------
// Base
// ---------------------------------------------------------------------------

abstract class AppError extends Error {
  abstract readonly code: string;

  constructor(message: string) {
    super(message);
    // Restore prototype chain broken by extending Error in ES5 targets.
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = new.target.name;
  }
}

// ---------------------------------------------------------------------------
// Ingestion errors
// ---------------------------------------------------------------------------

export type IngestionErrorCode =
  | 'CLONE_FAILED'
  | 'TREE_BUILD_FAILED'
  | 'FILE_READ_FAILED';

export class IngestionError extends AppError {
  readonly code: IngestionErrorCode;

  constructor(code: IngestionErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

// ---------------------------------------------------------------------------
// LLM errors
// ---------------------------------------------------------------------------

export type LLMErrorCode =
  | 'LLM_TIMEOUT'
  | 'LLM_API_ERROR'
  | 'LLM_PARSE_FAILED';

export class LLMError extends AppError {
  readonly code: LLMErrorCode;

  constructor(code: LLMErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

// ---------------------------------------------------------------------------
// Semgrep errors
// ---------------------------------------------------------------------------

export type SemgrepErrorCode =
  | 'SEMGREP_NOT_FOUND'
  | 'SEMGREP_TIMEOUT'
  | 'SEMGREP_PARSE_FAILED';

export class SemgrepError extends AppError {
  readonly code: SemgrepErrorCode;

  constructor(code: SemgrepErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

// ---------------------------------------------------------------------------
// Validation errors (API boundary)
// ---------------------------------------------------------------------------

export type ValidationErrorCode = 'INVALID_URL' | 'INVALID_BODY';

export class ValidationError extends AppError {
  readonly code: ValidationErrorCode;

  constructor(code: ValidationErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}
