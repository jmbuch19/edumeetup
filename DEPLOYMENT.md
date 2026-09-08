# EdUmeetup Production Deployment Guide

## 1. Deployment model

EdUmeetup is currently deployed with:

- **Application hosting:** Netlify
- **Database:** Neon PostgreSQL through Prisma
- **Source / CI:** GitHub
- **Database migrations:** GitHub Actions (`.github/workflows/migrate.yml`)
- **Production domain:** `https://www.edumeetup.com`

Vercel is not the active production hosting platform. Old Vercel commit statuses may still appear in GitHub if the old integration remains connected; they are not a production deployment gate.

## 2. Pre-merge checks

Before merging a production change, the branch must pass:

```bash
npm ci
npx prisma generate --schema=./prisma/schema.prisma
npm run lint
npm run typecheck
npm test
```

GitHub Actions runs the repository CI workflow automatically on `main`, `codex/**`, and pull requests targeting `main`.

Do not merge merely because Netlify can build a preview. CI type safety and tests are separate release gates.

## 3. Netlify environment variables

Configure production values in Netlify Site configuration → Environment variables. Never commit secret values.

### Core

- `DATABASE_URL` — Neon PostgreSQL application connection string
- `AUTH_URL` — `https://www.edumeetup.com`
- `AUTH_SECRET` — stable production NextAuth v5 secret
- `AUTH_GOOGLE_ID` — Google OAuth client ID
- `AUTH_GOOGLE_SECRET` — Google OAuth client secret
- `NEXT_PUBLIC_APP_URL` — `https://www.edumeetup.com`
- `SUPPORT_EMAIL` — support mailbox
- `NEXT_PUBLIC_SUPPORT_EMAIL` — support mailbox exposed to client UI
- `ADMIN_NOTIFICATION_EMAIL` — operational alert mailbox when used

### Email

- `RESEND_API_KEY`
- `EMAIL_FROM`

Configure any SMTP variables only if a code path still intentionally uses SMTP.

### Storage

- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET`
- `R2_PUBLIC_URL`

### AI / monitoring

Configure only the providers actually enabled in production, for example:

- `ANTHROPIC_API_KEY`
- other AI provider keys used by enabled routes
- `NEXT_PUBLIC_SENTRY_DSN`
- `NEXT_PUBLIC_APP_ENV=production`
- `SENTRY_AUTH_TOKEN`

### Cron secrets

- `CRON_SECRET` is required for HTTP-exposed cron/API endpoints that explicitly authenticate with it.
- Do **not** use `CRON_SECRET` as a request-header requirement inside native Netlify Scheduled Functions. Netlify invokes those functions through the platform scheduler and does not supply an arbitrary custom header.

## 4. Database migrations

Production schema changes must be represented by committed Prisma migrations.

The GitHub workflow `.github/workflows/migrate.yml` runs `prisma migrate deploy` on pushes to `main` using the repository secret `DIRECT_URL` for the direct Neon connection.

Required GitHub Actions secret:

- `DIRECT_URL` — direct/non-pooled Neon connection string suitable for Prisma migrations

Do not use a public seed endpoint or `prisma db push` as the normal production migration path.

### Migration safety

A push to `main` can cause the migration workflow and Netlify deployment to progress independently. Therefore schema changes should be backward compatible with the currently deployed application:

1. Expand the schema first (new nullable columns/tables, compatible indexes).
2. Deploy code that can operate across the transition.
3. Backfill/migrate data if required.
4. Remove old fields/constraints only in a later release after all production code no longer depends on them.

For a destructive migration, coordinate the publish window rather than assuming migration and deploy ordering.

## 5. Netlify build

The production build is defined in `netlify.toml` and runs the Next.js build with Prisma Client generation. `@netlify/plugin-nextjs` handles the Next.js deployment integration.

Netlify must have access to the production environment variables required by build-time and runtime code.

Native scheduled jobs are defined either inline in their function `config.schedule` or in `netlify.toml`. Netlify Scheduled Functions run only for published deploys; branch deploys/previews can be triggered manually from Netlify for testing.

## 6. Release procedure

1. Work on a non-`main` branch.
2. Confirm GitHub CI is green.
3. Review the branch diff, especially Prisma schema/migrations and authentication/authorization changes.
4. Merge to `main`.
5. Confirm the database migration workflow succeeds when migrations are present.
6. Confirm the Netlify production deploy succeeds.
7. Run the post-deploy smoke tests below.

## 7. Post-deploy smoke tests

At minimum verify:

- Student authentication and dashboard access
- University authentication and dashboard access
- University representative access to assigned meetings
- University browse/profile pages
- Student slot-based meeting booking
- Student meeting list after booking
- University/rep meeting confirmation
- Student and university cancellation authorization
- Reschedule proposal, accept, and decline flows
- Transactional email/notifications for the tested workflow
- Fair/event pages relevant to the next live event
- Admin access to operational pages

For scheduled functions, use Netlify's **Run now** control on the function detail page when a safe manual test is appropriate, then inspect function logs and the corresponding idempotency/system-log record.

## 8. Rollback

If application code is unhealthy but the database migration is backward compatible:

1. Roll back to the previous known-good published deploy in Netlify.
2. Confirm core authentication and meeting flows recover.
3. Diagnose on a branch before republishing.

Do not blindly roll back a destructive database migration. Restore/forward-fix schema and data deliberately.

## 9. Provider status checks

GitHub can show a red overall commit indicator when an obsolete external provider check fails even if `CI / quality` passes. For EdUmeetup today, use these release signals:

- GitHub `CI / quality`
- GitHub database migration workflow when applicable
- Netlify deploy status

If Vercel is no longer used at all, disconnect its GitHub integration/checks from this repository to eliminate misleading commit statuses.
