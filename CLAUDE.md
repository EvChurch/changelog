# Changelog App

Next.js app for collecting and routing service feedback for church teams. Deploys to Railway. Auth and teams come from **Planning Center Online (PCO)**; drivers and leaders are assigned in-app.

## Roles

- **Driver**: Elevated role. Can create feedback (goes straight to leader) and **review member-submitted feedback** (approve → leader, or reject/return).
- **Leader** (per team): Reviews feedback that has passed driver review; accepts and can add comments. Assigned per team in-app.
- **Team member**: Can **submit** feedback (tag team); sees **accepted** feedback for their team. Default view: last **90 days**; can load older.

Flow: Member submits → Driver reviews → Leader accepts → Members see accepted (90 days default, load older). Driver-created feedback skips the first step.

## Stack

- **Next.js 15** (App Router), TypeScript, Tailwind
- **Auth**: NextAuth.js with custom **PCO OAuth** provider (PCO as IdP)
- **DB**: PostgreSQL (Railway) + **Prisma 7** with `@prisma/adapter-pg`
- **Teams**: Fetched from PCO Services API; synced into app DB for stable IDs. Set `PCO_SERVICE_TYPE_ID` or pass `serviceTypeId` to `/api/teams`.

## Key paths

- **Auth**: `lib/auth.ts` (PCO provider, JWT/session), `app/api/auth/[...nextauth]/route.ts`, `middleware.ts` (protect routes)
- **DB**: `lib/db.ts` (PrismaClient with pg adapter), `prisma/schema.prisma` (User, Team, Driver, Leader, Feedback)
- **PCO**: `lib/pco.ts` (fetch teams), `lib/user.ts` (getOrCreateUserByPcoId, getOrCreateTeamByPcoId)
- **Feedback API**: `app/api/feedback/route.ts` (GET list by role/teamId/since/before, POST create), `app/api/feedback/[id]/route.ts` (GET one, PATCH driver_approve | driver_reject | leader_accept)
- **Teams API**: `app/api/teams/route.ts` (GET: PCO teams synced to DB, returned as `{ id, name }` for dropdowns)
- **Pages**: `app/login`, `app/dashboard`, `app/feedback/new`, `app/driver`, `app/driver/new`, `app/driver/feedback/[id]`, `app/leader`, `app/leader/feedback/[id]`, `app/my-feedback`

## Env

See `.env.example`: `DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `PCO_CLIENT_ID`, `PCO_CLIENT_SECRET`; optional `PCO_SERVICE_TYPE_ID`.

## Conventions

- Use Prisma for all DB access; NextAuth for auth; PCO for teams (and token in session for API calls).
- Drivers/leaders are in `Driver` / `Leader` tables; no password on User (PCO only).
- Feedback status: `pending_driver_review` | `pending_leader_review` | `accepted`. Source: `driver` | `member`.
