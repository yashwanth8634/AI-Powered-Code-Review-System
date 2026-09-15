# Progress Tracker — Person 1 (Yashwanth)

> **Role & Ownership:** Backend Core Pipeline, Code Ingestion, Architecture Analysis, Security Pipeline (Semgrep + LLM), GitHub Webhook Receiver, Job Queue (BullMQ), MongoDB Persistence, and Core API Routes.

---

## 1. Overall Status Summary

| Phase | Description | Status | Verification / Tests |
|---|---|---|---|
| **Phase 0** | Setup & Dependencies | ✅ Complete | npm packages installed (`simple-git`, `openai`, `mongoose`, `bullmq`, `ioredis`, `zod`, `tmp-promise`, `@octokit/rest`, `tsx`) |
| **Phase 1** | Types & Database Layer | ✅ Complete | `lib/types/index.ts`, `lib/db/connect.ts`, `lib/db/models/Scan.ts`, `lib/db/models/Repo.ts` |
| **Phase 2** | Ingestion Engine | ✅ Complete | `lib/ingestion/cloneRepo.ts`, `buildFileTree.ts`, `selectKeyFiles.ts`, `app/utils/validateGitUrl.ts` |
| **Phase 3** | Architecture Analysis | ✅ Complete | `lib/analysis/callLLM.ts` (supports OpenAI & Groq), `buildArchitecturePrompt.ts`, `parseArchitectureResponse.ts` |
| **Phase 4** | Security Engine | ✅ Complete | `lib/security/runSemgrep.ts`, `parseSemgrepOutput.ts`, `explainFindings.ts` |
| **Phase 5** | Pipeline & Job Queue | ✅ Complete | `lib/pipeline/runFullScan.ts`, `lib/queue/scanQueue.ts`, `lib/queue/scanWorker.ts` |
| **Phase 6** | GitHub Integration | ✅ Complete | `lib/github/validateWebhookSignature.ts`, `lib/github/getRepoMetadata.ts` |
| **Phase 7** | REST API Endpoints | ✅ Complete | `POST /api/analyze`, `POST /api/webhook`, `GET /api/scans`, `GET /api/scans/[scanId]` |
| **Phase 8** | Error Handling | ✅ Complete | `lib/errors/index.ts` typed hierarchy (`IngestionError`, `LLMError`, `SemgrepError`, `ValidationError`) |
| **Phase 9** | Testing & Verification | ✅ Complete | `tsc --noEmit` (0 errors), `npm run lint` (0 errors/warnings), `npm run build` (success), `npm test` (10/10 passing) |

---

## 2. Module Implementations Detail

