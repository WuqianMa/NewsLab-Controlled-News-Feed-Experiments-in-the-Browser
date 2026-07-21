# NewsLab Agent Handoff

This file is the working contract for AI agents and engineers extending the NewsLab prototype. Read it before changing participant lifecycle, event delivery, database behavior, authentication, exports, or deployment.

## Product intent

NewsLab provides reusable software for controlled browser-based news-feed experiments. It does not define a research hypothesis or validate the seeded stimuli. Researchers configure conditions, content, consent, surveys, and completion routing; participants receive a feed and generate structured behavioral records.

Primary users:

- Researcher: configures and previews experiments, monitors sessions, and exports records.
- Participant: consents, browses a condition-specific feed, answers an optional survey, and reaches completion.
- Operator/data manager: deploys, backs up, resets, retains, and deletes database records.

## Stack and architecture

- Next.js 15 App Router, React 19, TypeScript, and Tailwind CSS.
- Prisma 6 with SQLite locally and PostgreSQL for Vercel/cloud deployment.
- Zod request validation.
- Signed JWT cookies for admin authentication and short-lived preview tokens.
- Browser-side event tracker with idempotent UUIDs and retry buffering.
- Optional LLM generation through deterministic demo mode, Anthropic, or OpenAI.

Key layers:

- `src/app/admin/`: researcher UI.
- `src/app/(participant)/exp/[slug]/`: participant UI.
- `src/app/api/admin/`: authenticated researcher APIs.
- `src/app/api/exp/[slug]/`: participant join, content, event, and survey APIs.
- `src/lib/`: assignment, lifecycle, tracking, validation, auth, CSV, LLM, and safety helpers.
- `prisma/seed.ts`: destructive deterministic example-data reset.
- `tests/`: focused Node test suite.

## Route map

Researcher pages:

- `/admin`: study counts and experiment overview.
- `/admin/experiments`: experiment list.
- `/admin/experiments/new`: draft creation.
- `/admin/experiments/[id]`: configuration, conditions, pages, survey, preview, duplicate, and delete.
- `/admin/content`: article library, JSON import, and ordered content sets.
- `/admin/generate`: generation templates and side-by-side review.
- `/admin/participants`: participant/session summaries and per-participant deletion.
- `/admin/export`: CSV and data-dictionary downloads.

Participant pages:

- `/exp/[slug]/welcome`: metadata, consent, and join.
- `/exp/[slug]/feed`: assigned materialized feed.
- `/exp/[slug]/article/[id]`: article detail and dwell/scroll capture.
- `/exp/[slug]/survey`: configured post-feed questions.
- `/exp/[slug]/complete`: debrief, code, or recruitment redirect.

All `/admin` and `/api/admin` routes are covered by `src/middleware.ts`, except login. Do not add an admin API outside this matcher without an equivalent authorization check.

## Data model and ownership

- `Researcher` owns experiments and approves generated items.
- `Experiment` owns conditions, content sets, and participants.
- `Condition` references one optional content set and controls feed presentation.
- `ContentItem` can be an original or a variant linked to its source and generation log.
- `ContentSetItem` is the ordered many-to-many join between sets and items.
- `Participant` stores assignment, consent version, exact feed order, pilot/preview flags, and status.
- `Session` stores timing, device metadata, status, and latest checkpoint.
- `Event` belongs to a session and uses a client-generated ID as its primary key.
- `SurveyResponse` is unique by participant and question.

Deletion behavior is intentional. Experiment deletion cascades into its conditions, sets, participants, sessions, events, and survey responses according to the Prisma relations. Participant deletion cascades into participant-owned records. Content sets linked to conditions cannot be deleted. Deletion has no undo layer.

## Participant lifecycle invariants

1. Only recruiting experiments (`pilot` or `active`) accept ordinary joins. A valid preview token may enter another state and forces a condition.
2. Returning participants are resolved first by experiment-scoped cookie, then by optional external recruitment ID.
3. A completed participant cannot join again through the normal flow.
4. New assignment and feed-order materialization occur in one transaction.
5. The stored `feedItemOrder` is the source of truth for what the participant was served. Never recompute it from a later content-set state.
6. An open session inside the resume rules is reused with its latest checkpoint; otherwise a new session is created.
7. The session deadline is anchored to server `startedAt`, not page reload time.
8. A session becomes terminal only after the idempotent `session_ended` event is accepted. Failed terminal delivery must remain retryable.
9. Preview participants are flagged and excluded from normal exports by default.
10. Consent changes after launch increment the experiment consent version, preserving the version accepted by each participant.

Relevant files: `src/lib/assignment.ts`, `src/lib/participantState.ts`, `src/lib/sessionLifecycle.ts`, `src/lib/sessionTiming.ts`, and participant API routes.

## Event contract

`src/lib/tracker.ts` is deliberately conservative. Preserve these rules:

- Every event has a client-generated UUID; retrying the same event must not duplicate it.
- `tab_id` lives in `sessionStorage` and distinguishes tabs.
- Buffers flush at 50 events, on a five-second timer, and on hidden/pagehide transitions.
- Failed batches return to the buffer and mirror into a session-scoped storage key.
- A later participant session must never inherit another session's pending events.
- Tracking failures must not throw into the participant interface.
- Event insertion and terminal/checkpoint side effects are transactional.

