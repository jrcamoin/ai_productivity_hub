# Production deployment

## Required managed services

1. PostgreSQL with the `vector` extension.
2. S3-compatible storage such as AWS S3 or Cloudflare R2.
3. Google Cloud OAuth with Gmail and Calendar APIs enabled.
4. Stripe with a recurring Pro price and Customer Portal enabled.
5. OpenAI API access.
6. A durable job provider such as Inngest or Trigger.dev.

## Database

Change `provider = "sqlite"` to `provider = "postgresql"` in
`prisma/schema.prisma`, point `DATABASE_URL` at a non-production migration
database, and create the base migration:

```bash
npx prisma migrate dev --name initial_postgres
npx prisma migrate deploy
psql "$DATABASE_URL" -f prisma/production/001_pgvector.sql
```

Review generated SQL before applying it to production. Backups and point-in-time
recovery should be enabled before the first customer workspace is created.

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
`document.process`, and `meeting.summarize`. The local app continues inline when
no provider is configured.

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
