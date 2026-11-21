# DevTrack

**Early-stage but functional** project and task manager — a Trello-like alternative for individuals and small teams.

DevTrack is an educational full-stack app built with **Spec-Driven Development (SDD)**, **Domain-Driven Design (DDD)**, and a **layered modular monolith**. Core workflows (projects, Kanban boards, tasks, members, labels, checklists, attachments) are working end-to-end. It is not a production SaaS yet: no email-based password recovery, no public hosting hardening, and several collaboration extras are still on the backlog.

![Projects grid with cover images](docs/screenshots/Projects.png)

## Screenshots

### Kanban board

Custom statuses, labels, priorities, due dates, card covers, and drag-and-drop (columns + within-column rank).

![Kanban board for Software Development Projects](docs/screenshots/kanban.png)

### Task detail

Cover hero, labels, status/priority, attachments, comments, and activity in one dialog.

![Task detail dialog with cover, labels, and activity](docs/screenshots/taskcard.png)

## What works today

| Area | Capabilities |
| --- | --- |
| **Auth** | Register, login, logout; HTTP-only session cookie; Argon2id passwords; authenticated **password change** on Profile |
| **Projects** | Create / edit / archive; image covers; board background image; card grid + sidebar (incl. archived) |
| **Kanban** | Custom status columns; drag reorder columns and cards; filters (status, priority, label) |
| **Tasks** | Title, description, priority, due date; soft-delete; cover + file attachments |
| **Collaboration** | Project members (`OWNER` / `EDITOR` / `VIEWER`); add existing users by email (no invite mail) |
| **Task depth** | Labels, checklists, comments, activity feed (windowed), attachments |
| **Dashboard** | Membership-scoped KPIs and charts (projects, open tasks, due soon, progress) |
| **UI** | React workspace, theme palettes (localStorage), confirm dialogs |

Full verified catalog (features `001`–`040`): [`implemented-features.md`](implemented-features.md).

## Not implemented yet

Honest gaps for anyone evaluating the repo:

- **No password recovery / reset by email** — login cannot recover a forgotten password; only signed-in users can change password from Profile
- **No SMTP invites or digests** — members are added only if the account already exists
- **No global search, in-app notifications, or calendar view**
- **No AI assistants, public share links, or rate-limit / lockout**
- **No restore** for soft-deleted tasks; **no app-wide audit log** (task activity is card-scoped only)
- Production image hardening, CI deploy, and managed hosting are out of scope for this stage

Later ideas live in [`proposed-features.md`](proposed-features.md) — they are **not** specs and are not shipped.

## How it was built

| Practice | In this repo |
| --- | --- |
| **SDD** | Spec → plan → tasks → explicit approval → implement → independent review → Verified (`specs/`) |
| **DDD** | Bounded contexts: `system`, `auth`, `users`, `projects`, `tasks`, `project-members`; domain rules own behavior |
| **Layered architecture** | HTTP/Zod boundaries → application use-cases → domain → Prisma repositories (ports/adapters) |
| **Modular monolith** | One deployable backend; no microservices; cross-domain calls via narrow ports |
| **Security baseline** | Cookie sessions (not tokens in JS); backend authorization; Zod validation; no secrets in errors |

Governing docs: [`constitution.md`](constitution.md), [`AGENTS.md`](AGENTS.md), [`prompt.md`](prompt.md).

## Stack

| Layer | Choice |
| --- | --- |
| Frontend | React 19, TypeScript, Vite, React Router 7, Tailwind CSS 4, shadcn/ui, `@dnd-kit`, Recharts |
| Backend | Node.js 22 LTS, Express, TypeScript, Zod, Argon2id |
| Data | PostgreSQL 16, Prisma 6 |
| Runtime | Docker Compose (`frontend`, `backend`, `db`) |

## Getting started (first run)

### Prerequisites

