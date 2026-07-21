# Deployment guide

NewsLab has two supported database definitions:

- Local development: `prisma/schema.prisma` with SQLite.
- Vercel/cloud: `prisma/postgres/schema.prisma` with PostgreSQL.

The models are equivalent, but their migration SQL is intentionally separate. Do not run SQLite migrations against PostgreSQL or edit the local schema provider as a deployment shortcut.

## Vercel showcase

1. Import the repository into Vercel and choose `newslab` as the root directory.
2. Attach a managed PostgreSQL database and expose its pooled runtime URL as `DATABASE_URL`.
3. Set a strong `APP_SECRET`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD`.
4. Set `PUBLIC_DEMO_MODE=true` to block every authenticated admin mutation except login/logout.
5. Configure external shared rate limiting, then set `TRUSTED_RATE_LIMIT_PROXY=true`.
6. Leave `LLM_PROVIDER=demo` unless a protected researcher deployment needs a real provider.
7. Deploy. The `vercel-build` script generates the PostgreSQL client, applies PostgreSQL migrations, and runs the Next.js build.
8. Seed a fresh, disposable showcase database once using the commands in the main README.

Admin read-only mode does not block participant joins, events, or surveys. A public showcase must use its own disposable database and must never share a real study database.

## What deployment does not do

- It does not copy rows from local SQLite into PostgreSQL.
- It does not seed automatically on each deploy because seeding deletes all rows.
- It does not restore deleted PostgreSQL rows during redeploy.
- It does not configure Vercel Firewall, Redis, backups, retention, MFA, SSO, or database grants.
- It does not make the prototype ready for sensitive research records by itself.

## Existing SQLite data

The PostgreSQL migration is a schema migration, not a data immigration tool. For valuable pilot data, first freeze writes and make a verified SQLite backup. Build and test an explicit row-by-row transfer that preserves IDs, timestamps, JSON, foreign-key order, and `BigInt` event timestamps. Compare table counts and sampled records before switching traffic. No such transfer script is currently included.

## Operational checklist for a real study

- Separate preview, staging, and production databases.
- Separate migration-owner and least-privilege runtime database accounts.
- HTTPS and HSTS end to end.
- Shared rate limiting for login, join, event, and survey endpoints.
- MFA/SSO and application RBAC.
- CSRF or strict Origin enforcement for admin mutations.
- Immutable audit records for configuration and deletion actions.
- Encrypted scheduled backups, rotation, and tested restoration.
- Documented retention, deletion, incident-response, and researcher offboarding procedures.
- Institution-approved consent, debrief, privacy, accessibility, and data-management plans.
- Load and concurrency testing sized to recruitment volume.

The production application rejects a weak `APP_SECRET` and requires `TRUSTED_RATE_LIMIT_PROXY=true`, but those checks are acknowledgements, not proof that the surrounding infrastructure is configured correctly.
