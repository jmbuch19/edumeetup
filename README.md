# EdUmeetup

EdUmeetup is IAES's student-university engagement platform for U.S. higher-education advising, university discovery, fairs, and scheduled meetings.

The application is a production Next.js system rather than the original MVP scaffold. It includes student and university workflows, representative scheduling, fairs and circuits, notifications, advising/AI features, alumni, documents, payments, support, and operational automation.

## Production stack

- Next.js 15 / React 19 / TypeScript
- PostgreSQL (Neon) with Prisma
- NextAuth v5 authentication
- Netlify for the production web application and Scheduled Functions
- GitHub Actions for CI and database migration automation
- Cloudflare R2 for file storage
- Resend / email services for transactional notifications
- Sentry for application monitoring
- AI SDK providers for advising and AI-assisted workflows

> Production deployment is currently **Netlify**, not Vercel. Old Vercel status checks are not deployment gates for this repository.

## Canonical meeting flow

The production meeting system uses `AvailabilitySlot` records as the authoritative source of bookable time.

- Student booking: `app/student/book/[universityId]`
- Student meetings: `app/student/meetings`
- University / representative meetings: `app/university/meetings`
- Hardened meeting actions: `app/actions/meeting-*.ts`

Booking and rescheduling use database-backed slot validation and transactional locking. New work should not reintroduce timestamp-only booking or the legacy meeting action stubs in `app/actions.ts`.

## Local development

1. Install dependencies:

```bash
npm ci
```

2. Configure the required environment variables in `.env.local`. At minimum, local development normally needs database and authentication configuration appropriate to the workflow being tested.

3. Generate Prisma Client:

```bash
npx prisma generate --schema=./prisma/schema.prisma
```

4. Start development:

```bash
npm run dev
```

## Quality gates

Run the same core checks used by GitHub Actions before merging:

```bash
npm run lint
npm run typecheck
npm test
```

The CI workflow is `.github/workflows/ci.yml` and runs on `main`, `codex/**` branches, and pull requests targeting `main`.

## Database migrations

Schema migrations are applied with:

```bash
npx prisma migrate deploy
```

The production GitHub migration workflow is `.github/workflows/migrate.yml` and uses the `DIRECT_URL` repository secret. Do not use `prisma db push` as the normal production migration mechanism.

For schema-breaking changes, use an expand/migrate/contract approach so the currently published Netlify application remains compatible while migrations and deployment complete.

## Netlify

`netlify.toml` is the production deployment configuration. It defines the Next.js build, Prisma bundling requirements, security headers, and scheduled Netlify functions.

Netlify Scheduled Functions are platform-triggered jobs. Netlify documents that published scheduled functions cannot be invoked directly by URL, so these functions should not depend on a custom request header that the scheduler does not provide. HTTP-exposed cron/API routes should continue to use `CRON_SECRET` and fail closed.

See [DEPLOYMENT.md](./DEPLOYMENT.md) for the production checklist, environment variables, migrations, verification, and rollback procedure.

## Security and operations

- Keep secrets in Netlify / GitHub environment or secret stores; never commit them.
- Keep cron/API authorization separate from Netlify Scheduled Function semantics.
- Treat CI failures as release blockers even when unrelated legacy provider checks are red.
- Review dependency audit findings deliberately. Do not use `npm audit fix --force` on production without reviewing breaking changes.
- Validate student, university, representative, and admin authorization whenever adding server actions.

## Repository workflow

Production hardening is performed on a branch and validated by CI before merge. `main` should remain deployable.
