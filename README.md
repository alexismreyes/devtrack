# DevTrack

Local foundation stack: React frontend, Express backend, PostgreSQL. Production image hardening is not in scope.

## Configuration

Copy `.env.example` to `.env` and replace placeholders. Do not commit `.env`.

The Compose `backend` service builds `DATABASE_URL` with hostname `db`. The Compose `frontend` service receives only `VITE_API_URL`.

## Start the stack

```bash
docker compose up --build
```

Services: `frontend` (http://localhost:5173), `backend` (http://localhost:3000), `db` (PostgreSQL 16).

Stop without deleting the named volume:

```bash
docker compose stop
```

Do not run `docker compose down -v` or `prisma migrate reset` unless explicitly authorized.

## Prisma (backend)

From `backend/`:

```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:deploy
```

Compose `backend` runs generate and `prisma migrate deploy` on startup. That does not replace versioned files under `backend/prisma/migrations/`.

## Checks

Use Node.js 22 LTS.

Backend:

```bash
cd backend
npm run typecheck
npm test
```

Frontend:

```bash
cd frontend
npm run typecheck
npm test
```
