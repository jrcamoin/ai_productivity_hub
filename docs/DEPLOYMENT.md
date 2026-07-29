# Production deployment

## Required managed services

1. PostgreSQL with the `vector` extension.
2. S3-compatible storage such as AWS S3 or Cloudflare R2.
3. Google Cloud OAuth with Gmail and Calendar APIs enabled.
4. Stripe with a recurring Pro price and Customer Portal enabled.
5. OpenAI API access.
6. A durable job provider such as Inngest or Trigger.dev.

## Database

Keep SQLite for local development. Generate the production PostgreSQL schema,
point `DATABASE_URL` at a non-production database, and apply the base schema:

```bash
npm run db:generate:production
npm run db:migrate:production
psql "$DATABASE_URL" -f prisma/production/001_pgvector.sql
```

The reviewed baseline lives under `prisma/migrations`. Review all future
generated SQL. Enable backups and point-in-time recovery before creating the
first customer workspace.

## Storage

Set the five `S3_*` variables. The same adapter supports AWS S3 and R2. Configure:

- private bucket access;
- server-side encryption;
- CORS for the production origin;
- lifecycle deletion for abandoned uploads;
- malware scanning before processed files become available.

## Google OAuth

Enable Gmail API and Google Calendar API. Configure:

```text
https://YOUR_DOMAIN/api/auth/callback/google
```

The app requests offline access. Google may require OAuth verification before
Gmail scopes can be used by external users.

Set `BACKGROUND_JOBS_URL` and `BACKGROUND_JOBS_SECRET` to a durable job
ingestion endpoint. The shared job contract supports `google.sync`,
`document.process`, and `meeting.summarize`. Document jobs are executable through
`POST /api/internal/jobs`; configure the job provider to deliver the signed job
envelope to that route. The local app continues inline when no provider is
configured. Document, Google sync, and meeting-summary worker handlers are
enabled.

## Rate limits and monitoring

Set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` so rate limits are
shared across instances. Configure uptime checks against `/api/health`; a `503`
means a required service is unavailable. Forward JSON application logs to the
hosting log drain and alert on `api_request_failed`.

## Stripe

Create a recurring Pro price, enable Customer Portal, and register:

```text
https://YOUR_DOMAIN/api/billing/webhook
```

Subscribe to `customer.subscription.created` and
`customer.subscription.updated`. Test checkout, upgrades, cancellation, failed
payments, and replayed webhook events in Stripe test mode.

## Release gate

The GitHub CI workflow must pass. Then validate:

1. Google sign-in and workspace creation.
2. Task creation and authorization isolation.
3. Calendar/Gmail synchronization.
4. PDF upload and cited answer.
5. Meeting summary and task extraction.
6. Stripe checkout, portal, and cancellation.
7. Account export and deletion before public launch.
8. Anonymous production API requests return `401`.
9. Replayed Stripe events return success without duplicate processing.
10. Background document jobs survive a worker retry.

Record the owner, evidence link, and completion date for every item. Do not launch
with a waived authorization, deletion, backup, or webhook-signature check.
