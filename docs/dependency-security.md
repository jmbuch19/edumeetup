# Dependency Security

## Remediated baseline

The dependency-hardening batch on 2026-09-08 reduced the complete dependency-tree audit from **39 vulnerabilities** to **8 vulnerabilities** and, more importantly, reduced the production-only audit from **37 vulnerabilities** to **7 vulnerabilities**.

Before remediation, the full tree included:

- 3 low
- 13 moderate
- 20 high
- 3 critical

After the validated non-breaking remediation, the full tree reports:

- 1 low
- 1 moderate
- 6 high
- **0 critical**

The production-only audit reports:

- 1 moderate
- 6 high
- **0 critical**

The Auth.js security fixes are resolved through the lockfile at `next-auth` 5.0.0-beta.32, `@auth/core` 0.41.3, and `@auth/prisma-adapter` 2.11.3. The email auth provider was migrated from the deprecated Nodemailer-backed `next-auth/providers/email` implementation to the HTTP-based Resend provider while preserving the historical provider id `email`, so existing `signIn("email")` calls remain compatible. Direct `nodemailer` and `@types/nodemailer` dependencies were removed.

## Remaining production findings

The remaining production findings are isolated to dependency chains that require deliberate breaking-change work rather than a blind `npm audit fix --force`:

1. **Next.js → nested PostCSS** — npm currently proposes a Next.js 16 major upgrade to clear the nested PostCSS advisories. This must be handled as a framework migration with build and route testing.
2. **next-pwa → Workbox → rollup-plugin-terser → serialize-javascript** — npm proposes an unsafe/breaking next-pwa change. The maintained path should be evaluated separately, including whether EdUmeetup still needs the legacy PWA/Workbox layer.

A development-only `esbuild` advisory may still appear in the complete-tree audit; it is not present in the production-only audit and should be handled with the development-toolchain refresh.

## CI policy

CI runs a separate production-only audit:

```bash
npm audit --omit=dev --audit-level=high
```

The audit remains **non-blocking temporarily** because the two remaining production dependency chains require planned migrations. Lint, typecheck, and unit tests remain blocking quality gates.

The audit should become blocking once the Next.js/PostCSS and PWA/Workbox findings are resolved or explicitly replaced with a documented supported architecture.

## Remediation rules

1. Keep production critical vulnerabilities at zero.
2. Fix production high vulnerabilities before launch unless a specific, documented risk acceptance exists.
3. Prefer patched versions that stay within the existing compatible major version where possible.
4. Do not use `npm audit fix --force` on the production branch without reviewing every major-version or feature-level change it proposes.
5. Keep Prisma major upgrades separate from security patching because Prisma migrations can require schema/client/runtime changes.
6. Keep Next.js/React/Auth major upgrades separate from unrelated production hardening.
7. Re-run dependency install, Prisma generation, lint, typecheck, unit tests, and the production audit after every dependency batch.
8. Treat deprecated transitive packages as maintenance signals, not automatically as exploitable production vulnerabilities; prioritize according to the production audit and actual runtime usage.

## Runtime/tooling alignment

GitHub Actions uses current `actions/checkout` and `actions/setup-node` majors while testing the application itself on Node 20 to stay aligned with the current Netlify runtime. Framework/runtime major upgrades should be tested separately before changing that deployment baseline.
