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

Before merging a production change, the branch must pass the same gates enforced by `.github/workflows/ci.yml`:

```bash
npm ci
npm audit --omit=dev --audit-level=high
npx prisma generate --schema=./prisma/schema.prisma
npm run lint
npm run typecheck
npm test
npm run build
```

High/critical production dependency findings are a blocking CI failure. The production Next.js build is also a blocking gate so a branch cannot be considered green based on lint/typecheck/tests alone.

GitHub Actions runs the repository CI workflow automatically on `main`, `codex/**`, and pull requests targeting `main`.

## 3. Netlify environment variables

Configure production values in Netlify Site configuration → Environment variables. Never commit secret values.

### Core

- `DATABASE_URL` — Neon PostgreSQL application connection string
- `AUTH_URL` — `https://www.edumeetup.com`
- `AUTH_SECRET` — stable production NextAuth v5 secret
- `GOOGLE_CLIENT_ID` — Google OAuth client ID used by `lib/auth.ts`
- `GOOGLE_CLIENT_SECRET` — Google OAuth client secret used by `lib/auth.ts`
- `NEXT_PUBLIC_APP_URL` — `https://www.edumeetup.com`
- `SUPPORT_EMAIL` — support mailbox
- `NEXT_PUBLIC_SUPPORT_EMAIL` — support mailbox exposed to client UI
- `ADMIN_NOTIFICATION_EMAIL` — operational alert mailbox when used

### Email

- `RESEND_API_KEY`
- `EMAIL_FROM`

The production magic-link path uses Resend. SMTP variables are not part of the required production auth contract unless an intentionally retained code path explicitly needs them.

### Meetings and payments

- `WHEREBY_API_KEY` — automatic meeting-room creation when confirming a meeting
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`
- `NEXT_PUBLIC_RAZORPAY_KEY_ID`
- `CIRCUIT_PRICE_INR` — optional circuit price override; current code expects the value in **paise**, not rupees

### Bot protection

- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
- `TURNSTILE_SECRET_KEY`

### AI / quota controls

Configure keys for the features actually enabled in production:

- `GROQ_API_KEY` — Admissions Concierge route
- `ANTHROPIC_API_KEY` — authenticated student adviser where enabled
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

### Storage

- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET`
- `R2_PUBLIC_URL`

### Monitoring

- `NEXT_PUBLIC_SENTRY_DSN`
- `NEXT_PUBLIC_APP_ENV=production`
- `SENTRY_AUTH_TOKEN` when source-map upload/release integration is enabled

### Cron secrets

- `CRON_SECRET` is required for HTTP-exposed cron/API endpoints that explicitly authenticate with it.
- Do **not** use `CRON_SECRET` as a request-header requirement inside native Netlify Scheduled Functions. Netlify invokes those functions through the platform scheduler and does not supply an arbitrary custom header.

## 4. Database migrations

Production schema changes must be represented by committed Prisma migrations.

The GitHub workflow `.github/workflows/migrate.yml` runs `prisma migrate deploy` on **every push to `main`**, using the repository secret `DIRECT_URL` for the direct Neon connection. When a release contains no new migration, Prisma should simply report that there are no pending migrations.

Required GitHub Actions secret:

- `DIRECT_URL` — direct/non-pooled Neon connection string suitable for Prisma migrations

Do not use a public seed endpoint or `prisma db push` as the normal production migration path.

If a release contains no Prisma schema/migration change, no migration should be invented merely for deployment.

### Migration safety

A push to `main` can cause the migration workflow and Netlify deployment to progress independently. Therefore schema changes should be backward compatible with the currently deployed application:

1. Expand the schema first (new nullable columns/tables, compatible indexes).
2. Deploy code that can operate across the transition.
3. Backfill/migrate data if required.
4. Remove old fields/constraints only in a later release after all production code no longer depends on them.

For a destructive migration, coordinate the publish window rather than assuming migration and deploy ordering.

## 5. Netlify build and security headers

The production build is defined in `netlify.toml` and runs Prisma Client generation plus the Next.js production build. `@netlify/plugin-nextjs` handles the Next.js deployment integration.

Netlify must have access to the production environment variables required by build-time and runtime code.

**Content Security Policy has one source of truth:** `next.config.mjs`. Do not add a second `Content-Security-Policy` header in `netlify.toml`. Multiple CSP headers are enforced together and can silently block required third-party integrations such as Cloudflare Turnstile, Razorpay, Wati, Sentry, or Whereby.

Native scheduled jobs are defined either inline in their function `config.schedule` or in `netlify.toml`. Netlify Scheduled Functions run only for published deploys; branch deploys/previews can be triggered manually from Netlify for testing.

## 6. Release procedure

1. Work on a non-`main` branch.
2. Confirm GitHub CI is green, including the production build step.
3. Review the branch diff, especially Prisma schema/migrations and authentication/authorization changes.
4. Verify the required production environment variables exist in Netlify without exposing their secret values.
5. Confirm a Netlify branch/preview deploy succeeds when available.
6. Merge to `main` only after the above checks are complete.
7. Confirm the database migration workflow succeeds (it runs on every `main` push).
8. Confirm the Netlify production deploy succeeds.
9. Run the post-deploy smoke tests below.

## 7. Post-deploy smoke tests

At minimum verify:

- Student magic-link and Google authentication
- University authentication and dashboard access
- Cloudflare Turnstile on login/public protected forms
- University representative access to assigned meetings
- University browse/profile pages
- Student slot-based meeting booking
- Student meeting list after booking
- University/rep meeting confirmation and Whereby room creation
- Student and university cancellation authorization
- Reschedule proposal, accept, and decline flows
- 24h/1h meeting reminder path
- Transactional email/notifications for the tested workflow
- IAES adviser handoff from a completed meeting
- Admissions Concierge response when AI is enabled
- Razorpay order/webhook path when payments are enabled
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
- GitHub database migration workflow
- Netlify deploy status

If Vercel is no longer used at all, disconnect its GitHub integration/checks from this repository to eliminate misleading commit statuses.
