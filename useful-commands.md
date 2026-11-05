# DevTrack — useful commands

Cheat sheet for local work. Run Compose commands from the **repo root**. Prefer **Node 22** (`nvm use 22`) for host npm/tests — Compose images already use Node 22.

Do **not** run `docker compose down -v` or `prisma migrate reset` unless you explicitly authorize data loss.

---

## Docker Compose

### Start / stop

```bash
# Build images and start frontend + backend + db (foreground)
docker compose up --build

# Same, detached
docker compose up --build -d

# Stop containers; keep the Postgres volume (data stays)
docker compose stop

# Stop and remove containers/networks; keep named volume pgdata
docker compose down

# DANGER: also deletes the Postgres volume (all DB data gone)
# docker compose down -v
```

### Rebuild after adding npm dependencies

Compose mounts `src` into the containers, but **`node_modules` lives inside the image** (from `npm ci` at build time). Editing `package.json` / `package-lock.json` on the host is not enough — rebuild the service image.

```bash
# Frontend: new UI package (e.g. @radix-ui/react-popover)
docker compose build --no-cache frontend
docker compose up -d frontend

# Backend: new server package
docker compose build --no-cache backend
docker compose up -d backend

# Both
docker compose build --no-cache frontend backend
docker compose up -d frontend backend
```

`--no-cache` forces a fresh `npm ci` layer so the lockfile changes are not skipped by Docker layer cache.

### Logs and shell

```bash
docker compose logs -f frontend
docker compose logs -f backend
docker compose logs -f db

docker compose exec backend sh
docker compose exec frontend sh
docker compose exec db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
```

(Use the user/db from your `.env`; defaults are whatever you set in `.env.example`.)

---

## Node version (host)

```bash
nvm use 22
node -v   # expect v22.x

# If PATH still shows Node 24 after nvm use (common with other tools on PATH),
# put the nvm Node 22 directory first, or call npm via that Node explicitly.
```

---

## Frontend (host, from `frontend/`)

```bash
cd frontend
nvm use 22

npm install          # after changing package.json / lockfile on the host
npm run dev          # Vite (if not using Compose frontend)
npm run typecheck
npm test             # vitest run
npm test -- --run src/tasks/TaskDetail.test.tsx   # targeted
```

Remember: if you use **Compose** for the UI, still **rebuild the frontend image** after `npm install` so the container gets the new packages.

---

## Backend (host, from `backend/`)

```bash
cd backend
nvm use 22

npm install
npm run typecheck
npm test
npm run prisma:generate   # regenerate Prisma Client after schema changes
npm run prisma:deploy     # apply existing migrations (safe for shared DB)
npm run prisma:migrate    # create + apply a new migration in local/dev (asks for name)
```

Compose `backend` already runs `prisma generate` + `prisma migrate deploy` on container start. That does **not** create new migration files — you still add those under `backend/prisma/migrations/` via `prisma:migrate` (or by hand) when the schema changes.

### Prisma notes

| Command | Use when |
| --- | --- |
| `npm run prisma:generate` | Schema changed; Client types need refresh |
| `npm run prisma:deploy` | Apply committed migrations (Compose / shared envs) |
| `npm run prisma:migrate` | Local: create a new versioned migration from schema drift |
| `npx prisma migrate reset` | **Destructive** — wipe DB and reapply; only with explicit auth |

---

## Quick verification (Node 22)

```bash
# Backend
cd backend && nvm use 22 && npm run typecheck && npm test

# Frontend
cd frontend && nvm use 22 && npm run typecheck && npm test
```

---

## Postman

Import `postman/DevTrack.postman_collection.json`.

1. Set `baseUrl` (default `http://localhost:3000`).
2. Enable cookies / cookie jar.
3. Run **auth → Register** or **Login** (session cookie `devtrack_session`).
4. Create project → task → labels / comments / activity as needed.  
   Create responses can fill `projectId`, `taskId`, `labelId`, `commentId`.

---

## Git (common)

```bash
git status
git diff
git log -5 --oneline

# Stage and commit only when you intend to (message via your usual flow)
git add -A
git commit -m "Your message"
```

---

## Mental model

| Change | What to do |
| --- | --- |
| Edit React/TS under `frontend/src` | Hot reload via Compose volume — usually no rebuild |
| Edit Express/TS under `backend/src` | Hot reload via Compose volume — usually no rebuild |
| Add/change **npm dependency** | Update lockfile on host + `docker compose build --no-cache <service>` |
| Add Prisma migration | Commit migration files; restart backend or `prisma:deploy` so they apply |
| Need a clean DB | Ask first — never `down -v` / `migrate reset` casually |
