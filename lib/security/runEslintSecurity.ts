import path from 'path';
import { ESLint } from 'eslint';
import pluginSecurity from 'eslint-plugin-security';
import * as tsParser from '@typescript-eslint/parser';
import type { RawSecurityFinding } from '@/lib/types';

/** Maximum number of raw security findings sent to the LLM explanation step. */
const MAX_SECURITY_FINDINGS = 50;

/** File extensions scanned for AST-level security vulnerabilities. */
const SCANNED_EXTENSIONS = ['**/*.js', '**/*.jsx', '**/*.ts', '**/*.tsx', '**/*.mjs', '**/*.cjs'];

/** Directories excluded from security scans to avoid library false positives. */
const IGNORED_PATTERNS = [
  '**/node_modules/**',
  '**/.git/**',
  '**/.next/**',
  '**/dist/**',
  '**/build/**',
  '**/coverage/**',
];

function createSecurityLinter(repoPath: string): ESLint {
  return new ESLint({
    cwd: repoPath,
    errorOnUnmatchedPattern: false,
    overrideConfigFile: true,
    overrideConfig: [
      pluginSecurity.configs.recommended,
      {
        files: ['**/*.ts', '**/*.tsx'],
        languageOptions: {
          parser: tsParser,
          parserOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
          },
        },
      },
      {
        files: ['**/*.js', '**/*.jsx', '**/*.mjs', '**/*.cjs'],
        languageOptions: {
          parserOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
          },
        },
      },
    ],
    ignore: true,
    ignorePatterns: IGNORED_PATTERNS,
  });
}

function extractSecurityFindings(
  results: ESLint.LintResult[],
  repoPath: string
): RawSecurityFinding[] {
  const findings: RawSecurityFinding[] = [];

  for (const fileResult of results) {
    const relativePath = path.relative(repoPath, fileResult.filePath);

    for (const msg of fileResult.messages) {
      if (!msg.ruleId || !msg.ruleId.startsWith('security/')) {
        continue;
      }

      findings.push({
        ruleId: msg.ruleId,
        filePath: relativePath,
        startLine: msg.line || 1,
        endLine: msg.endLine || msg.line || 1,
        message: msg.message,
        severity: msg.severity === 2 ? 'ERROR' : 'WARNING',
      });

      if (findings.length >= MAX_SECURITY_FINDINGS) {
        return findings;
      }
    }
  }

  return findings;
}

export async function runEslintSecurity(repoPath: string): Promise<RawSecurityFinding[]> {
  try {
    const eslint = createSecurityLinter(repoPath);
    const results = await eslint.lintFiles(SCANNED_EXTENSIONS);
    return extractSecurityFindings(results, repoPath);
  } catch (error) {
    // When a repository contains no matching files or unparseable syntax,
    // degrade gracefully without halting the wider analysis pipeline.
    console.warn('[runEslintSecurity] Security scan encountered an issue:', error);
    return [];
  }
}
