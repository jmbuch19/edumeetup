# Dependency Security

## Current baseline

The production-hardening CI run on 2026-09-08 installed 1,055 packages and reported **39 npm vulnerabilities** across the complete dependency tree:

- 3 low
- 13 moderate
- 20 high
- 3 critical

That aggregate `npm ci` count includes both production and development dependencies, so it is not sufficient by itself to decide which upgrades are launch-blocking.

## CI policy

CI now runs a separate production-only audit:

```bash
npm audit --omit=dev --audit-level=high
```

The audit is intentionally **non-blocking while the baseline is being established**. Lint, typecheck, and unit tests remain blocking quality gates.

Once the production-only critical/high findings are remediated, the audit should become a blocking gate.

## Remediation rules

1. Fix production critical vulnerabilities first, then production high vulnerabilities.
2. Prefer patched versions that stay within the existing compatible major version where possible.
3. Do not use `npm audit fix --force` on the production branch without reviewing the resulting major-version changes.
4. Keep Prisma major upgrades separate from security patching because Prisma major migrations can require schema/client/runtime changes.
5. Keep Next.js/React/Auth major upgrades separate from unrelated production hardening.
6. Re-run lint, typecheck, unit tests, and the production audit after every dependency batch.
7. Do not treat a reduced total vulnerability count as sufficient; the target is **zero production critical vulnerabilities** before launch, with every remaining production high finding explicitly understood and accepted or fixed.

## Known maintenance signals

The previous CI log also showed deprecated transitive packages such as old `glob`, `rimraf`, Workbox packages, and ESLint 8. These are maintenance signals, but a deprecation warning is not automatically a production security vulnerability. They should be addressed according to the production-only audit and dependency ownership rather than by forcing broad upgrades.

GitHub Actions has also moved its JavaScript action runtime forward. CI therefore uses current `actions/checkout` and `actions/setup-node` majors while continuing to test the application itself on Node 20 to stay aligned with the current Netlify runtime.
