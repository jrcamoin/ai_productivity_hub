# Incident response runbook

## Severity

- **SEV-1:** unauthorized data access, credential exposure, destructive data loss,
  or a complete production outage.
- **SEV-2:** major feature unavailable, delayed jobs, or material billing errors.
- **SEV-3:** limited degradation with a safe workaround.

## First response

1. Assign an incident lead and start a timestamped incident record.
2. Contain the issue without destroying evidence. Rotate exposed credentials and
   disable affected integrations or routes when necessary.
3. Preserve relevant application, provider, authentication, and audit logs.
4. Assess affected workspaces, data categories, time window, and subprocessors.
5. Communicate status on a fixed cadence and make legally required notifications.
6. Restore from a verified clean state and validate workspace isolation.
7. Publish a blameless review with corrective actions, owners, and due dates.

## Operational alerts

Alert on repeated `/api/health` failures, elevated `api_request_failed` events,
Stripe webhook failures, job retry exhaustion, OAuth refresh failures, unusual
account exports/deletions, and unexpected object-storage access.

Run a tabletop exercise before launch and twice yearly thereafter.