### Phase 1 — Types & Persistence (`lib/types`, `lib/db`)
- **[lib/types/index.ts](file:///Users/yashwanthreddykoppula/Desktop/ai_power_code_review/lib/types/index.ts)**: Single source of truth for `ScanResult`, `ArchitectureFinding`, `SecurityFinding`, `RepoContext`, `ScanSettings`, `AnalyzeRequestBody`, and `GitHubPushPayload`.
- **[lib/db/connect.ts](file:///Users/yashwanthreddykoppula/Desktop/ai_power_code_review/lib/db/connect.ts)**: Global connection caching to eliminate multiple connections during Next.js hot-reload; lazy evaluation of `MONGODB_URI`.
- **[lib/db/models/Scan.ts](file:///Users/yashwanthreddykoppula/Desktop/ai_power_code_review/lib/db/models/Scan.ts)**: Mongoose model mirroring `ScanResult` exactly with sub-document schemas for architecture and security findings.
- **[lib/db/models/Repo.ts](file:///Users/yashwanthreddykoppula/Desktop/ai_power_code_review/lib/db/models/Repo.ts)**: Repository model storing GitHub repo metadata and per-repo scan settings.

### Phase 2 — Ingestion Engine (`lib/ingestion`, `app/utils`)
- **[lib/ingestion/cloneRepo.ts](file:///Users/yashwanthreddykoppula/Desktop/ai_power_code_review/lib/ingestion/cloneRepo.ts)**: Shallow-clones (`--depth 1`) using `simple-git` into a managed temp directory via `tmp-promise`. Returns `cleanup()` guaranteed to be called in `finally`.
- **[lib/ingestion/buildFileTree.ts](file:///Users/yashwanthreddykoppula/Desktop/ai_power_code_review/lib/ingestion/buildFileTree.ts)**: Recursive directory walker filtering excluded dirs (`node_modules`, `.git`, `.next`, `dist`, etc.) and binary/lockfile extensions. Produces indented tree string and flat file entries.
- **[lib/ingestion/selectKeyFiles.ts](file:///Users/yashwanthreddykoppula/Desktop/ai_power_code_review/lib/ingestion/selectKeyFiles.ts)**: 3-tier key file selector (configs -> entry points -> largest source files) respecting byte budgets to fit LLM context limits.
- **[app/utils/validateGitUrl.ts](file:///Users/yashwanthreddykoppula/Desktop/ai_power_code_review/app/utils/validateGitUrl.ts)**: Replaced loose URL regex with strict GitHub repository regex validator, parser (`owner`, `repo`, `fullName`), and reachability checker.

### Phase 3 — Architecture Analysis (`lib/analysis`)
- **[lib/analysis/callLLM.ts](file:///Users/yashwanthreddykoppula/Desktop/ai_power_code_review/lib/analysis/callLLM.ts)**: Retrying client supporting OpenAI (`gpt-4o`) and Groq (`openai/gpt-oss-120b`, `gsk_...` keys), `json_object` structured output, low temperature, 120s timeout, exponential backoff.
- **[lib/analysis/buildArchitecturePrompt.ts](file:///Users/yashwanthreddykoppula/Desktop/ai_power_code_review/lib/analysis/buildArchitecturePrompt.ts)**: Pure prompt assembler injecting file tree, critical file contents, and strict JSON output schema instructions.
- **[lib/analysis/parseArchitectureResponse.ts](file:///Users/yashwanthreddykoppula/Desktop/ai_power_code_review/lib/analysis/parseArchitectureResponse.ts)**: Zod schema validator for LLM output, assigns unique UUIDs, and filters by `minSeverity`.

### Phase 4 — Security Pipeline (`lib/security`)
- **[lib/security/runSemgrep.ts](file:///Users/yashwanthreddykoppula/Desktop/ai_power_code_review/lib/security/runSemgrep.ts)**: Executes `semgrep --config=auto <repoPath> --json --quiet` via `child_process.execFile` (no shell injection risk). Gracefully degrades if Semgrep is not installed.
- **[lib/security/parseSemgrepOutput.ts](file:///Users/yashwanthreddykoppula/Desktop/ai_power_code_review/lib/security/parseSemgrepOutput.ts)**: Zod validator parsing raw Semgrep JSON, normalizes file paths, caps at 50 findings.
- **[lib/security/explainFindings.ts](file:///Users/yashwanthreddykoppula/Desktop/ai_power_code_review/lib/security/explainFindings.ts)**: Second LLM pass that translates Semgrep rules into plain English explanations and assigns risk ranks (1 = most critical).

### Phase 5 — Pipeline Orchestrator & Queue (`lib/pipeline`, `lib/queue`)
- **[lib/pipeline/runFullScan.ts](file:///Users/yashwanthreddykoppula/Desktop/ai_power_code_review/lib/pipeline/runFullScan.ts)**: Master orchestrator: creates/updates `Scan` status (`pending` -> `running` -> `complete`/`failed`), runs architecture and security concurrently (`Promise.all`), computes summary counts, and guarantees `cleanup()` in `finally`.
- **[lib/queue/scanQueue.ts](file:///Users/yashwanthreddykoppula/Desktop/ai_power_code_review/lib/queue/scanQueue.ts)**: BullMQ queue (`scan-jobs`) with IORedis connection, lazy initialization to prevent build-time crashes, exponential retries.
- **[lib/queue/scanWorker.ts](file:///Users/yashwanthreddykoppula/Desktop/ai_power_code_review/lib/queue/scanWorker.ts)**: Long-lived standalone BullMQ worker process with configurable concurrency and graceful shutdown handlers.

### Phase 6 — GitHub Integration (`lib/github`)
- **[lib/github/validateWebhookSignature.ts](file:///Users/yashwanthreddykoppula/Desktop/ai_power_code_review/lib/github/validateWebhookSignature.ts)**: Timing-safe HMAC-SHA256 verification using `crypto.timingSafeEqual`.
- **[lib/github/getRepoMetadata.ts](file:///Users/yashwanthreddykoppula/Desktop/ai_power_code_review/lib/github/getRepoMetadata.ts)**: Octokit REST client wrapper fetching stars, default branch, privacy status, and clone URLs.

### Phase 7 — REST API Endpoints (`app/api/`)
- **[POST /api/analyze](file:///Users/yashwanthreddykoppula/Desktop/ai_power_code_review/app/api/analyze/route.ts)**: Validates URL, creates `Scan` document in MongoDB with status `pending`, enqueues job into BullMQ, and immediately responds with HTTP 202 `{ scanId, message }`.
- **[POST /api/webhook](file:///Users/yashwanthreddykoppula/Desktop/ai_power_code_review/app/api/webhook/route.ts)**: Reads raw body, verifies HMAC signature, handles `ping`, ignores non-default branch pushes, fetches repo scan settings, creates `Scan`, and enqueues job.
- **[GET /api/scans](file:///Users/yashwanthreddykoppula/Desktop/ai_power_code_review/app/api/scans/route.ts)**: Lists recent scans with optional `?repo=owner/repo` filter and pagination.
- **[GET /api/scans/[scanId]](file:///Users/yashwanthreddykoppula/Desktop/ai_power_code_review/app/api/scans/%5BscanId%5D/route.ts)**: Returns full `ScanResult` by MongoDB ObjectId for frontend polling.

---

## 3. Integration Guide for Teammates

### For Person 2 (Akhil — Dashboard & Findings UI)
1. **Trigger a scan**:
   - Call `POST /api/analyze` with JSON: `{ "gitUrl": "https://github.com/owner/repo" }`.
   - You will receive HTTP 202: `{ "scanId": "<mongoId>", "message": "Scan queued successfully." }`.
2. **Poll for completion**:
   - Poll `GET /api/scans/<scanId>` every 3 seconds.
   - Initial status will be `"pending"` or `"running"`.
   - When `status === "complete"`, render the findings from `architectureFindings` and `securityFindings`.
   - If `status === "failed"`, inspect `errorMessage`.
3. **Display metric cards**:
   - Use `summary` object directly:
     ```typescript
     {
       architectureHigh, architectureMedium, architectureLow,
       securityCritical, securityHigh, securityMedium, securityLow,
       totalIssues
     }
     ```

### For Person 3 (Srija — Auth, Repo Connection & Settings)
1. **Webhook registration**:
   - Configure GitHub webhook payload URL to: `https://<your-domain>/api/webhook`.
   - Set Webhook Secret to match `process.env.GITHUB_WEBHOOK_SECRET`.
   - Event type: `push`.
2. **Repo Settings**:
   - When a user saves scan settings in the settings panel, write them to `Repo.settings` in MongoDB:
     ```typescript
     {
       skipArchitecture: boolean,
       skipSecurity: boolean,
       minSeverity: 'high' | 'medium' | 'low'
     }
     ```
   - Both `POST /api/analyze` and `POST /api/webhook` automatically apply these settings.

---

## 4. Verification & Testing Evidence

All checks have been executed and verified in the local workspace:

1. **TypeScript Compilation:**
   ```bash
   npx tsc --noEmit
   # Exit code: 0 (No type errors)
   ```

2. **Linter:**
   ```bash
   npm run lint
   # Exit code: 0 (0 errors, 0 warnings)
   ```

3. **Production Build:**
   ```bash
   npm run build
   # Exit code: 0
   # Routes generated:
   # ├ ○ /
   # ├ ○ /_not-found
   # ├ ƒ /api/analyze
   # ├ ƒ /api/scans
   # ├ ƒ /api/scans/[scanId]
   # └ ƒ /api/webhook
   ```

4. **Automated Unit Tests:**
   ```bash
   npm test
   # Result: 10/10 passing tests
   ```

5. **Live Groq API Test:**
   - Groq integration verified live with `openai/gpt-oss-120b` returning structured JSON successfully.

---

## 5. How to Run Locally

1. **Verify Environment Variables** in `.env`:
   ```env
   OPENAI_API_KEY=gsk_...
   MONGODB_URI=mongodb+srv://...
   REDIS_URL=redis://default:...
   GITHUB_WEBHOOK_SECRET=...
   GITHUB_TOKEN=ghp_...
   ```

2. **Start the Next.js Dev Server:**
   ```bash
   npm run dev
   ```

3. **Start the BullMQ Worker (separate terminal):**
   ```bash
   npx tsx lib/queue/scanWorker.ts
   ```

4. **Run Unit Tests:**
   ```bash
   npm test
   ```