- [Git](https://git-scm.com/)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (or Docker Engine + Compose v2) running
- Optional (host tests / Prisma CLI only): [Node.js 22 LTS](https://nodejs.org/)

You do **not** need Node installed to run the app via Compose.

### 1. Clone the repo

```bash
git clone https://github.com/alexismreyes/devtrack.git
cd devtrack
```


### 2. Create your `.env`

```bash
cp .env.example .env
```

On Windows (PowerShell):

```powershell
Copy-Item .env.example .env
```

Edit `.env` and replace every `replace-me` with local values. **Do not commit `.env`.**

Example for a local Compose stack:

```env
# PostgreSQL (Compose service `db`)
POSTGRES_USER=devtrack
POSTGRES_PASSWORD=devtrack-local-pass
POSTGRES_DB=devtrack-db
POSTGRES_PORT=5432

# Backend (used when running API/tests on the host).
# Compose `backend` ignores this URL and builds one with hostname `db` from POSTGRES_*.
DATABASE_URL=postgresql://devtrack:devtrack-local-pass@localhost:5432/devtrack-db
CORS_ORIGIN=http://localhost:5173
PORT=3000
ATTACHMENTS_ROOT=./data/attachments

# Frontend — browser-reachable backend origin only (never DATABASE_URL or `db`)
VITE_API_URL=http://localhost:3000
```

| Variable | Who uses it | Notes |
| --- | --- | --- |
| `POSTGRES_USER` / `PASSWORD` / `DB` | Compose `db` + `backend` | Must match across Postgres and the Compose-built `DATABASE_URL` |
| `POSTGRES_PORT` | Host → container map | Default `5432`; change if that port is taken |
| `DATABASE_URL` | Host-run backend / tests | Points at `localhost`; Compose uses `db` instead |
| `CORS_ORIGIN` | Backend | Must match the frontend origin (`http://localhost:5173`) |
| `PORT` | Backend | Published API port (default `3000`) |
| `ATTACHMENTS_ROOT` | Host-run backend | Compose mounts a named volume at `/data/attachments` instead |
| `VITE_API_URL` | Frontend | Only API env the browser needs |

### 3. Start Docker Compose

From the repo root (where `docker-compose.yml` and `.env` live):

```bash
docker compose up --build
```

First boot builds images, starts Postgres, runs `prisma generate` + `prisma migrate deploy`, then serves the API and Vite app. Wait until `db` is healthy and `backend` / `frontend` are up.

| Service | URL |
| --- | --- |
| Frontend | http://localhost:5173 |
| Backend | http://localhost:3000 |
| Database | `localhost:${POSTGRES_PORT}` (Compose hostname inside the network: `db`) |

### 4. Create your first account

1. Open http://localhost:5173 — guests land on **Login**.
2. Use **Register** to create a user (email + password; min 8 characters).
3. Sign in — you land on **Projects**.
4. Create a project, open the board, add tasks.


### 5. Stop / reset

Stop containers **without** deleting the Postgres volume:

```bash
docker compose stop
```

Start again later:

```bash
docker compose up
```

Destroy containers **and** local DB data (destructive):

```bash
docker compose down -v
```

Do **not** run `docker compose down -v` or `prisma migrate reset` unless you intend to wipe local data.

### Optional: checks on the host (Node.js 22)

```bash
cd backend
npm ci
npm run typecheck
npm test

cd ../frontend
npm ci
npm run typecheck
npm test
```

Host tests need a reachable `DATABASE_URL` (often the published Postgres from Compose).

### Optional: Prisma CLI on the host

Compose already runs generate + `migrate deploy` on `backend` startup. For local migration authoring:

```bash
cd backend
npm run prisma:generate
npm run prisma:migrate
npm run prisma:deploy
```

Versioned SQL stays under `backend/prisma/migrations/`.

## Status

DevTrack is a **learning-oriented** Trello-style workspace: the core loop is usable for personal boards and small-team demos, while recovery, email, and several power features remain intentionally unfinished. Contributions and follow-up specs should go through the SDD workflow, not ad-hoc patches to production assumptions.
