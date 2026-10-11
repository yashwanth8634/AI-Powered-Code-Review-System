# Project architecture

## Dependency direction

The project is organized around one-way dependencies:

```text
app routes/pages -> application services -> domain modules -> infrastructure
       UI         -> lib/http/client       -> lib/types     -> db/github/queue
```

- `app/` contains Next.js routes, layouts, and UI composition only.
- `app/providers.tsx` owns cross-screen client state. Components consume state
  through hooks instead of duplicating request/loading/error logic.
- `lib/validation/` contains reusable input validation. The old
  `app/utils/validateGitUrl.ts` path is a compatibility re-export only.
- `lib/http/` contains transport concerns: JSON parsing, API error mapping, and
  browser request handling.
- `lib/config/` is the only application-owned access point for server
  environment variables. Secrets must never be imported by client components.
- `lib/analysis`, `lib/security`, and `lib/ingestion` contain domain work and
  should not import from `app/`.
- `lib/db`, `lib/github`, and `lib/queue` contain infrastructure adapters.

## API conventions

API routes should remain thin:

1. Authenticate and validate the request at the route boundary.
2. Call a domain/application service.
3. Return a stable JSON contract and an appropriate HTTP status.
4. Log server-side details while returning safe messages to clients.

New endpoints should follow the existing resource structure:

```text
/api/{resource}              collection operations
/api/{resource}/{resourceId} single-resource operations
```

Use `lib/http/client.ts` from browser components. It consistently handles
non-JSON failures, network failures, and API error payloads.

## Error handling

Errors crossing an API boundary must be converted to a safe response. Domain
errors should use the typed errors in `lib/errors/` so callers can distinguish
validation, ingestion, LLM, and security failures without parsing messages.
Unexpected errors are logged with the route context and returned as a generic
500 response.

## Environment configuration

Create `.env.local` from the project’s deployment configuration. Required
server values include `AUTH_SECRET`, `MONGODB_URI`, `REDIS_URL`,
`OPENAI_API_KEY`, `GITHUB_WEBHOOK_URL`, and `GITHUB_WEBHOOK_SECRET`.
`GITHUB_TOKEN` remains optional for public repository metadata requests.

Do not read `process.env` directly in a route or domain module. Add a typed
accessor to `lib/config/env.ts` when a new setting is introduced.

## Local checks

```bash
npm run lint
npm run build
npm test
```

The scan worker is a separate long-running process and requires Redis and
MongoDB. The web process only enqueues work; it must not run the full scan in a
request handler.
