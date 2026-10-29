# AI Powered Code Review System

An AI-powered code review system that analyzes GitHub repositories and helps identify architecture problems, security risks, and code quality issues.

## Features

### Repository Analysis
- Analyze GitHub repositories
- AI-powered code review
- Architecture analysis
- Security analysis
- Scan reports
- Scan history

### GitHub Integration
- GitHub OAuth authentication
- Every application user has an authenticated GitHub account
- GitHub accounts are persisted in MongoDB `User` documents
- Public landing page with a clear “Sign in with GitHub” entry point
- View and select GitHub repositories
- Connect multiple repositories per account
- Store connected repository information separately for each account
- View scan history scoped to the signed-in account and repository
- First-run flow guides users through selecting, connecting, and scanning a repository
- GitHub webhook integration

### Repository Analysis Settings
- Skip architecture analysis
- Skip security analysis
- Set minimum severity: Low, Medium, or High
- Save and retrieve repository analysis settings

## Technology Stack
- Next.js
- React
- TypeScript
- GitHub API
- Auth.js
- MongoDB and Mongoose
- OpenAI API
- Redis and BullMQ

## Getting Started

### Prerequisites
- Node.js and npm
- MongoDB
- Redis for scan queue processing
- GitHub OAuth credentials
- Required AI API credentials

### Installation

Install dependencies:

```bash
npm install
```

Configure the required environment variables in `.env.local`. Never commit or share API keys, OAuth secrets, or database credentials.

### Run Locally

```bash
npm run dev
```

Open http://localhost:3000 in your browser.

Start the scan worker in a second terminal. The API only queues scans; the
worker performs cloning, architecture analysis, and security analysis:

```bash
npm run worker
```

The worker requires the same MongoDB, Redis, and AI environment variables as
the Next.js process. Semgrep must also be installed in the worker environment
for security findings to be collected.

## Development Status

Account authentication, per-account repository connections, repository-scoped scan history, and analysis settings have been implemented. Scan execution, Redis queue availability, webhook processing, and end-to-end behavior require verification.

Existing MongoDB deployments must migrate legacy `Repo` and `Scan` documents to include the owning `User._id` before using the new required ownership fields. Existing users should sign out and sign in once so their GitHub account is upserted into the `User` collection.

## Project structure

The application follows a layered structure. See
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the dependency rules and
API conventions.

```text
app/
  api/              thin HTTP route handlers
  components/       shared UI components
  providers.tsx     shared client state providers
  */page.tsx        route-level UI composition
lib/
  analysis/         architecture/LLM domain logic
  config/           server environment access
  db/               MongoDB connection and models
  github/           GitHub infrastructure adapters
  http/             shared API transport and error handling
  ingestion/        repository ingestion
  pipeline/         scan orchestration
  queue/            Redis/BullMQ integration
  security/         Semgrep and security analysis
  validation/       reusable input validation
  types/            shared contracts
```

Keep secrets server-side, use `lib/http/client.ts` for browser requests, and
add new API resources under `app/api/{resource}` without placing business
logic in route files.

## Contributors

Developed collaboratively as an AI-powered code review project.