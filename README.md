# Orbit — AI Productivity Hub

A polished SaaS foundation for one workspace that brings together email, calendar,
notes, tasks, documents, meeting summaries, search, AI chat, and billing.

## Stack

- Next.js App Router + TypeScript
- PostgreSQL + Prisma
- Auth.js with Google OAuth
- OpenAI Responses API
- Stripe subscriptions
- Provider-ready Gmail, Calendar, file storage, and vector search boundaries

## Run locally

```bash
npm install
cp .env.example .env
npm run db:generate
npm run dev
```

SQLite is initialized at `prisma/dev.db`. The dashboard works without provider
credentials and persists local tasks, notes, meetings, files, and document chunks.

## Implemented workflows

- Workspace-scoped task and note CRUD
- PDF, DOCX, TXT, and Markdown uploads (10 MB limit)
- Text extraction, chunking, embeddings, and citation-aware document chat
- Unified search across tasks, notes, documents, and meetings
- Meeting transcript summaries and automatic action-item tasks
- Auth.js Google login with offline Gmail and Calendar scopes
- Gmail and Calendar sync boundary
- Stripe subscription checkout and signed webhook handling
- Responsive dashboard, searchable command bar, uploads, and AI drawer
- Security headers, input validation, ownership filters, and health checks

## Provider setup

### Google

Create a Google OAuth web application. Add this redirect URI:

```text
http://localhost:3000/api/auth/callback/google
```

Set `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET`. For production, enable the Gmail
and Calendar APIs, configure the OAuth consent screen, and replace the origin.

### OpenAI

Set `OPENAI_API_KEY`. `OPENAI_MODEL` and `OPENAI_EMBEDDING_MODEL` remain
configurable. Existing files uploaded without a key should be re-uploaded to
generate embeddings.

### Stripe

Create a recurring price and set `NEXT_PUBLIC_STRIPE_PRICE_PRO`. Forward local
events with the Stripe CLI:

```bash
stripe listen --forward-to localhost:3000/api/billing/webhook
```

Set the returned `STRIPE_WEBHOOK_SECRET` and your `STRIPE_SECRET_KEY`.

### Production storage and database

Local files are stored under `uploads/`; swap the storage implementation for R2
or S3 before serverless deployment. The local Prisma datasource is SQLite. For
production, change it to PostgreSQL, migrate the schema, and move embedding
ranking to `pgvector`.

## API routes

| Route | Purpose |
| --- | --- |
| `/api/tasks`, `/api/tasks/:id` | Task CRUD |
| `/api/notes`, `/api/notes/:id` | Note CRUD |
| `/api/files` | Upload, extract, chunk, and embed files |
| `/api/search?q=` | Unified workspace search |
| `/api/chat` | Retrieval-assisted AI chat |
| `/api/meetings` | Summaries and task extraction |
| `/api/integrations/google/sync` | Gmail/Calendar sync |
| `/api/billing/checkout` | Stripe subscription checkout |
| `/api/billing/portal` | Stripe customer billing portal |
| `/api/billing/webhook` | Verified Stripe subscription events |
| `/api/health` | Environment readiness |

## Product architecture

The app is organized around a unified `Workspace`. Notes, tasks, files, calendar
events, messages, meetings, and AI conversations all belong to it. This keeps
authorization and search filters simple and makes team workspaces possible later.

Server-side integration boundaries live in `src/lib`. UI features live in
`src/components`, and API routes are under `src/app/api`.

## Recommended production services

- Postgres: Neon, Supabase, or Railway
- File storage: Cloudflare R2 or AWS S3
- Search: Postgres full-text + pgvector initially
- Async jobs: Inngest or Trigger.dev
- Email/calendar: Google OAuth with offline access
- Hosting: Vercel

## Next milestones

1. Add a production Postgres database and object storage.
2. Move Google synchronization and document processing to durable jobs.
3. Configure provider credentials and Stripe products.
4. Add Redis-backed rate limits, observability, and automated browser tests.
5. Complete privacy, retention, export, and account-deletion workflows.
