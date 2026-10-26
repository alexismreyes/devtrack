# DevTrack backend

Express + TypeScript API for the `system` foundation slice. Runtime is Node.js 22 LTS. Prisma schema and migrations live in `prisma/`.

## Commands

```bash
npm install
npm run typecheck
npm test
npm run dev
```

## Prisma: generate vs migrate vs deploy

These are different steps. Container start is not a migrated database.

1. **Generate Client** — `npm run prisma:generate`  
   Builds the TypeScript Prisma Client from `prisma/schema.prisma`. It does not change PostgreSQL.

2. **Development migrate** — `npm run prisma:migrate`  
   `prisma migrate dev` creates a new versioned migration from schema changes and applies it to the development database. Use this when changing the schema locally.

3. **Deploy migrations** — `npm run prisma:deploy`  
   `prisma migrate deploy` applies already versioned files in `prisma/migrations/`. Use this in shared or deployed environments.

Do not run `prisma migrate reset` or delete Docker volumes unless explicitly authorized.

## Local database

From the repository root, copy `.env.example` to `.env` (placeholders only until you replace them), then:

```bash
docker compose up -d db
```

Host-run API and tests use `DATABASE_URL` with `localhost`. The Compose `backend` service uses hostname `db`, waits on the `db` healthcheck, and runs `prisma generate` plus `prisma migrate deploy` before the API.

From the repository root:

```bash
docker compose up --build
```

`frontend` is published on port 5173. `backend` is published on `PORT` (default 3000). The browser calls the backend at `VITE_API_URL`.
