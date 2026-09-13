# AI-Powered Code Review System — Project Spec & Task Breakdown

## 1. What We're Building

A tool that understands an entire codebase — not just a single diff — and gives three kinds of feedback:

1. **Context-aware review** — understands what the project actually does (folder structure, key modules, how pieces connect) before commenting, instead of judging a change in isolation.
2. **Architectural improvement suggestions** — flags bad structure: tightly coupled modules, missing separation of concerns, duplicated logic across files, inconsistent patterns.
3. **Security issue flagging** — hardcoded secrets, missing input validation, unsafe dependencies, injection risks.

It works in two modes:

- **On-demand scan** — user pastes a GitHub repo URL, clicks "Analyze," gets a full report.
- **Push-triggered rescan** — once a repo is connected, every push automatically re-runs the full analysis (not just the diff), so the report stays current and you can track how architecture/security health changes over time.

**Honesty note for the report:** this is not a custom-trained model. It's an LLM (GPT-4o or Claude, large context window) fed the project's structure and code, combined with a real static-analysis tool for security (Semgrep) so security findings aren't just "AI guessing." Say this plainly in the viva — it's a legitimate, respectable architecture, not a weakness to hide.

---

## 2. Why "Whole Codebase" Is Harder Than PR-Diff (and how we scope it realistically)

Understanding an entire codebase is a real, hard problem — large repos won't fit in any model's context window. For a 3-person team on a tight deadline, scope it like this:

- **Ingest smart, not everything.** Skip `node_modules`, build artifacts, lockfiles, binaries. Walk the repo, build a **file tree summary** + pull in the actual content of the most important files (entry points, config, largest/most-connected files).
- **Use a large-context model.** GPT-4o (128k tokens) or Claude (200k tokens) can hold a small-to-medium project's key files directly — no need for a vector database or embeddings pipeline for a demo-sized repo. This is the realistic, buildable version. Say clearly in the report: "scoped for small-to-medium repositories; a production version at enterprise scale would need a retrieval layer (embeddings + vector DB) to select relevant context instead of passing whole files."
- **Security scanning is a separate, real tool** — Semgrep (free, open-source, has ready-made rule sets for JS/Python/etc.) runs actual static analysis. The LLM then explains and prioritizes Semgrep's findings in plain language. This combination is genuinely stronger than "ask AI to find security bugs" — it's real static analysis plus AI-generated explanation, and it's easy to defend under questioning.

---

## 3. Tech Stack

- **Frontend/Dashboard:** Next.js (App Router)
- **Backend:** Next.js API routes + one background job runner (simple queue, e.g. `bullmq` with Redis, or even just an async function if traffic is low for a demo)
- **Database:** MongoDB Atlas (free tier) — stores repos, scan results, history
- **Repo Access:** GitHub API + `simple-git` or shallow `git clone` on the server to pull the actual files temporarily for analysis
- **AI:** OpenAI API (GPT-4o) or Claude API — large context call with file tree + key file contents
- **Security Scanning:** Semgrep CLI (run as a subprocess on the cloned repo)
- **Auth:** GitHub OAuth via NextAuth.js
- **Deployment:** Vercel for frontend/API routes; note that long-running clone+scan jobs may need a separate small server or serverless function with a longer timeout (Vercel functions have execution limits — mention this as a known constraint)

---

## 4. Team Split (3 people)

### Person 1 (Yashwanth d)

This is the actual hard problem. Everything else depends on this working.

1. **Repo Ingestion**
   - Given a GitHub URL, shallow-clone the repo into a temp directory on the server
   - Walk the file tree, exclude `node_modules`, `.git`, build folders, binaries, lockfiles
   - Build a compact "project summary" — folder structure as a tree, plus full content of the most important files (package.json, main entry files, largest source files, config files)

2. **Architecture Analysis Prompt**
   - Write a system prompt that gives the model the project summary and asks it to identify: tight coupling, duplicated logic, inconsistent patterns, missing separation of concerns, outdated/risky dependencies
   - Return structured output (JSON) — list of findings, each with a severity and a short explanation

3. **Security Pipeline**
   - Run Semgrep as a subprocess against the cloned repo (`semgrep --config=auto <path>`)
   - Parse Semgrep's JSON output, pass the raw findings into a second LLM call asking it to explain each finding in plain language and rank by real-world risk

4. **Push-Triggered Rescan**
   - Set up a GitHub webhook on `push` events
   - On push, re-clone/pull the latest code and re-run the full pipeline (ingestion → architecture prompt → security scan)
   - Save each scan as a new record so history/trends can be shown later

5. **Save Results**
   - Every scan (on-demand or push-triggered) gets saved: repo name, timestamp, trigger type, architecture findings, security findings, overall counts by severity

