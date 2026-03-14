# Changelog App

Next.js app for collecting and routing service feedback for church teams. Deploys to Railway. Auth and teams come from **Planning Center Online (PCO)**; drivers and leaders are assigned in-app.

## Roles

- **Driver**: Elevated role. Can create feedback (goes straight to leader) and **review member-submitted feedback** (approve → leader, or reject/return).
- **Leader** (per team): Reviews feedback that has passed driver review; accepts and can add comments. Assigned per team in-app.
- **Team member**: Can **submit** feedback (tag team); sees **accepted** feedback for their team. Default view: last **90 days**; can load older.

Flow: Member submits → Driver reviews → Leader accepts → Members see accepted (90 days default, load older). Driver-created feedback skips the first step.

## Stack

- **Next.js 15** (App Router), TypeScript, Tailwind
- **Auth**: NextAuth.js with custom **PCO OAuth** – sign-in only (identifies user; no user token used for API calls).
- **PCO API credentials**: All PCO API calls use `PCO_API_ID` + `PCO_API_SECRET` (env) as HTTP Basic Auth in `lib/pco.ts`. OAuth is identity only; visibility from cached data (DB: drivers, leaders, teams, team members, feedback).
- **DB**: PostgreSQL (Railway) + **Prisma 7** with `@prisma/adapter-pg`
- **Teams**: Fetched from PCO Services API (API key). Sync: service types → teams → leaders + members. Optional `PCO_SERVICE_TYPE_ID` for /api/teams filter.

## Key paths

- **Auth**: `lib/auth.ts` (PCO provider, JWT/session), `app/api/auth/[...nextauth]/route.ts`, `middleware.ts` (protect routes)
- **DB**: `lib/db.ts` (PrismaClient with pg adapter), `prisma/schema.prisma` (User, ServiceType, Team, TeamMember, Driver, Leader, Feedback)
- **PCO**: `lib/pco.ts` (fetchServiceTypes, fetchTeams, fetchTeamLeaders, fetchTeamMemberPersonIds, fetchPerson; API key as Bearer), `lib/user.ts` (getOrCreateUserByPcoId, getOrCreateServiceTypeByPcoId, getOrCreateTeamByPcoId)
- **Feedback API**: `app/api/feedback/route.ts` (GET list by role/teamId/since/before, POST create), `app/api/feedback/[id]/route.ts` (GET one, PATCH driver_approve | driver_reject | leader_accept)
- **Teams API**: `app/api/teams/route.ts` (GET: PCO teams synced to DB, returned as `{ id, name }` for dropdowns)
- **Jobs**: `lib/pg-boss.ts` (getBoss), `lib/jobs/` (queues + handlers; worker runs `npm run worker`)
- **Pages**: `app/login`, `app/dashboard`, `app/feedback/new`, `app/driver`, `app/driver/new`, `app/driver/feedback/[id]`, `app/leader`, `app/leader/feedback/[id]`, `app/my-feedback`

## Env

See `.env.example`: `DATABASE_URL`, `NEXTAUTH_*`, `PCO_CLIENT_ID`, `PCO_CLIENT_SECRET`, `PCO_API_ID`, `PCO_API_SECRET` (required for PCO API; HTTP Basic Auth; OAuth not used for API), optional `PCO_SERVICE_TYPE_ID`. **Jobs**: PCO sync (all service types → teams → leaders + members) is a pg-boss job; Railway worker (`npm run worker`) runs it every 15 min.

## Conventions

- Use Prisma for all DB access; NextAuth for auth (identity only). PCO API: `PCO_API_ID` + `PCO_API_SECRET` (Basic Auth); visibility from cached DB data.
- Drivers/leaders are in `Driver` / `Leader` tables; no password on User (PCO only).
- Feedback status: `pending_driver_review` | `pending_leader_review` | `accepted`. Source: `driver` | `member`.
