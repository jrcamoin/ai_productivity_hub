# Privacy and retention operating policy

This document is an implementation checklist, not legal advice. Have launch
policies reviewed for the jurisdictions where Orbit is offered.

## Data inventory

Orbit stores account identity, OAuth credentials, workspace tasks and notes,
uploaded files and extracted chunks, meeting transcripts and summaries, AI
conversation content, integration metadata, and Stripe subscription identifiers.
Uploaded objects are private and keyed by workspace.

Google and OpenAI data must only be used to provide user-requested functionality.
Do not use customer content to train internal models. Keep production credentials
out of logs, analytics, support tickets, and exports intended for other users.

## Retention schedule

| Data | Active account | After account deletion |
| --- | --- | --- |
| Workspace records and AI content | Until user deletes it | Delete immediately from the primary database |
| Uploaded source files | Until user or workspace deletion | Delete immediately from object storage |
| OAuth access and refresh tokens | While integration is connected | Revoke where supported, then delete immediately |
| Billing records | While subscribed | Retain only the minimum required by tax/accounting rules |
| Application logs | 30 days | Expire through the log provider |
| Backups | Rolling 30 days | Expire naturally; document restore-time deletion controls |

Account deletion currently removes solely owned workspaces, stored objects, and
active Stripe subscriptions. Owners must transfer shared workspaces first. Test
this workflow quarterly, including restoration from backup and subsequent expiry.

## User rights workflow

- Export: `GET /api/account/export` returns the signed-in user's workspace data.
- Deletion: `DELETE /api/account` requires a signed-in session.
- Correction: users can update or delete notes and tasks in the product.
- Requests received by support must be identity-verified and tracked to closure.

Before launch, publish a customer-facing privacy notice identifying the operator,
subprocessors, purposes, retention periods, contact route, international
transfers, and applicable user rights.