Current event families include session and consent events, feed load/scroll/end/refresh/abandonment, card impressions/clicks/hover/long-press/reactions, article open/close/dwell/scroll-depth/link/reactions, visibility changes, and session completion.

When adding an event, update validation if its shape needs constraints, the data dictionary/export logic when researchers need a flattened column, tests for lifecycle-sensitive behavior, and this document if the contract changes.

## Admin and public-demo rules

Admin authentication uses a seven-day HTTP-only, `SameSite=Lax` signed cookie. Production refuses weak `APP_SECRET` values.

When `PUBLIC_DEMO_MODE=true`, `src/middleware.ts` rejects authenticated admin `POST`, `PUT`, `PATCH`, and `DELETE` requests with `403 demo_read_only`. Login and logout are exceptions. Admin `GET` requests, previews, and exports remain available. Participant APIs remain writable so the participant workflow can be demonstrated.

The visible banner is informational; server enforcement is the security boundary. Any new mutating admin endpoint must stay under `/api/admin/` so the middleware guard covers it.

Never connect a public showcase to a real study database. Use a dedicated disposable database because participant joins and events intentionally remain writable.

## Database workflows

Local SQLite:

```bash
cp .env.example .env
npx prisma migrate dev
npm run db:seed
npx prisma generate
```

Cloud PostgreSQL:

```bash
DATABASE_URL="postgresql://..." npm run db:deploy:postgres
DATABASE_URL="postgresql://..." npx prisma generate --schema prisma/postgres/schema.prisma
DATABASE_URL="postgresql://..." npm run db:seed:postgres
```

The two schemas should remain model-equivalent. If a model changes:

1. Edit both `prisma/schema.prisma` and `prisma/postgres/schema.prisma`.
2. Create separate SQLite and PostgreSQL migrations in their respective migration directories.
3. Validate both schemas with matching URL protocols.
4. Test migration on disposable databases.
5. Regenerate the default SQLite client before returning to local development.
6. Update README and this file when deployment or migration behavior changes.

`prisma/seed.ts` deletes all existing rows before rebuilding the example dataset. It is a reset tool, not an additive production seed. Existing SQLite-to-PostgreSQL row transfer is not implemented.

## Environment variables

- `DATABASE_URL`: `file:./dev.db` locally or a PostgreSQL connection string in cloud deployment.
- `APP_SECRET`: signs admin and preview tokens; at least 32 non-default characters in production.
- `TRUSTED_RATE_LIMIT_PROXY`: production operator acknowledgement that shared rate limiting exists.
- `PUBLIC_DEMO_MODE`: blocks admin writes when exactly `true`.
- `ADMIN_EMAIL`, `ADMIN_PASSWORD`: values used by the destructive seed.
- `LLM_PROVIDER`: `demo`, `anthropic`, or `openai`.
- `LLM_MODEL`, `LLM_TEMPERATURE`, `LLM_MAX_TOKENS`: generation settings.
- `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`: optional provider credentials.

Do not commit `.env`, database files, backups, participant exports, or provider keys.

## Commands and verification

```bash
npm run dev
npm run typecheck
npm test
npm run build
npm run check
npm run db:backup
npx tsx scripts/check-events.ts
```

Scale verification to risk. Participant lifecycle, event idempotence, assignment, survey validation, launch readiness, exports, auth, and migrations deserve automated coverage when changed. For UI changes, verify admin desktop/mobile and participant mobile flows in a real browser. Do not run `next build` concurrently with a live `next dev` process using the same `.next` directory.

## Engineering conventions

- Reuse existing helpers and route patterns before introducing abstractions.
- Validate untrusted JSON with Zod and use Prisma rather than hand-built SQL.
- Keep preview data isolated from normal study exports.
- Preserve stable feed order, consent version, event IDs, session timing, and cascade semantics.
- Do not weaken production environment checks to make deployment pass silently.
- Do not expose raw LLM provider keys to browser code.
- Keep generation logs immutable; researcher edits belong on the output item.
- Keep participant-visible Markdown links limited to safe URL schemes.
- Treat external IDs and detailed behavior as sensitive, even though the schema is pseudonymous.
- Avoid unrelated refactors when fixing a focused prototype issue.

## Known unfinished work

- RBAC and least-privilege database/runtime accounts.
- MFA/SSO, shared lockout, and administrator session management.
- CSRF token or strict trusted-origin verification.
- Immutable admin audit log.
- Shared rate limiting and abuse monitoring.
- Scheduled encrypted backups, rotation, restore tests, and retention automation.
- Recovery window for accidental deletion.
- High-concurrency exact assignment locking.
- Automatic SQLite-to-PostgreSQL data transfer.
- Automated public-showcase reset.
- Production privacy, accessibility, threat-model, and load review for the intended study protocol.

## Handoff checklist

Before declaring work complete:

- Confirm which user and route behavior changed.
- Check both database providers if the data model changed.
- Preserve public-demo server enforcement for new admin writes.
- Add or update focused tests.
- Run typecheck, tests, and production build.
- Browser-test affected desktop and mobile paths.
- Inspect the final diff for unrelated files, secrets, database files, and generated clutter.
- Update README, this handoff, deployment notes, and data dictionary where behavior changed.
- State clearly what remains unverified or operationally incomplete.