**Why this is core:** this is where all the real technical depth lives — repo parsing, context construction, prompt design, and integrating a real static-analysis tool. This is what you'll speak to most in the viva.

---

### Person 2 (Normal Work — Dashboard & Scan Trigger UI)

1. **"Analyze a Repo" Page**
   - Input field for a GitHub repo URL, an "Analyze" button
   - Calls Person 1's API to kick off an on-demand scan, shows a loading state (scans take time — clone + AI calls aren't instant)

2. **Scan Report Page**
   - Once a scan finishes, display results in three clear sections: Architecture Findings, Security Findings, Overall Summary
   - Each finding shown as a card: severity badge (High/Medium/Low), short title, explanation, and (for security) which file/line it's in

3. **History & Trends Page**
   - List of all past scans for a connected repo, sorted by date
   - A simple chart (Recharts) showing how the count of findings (by severity) has changed scan over scan — this is the "track health over time" story
   - Highlight when a push-triggered rescan found NEW issues that weren't there before (a "regression" flag) — meaningful, easy to build (just diff the previous scan's findings against the new one by title/file)

4. **Basic Styling**
   - Tailwind, keep it clean — a findings-list UI with severity colors is enough, don't over-design

**What you need from Person 1:** the exact shape of a "scan result" object (what fields exist) — ask for this on day 1.

---

### Person 3 (Normal Work — Auth, Repo Connection & Settings)

1. **GitHub OAuth Login**
   - NextAuth.js with GitHub provider — handles login/logout
   - After login, let the user list their repos (via GitHub API) and pick which one to "connect" for automatic push-triggered scanning

2. **Webhook Setup Automation**
   - When a user connects a repo, automatically register the GitHub webhook on that repo via the GitHub API (instead of making them do it manually) — this is a nice usability touch, mention it as a differentiator
   - Coordinate with Person 1 on the webhook endpoint URL/secret format

3. **Settings Page**
   - Let the user toggle categories on/off (e.g., "skip architecture checks, only run security") and set a severity threshold for what counts as worth flagging
   - Store preferences in the DB; Person 1's pipeline should read these before running the full analysis

4. **Landing Page + Documentation**
   - Explain what the tool does, how it's different from a normal PR-comment bot (whole-codebase understanding, not just diffs)
   - Write the README: setup steps, how repo connection + webhook registration works, screenshots
   - Keep notes as you go — this becomes your report content, don't leave it to the last day

---

## 5. Git Workflow

1. You (Person 1) create the main repo, push an initial Next.js scaffold
2. Person 2 and Person 3 **fork** it to their own accounts
3. Each works on a feature branch in their fork (e.g. `feature/scan-dashboard`, `feature/oauth-repo-connect`)
4. They push to their fork, open a **Pull Request** back to your main repo
5. You review and **merge**
6. Everyone pulls latest `main` daily before starting new work — agree on the scan-result data shape on Day 1 so nobody builds against wrong assumptions

---

## 6. Suggested Build Order (Timeline)

| Day | Person 1 (Core) | Person 2 (Dashboard) | Person 3 (Auth/Settings) |
|---|---|---|---|
| Day 1 | Repo clone + file tree/context builder | Static mockup of scan report UI with fake data | NextAuth GitHub login + list user's repos |
| Day 2 | Architecture LLM prompt + Semgrep integration | Connect "Analyze" button to real API, render real results | Repo connection flow + auto webhook registration |
| Day 3 | Push webhook + rescan pipeline + save history | History/trends page + regression flag | Settings page (toggle categories, threshold) |
| Final hours | End-to-end test: connect a real repo, push a commit, confirm full pipeline fires | Polish, styling, chart formatting | README, report writing, demo script |

---

## 7. Differentiators to Mention in the Report

1. **Whole-codebase context, not just diffs** — most PR-bots only see the changed lines; this understands the surrounding project
2. **Real static analysis (Semgrep) + AI explanation** — combining a proven tool with LLM-generated plain-language summaries, not pure "ask AI to spot bugs"
3. **Automatic webhook registration** — user doesn't manually configure GitHub, the tool does it for them on connect
4. **Regression tracking** — flags when a push introduces NEW issues versus the last scan, not just a flat list every time
5. **Configurable analysis** — user chooses which categories matter to them and sets their own severity bar

## 8. What NOT to Oversell

- Don't claim the model was trained/fine-tuned on architecture patterns — it wasn't
- Don't claim it works on massive enterprise codebases — scoped explicitly to small/medium repos due to context window limits; say this upfront, it shows engineering maturity rather than a gap
- Security findings come from Semgrep (a real, established tool) with AI explaining them — say this exact sentence if asked "how does it know what's a security issue"
