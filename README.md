# NewsLab

NewsLab is a configurable prototype for running controlled news-feed experiments in a web browser. Researchers define the study design; the platform provides the experiment editor, participant experience, behavioral event capture, review workflow, and structured exports.

[![Watch the NewsLab Build Week pitch](https://img.youtube.com/vi/pGXqZRa1eiw/maxresdefault.jpg)](https://youtu.be/pGXqZRa1eiw)

**[▶ Watch the 62-second subtitled Build Week pitch](https://youtu.be/pGXqZRa1eiw)**
The demonstration explains the software's functions. It does not claim that the included example content, conditions, or measurements are valid for a particular research question. Those decisions remain with the research team and its ethics review process.

## How Codex & GPT-5.6 were used

NewsLab was built primarily through an AI-agent workflow.

I initiated the project with a research question inspired by Hugo Mercier’s work: **are people really as easy to fool as public discussions about misinformation often assume?**

From there, different AI systems contributed at different stages.

### Claude Fable: building the foundation

Claude Fable created the initial foundation of the project. It produced the first working version of the application, including the basic project structure, interface, and core researcher and participant flows.

This initial version established the direction of NewsLab, but it was not the final implementation. Several parts still needed to be corrected, connected, hardened, or completed.

### Codex: correcting and completing the implementation

Codex became the primary implementation agent after the initial foundation was created.

It inspected the existing repository, identified incomplete or inconsistent behavior, corrected earlier implementation problems, and completed the remaining development work.

Codex was used to:

- Understand and modify an existing multi-file codebase.
- Correct issues in the initial implementation.
- Complete researcher and participant workflows.
- Connect the interface, database, APIs, tracking, exports, and deployment logic.
- Debug type errors, build failures, state-management problems, and edge cases.
- Add or refine validation, tests, documentation, and deployment configuration.
- Review the repository as a whole rather than generating isolated code snippets.

Most of the final code implementation was therefore completed by Codex on top of the foundation created by Claude Fable.






## What researchers can do

- Create experiments with draft, pilot, active, stopped, and archived states.
- Configure weighted conditions and balanced, random, or sequential assignment.
- Choose vertical, grid, or full-screen feeds; fixed, shuffled, or reverse-chronological order; item limits; time limits; and visible interface controls.
- Write or JSON-import content, organize it into ordered sets, and attach a set to each condition.
- Generate optional content variants with a demo, Anthropic, or OpenAI provider, then compare, edit, approve, or discard each result.
- Edit consent, completion, recruitment redirect, and post-feed survey pages.
- Preview a specific condition without mixing preview activity into normal exports.
- Monitor participants, sessions, completion status, and recorded event types.
- Export participant, event, participant-by-item, and survey CSV files with a data dictionary.
- Delete one participant's associated sessions, events, and survey answers when required.

## How a study runs

1. A researcher creates an experiment, conditions, content sets, participant pages, and an optional survey.
2. The launch-readiness check prevents activation when required pages, completion routing, positive condition weights, or usable content are missing.
3. A participant opens `/exp/<slug>/welcome`, reviews the configured consent text, and enters the study.
4. NewsLab assigns a condition and stores that participant's exact feed order.
5. The participant browses the configured feed, opens articles, uses reactions, and continues to the survey or completion page.
6. The client batches idempotent events and records impressions, scrolling, clicks, dwell time, reactions, visibility changes, checkpoints, and completion.
7. The researcher reviews session summaries and downloads tidy research files for analysis outside NewsLab.

## Run locally

Requirements: Node.js 20 or newer. Local development uses SQLite and needs no Docker, database server, or LLM key.

```bash
cp .env.example .env
npm install
npx prisma migrate dev
npm run db:seed
npm run dev
```

Open:

- Researcher dashboard: [http://localhost:3000/admin](http://localhost:3000/admin)
- Participant example: [http://localhost:3000/exp/demo-misinformation/welcome](http://localhost:3000/exp/demo-misinformation/welcome)
- Seeded login: `admin@newslab.local` / `admin123`

Use a private browser window for a clean participant session. Change the seeded password before exposing the application to anyone else.

`npm run db:seed` is destructive: it deletes all rows in the selected database before recreating the example study. For local SQLite, run `npm run db:backup` first when existing records matter.

## Main participant records

NewsLab stores pseudonymous participant and session identifiers, optional recruitment IDs, condition assignment, consent version, materialized feed order, survey answers, user agent, screen size, timestamps, and detailed interaction events. It does not request participant names or email addresses and does not intentionally store IP addresses in the application database.

Pseudonymous does not mean anonymous. Detailed behavior, timestamps, device information, and recruitment identifiers can become identifying when combined. Treat both the database and exports as sensitive research data.

## Public showcase on Vercel

Vercel functions cannot use a repository SQLite file as persistent application storage. NewsLab therefore keeps two explicit Prisma paths:

- `prisma/schema.prisma` and `prisma/migrations/`: local SQLite.
- `prisma/postgres/schema.prisma` and `prisma/postgres/migrations/`: Vercel-compatible PostgreSQL.

For a showcase deployment:

1. Import the repository into Vercel and set the project root directory to `newslab`.
2. Add a PostgreSQL integration such as Neon, Supabase, or Prisma Postgres and expose its connection string as `DATABASE_URL`.
3. Add the environment variables below. Use unique, strong values.

```env
APP_SECRET="at-least-32-random-characters"
ADMIN_EMAIL="your-admin-email@example.org"
ADMIN_PASSWORD="a-unique-strong-password"
PUBLIC_DEMO_MODE="true"
LLM_PROVIDER="demo"
TRUSTED_RATE_LIMIT_PROXY="true"
```

4. Configure a shared edge or database-backed rate limiter before setting `TRUSTED_RATE_LIMIT_PROXY=true`. The production guard treats that value as an operator acknowledgement; it cannot verify the external limiter for you.
5. Deploy. Vercel automatically runs `npm run vercel-build`, which generates the PostgreSQL Prisma client, applies committed PostgreSQL migrations, and builds the app.
6. Seed a dedicated showcase database once from a trusted machine:

```bash
DATABASE_URL="postgresql://..." npx prisma generate --schema prisma/postgres/schema.prisma
DATABASE_URL="postgresql://..." npm run db:seed:postgres
npx prisma generate
```

The final `prisma generate` restores the local SQLite client after seeding. Seeding removes all existing rows, so never point it at a database containing records you need.

### What happens when someone clicks Delete on Vercel?

Deleting a deployed row does **not** modify the GitHub repository or `prisma/seed.ts`. GitHub contains the recipe for example data; PostgreSQL contains a mutable copy created from that recipe.

Without protection, a successful Delete request permanently removes rows from the deployed PostgreSQL database, and redeploying does not restore them. With `PUBLIC_DEMO_MODE=true`, authenticated admin `POST`, `PUT`, `PATCH`, and `DELETE` requests are rejected server-side, while login, logout, read-only browsing, preview links, and exports remain available.

Participant endpoints remain writable so visitors can demonstrate the study flow. Use a disposable showcase database and reset it intentionally with `npm run db:seed:postgres` when needed. Never connect a public showcase to a real study database.

## Current status

Already implemented:

- Authenticated admin routes and signed, HTTP-only admin sessions.
- Zod validation for API inputs and Prisma parameterized database access.
- Idempotent participant event IDs, transactional ingestion, retry buffering, stable session deadlines, checkpoints, and resume behavior.
- Launch-readiness validation, consent versioning, preview separation, cascade deletion, and tidy exports.
- Production checks for strong application secrets and acknowledged shared rate limiting.
- Server-enforced read-only admin mode for public demonstrations.
- Local SQLite migrations plus a separate PostgreSQL migration path for Vercel.
- Focused automated tests and a production build check.

Not yet complete for a real public study:

- No role-based permissions for viewer, researcher, data manager, and administrator responsibilities.
- No MFA, SSO, shared account lockout, session-management screen, or enterprise identity integration.
- No CSRF token or strict trusted-origin check in addition to `SameSite=Lax` cookies.
- No immutable audit log for configuration changes and destructive actions.
- Built-in rate limiting is process-local; a shared limiter must be operated externally.
- Local SQLite backups are manual, unencrypted, unrotated, and not automatically restore-tested.
- No application-managed encryption at rest; production depends on the database and hosting provider.
- Participant deletion is immediate and has no recycle bin or recovery window.
- Exact balanced assignment can drift under highly concurrent joins.
- Moving existing rows from a local SQLite database into PostgreSQL is not automated. The new PostgreSQL migration creates a fresh database schema; it does not import old pilot data.
- No automatic retention schedule, periodic showcase reset, or documented operational incident process.

The practical assessment is: suitable for example data, controlled local development, and a disposable read-only showcase; not yet sufficient for a public study containing valuable or sensitive participant records without the controls above and institutional review.

## Verification and maintenance

```bash
npm run typecheck
npm test
npm run build
npm run check
npm run db:backup
npx tsx scripts/check-events.ts
```

For implementation details, invariants, routes, environment variables, and the handoff checklist, see [readme-to-agent.md](readme-to-agent.md). Deployment operations are expanded in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

Supporting design material lives in the repository-level `description/`, `fable/`, `tasks/`, and `sol/` folders.
