-- Additive Task.position for within-column rank (031 / proposed H).
-- Generate Client: `npm run prisma:generate`.
-- Apply: `npm run prisma:deploy` (authorized migrate deploy only; no reset / volume delete).
-- Soft-delete strategy: live rows densify to 0..n-1; uniqueness is a partial unique index
-- WHERE "deletedAt" IS NULL so soft-deleted positions do not collide with live order.

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN "position" INTEGER NOT NULL DEFAULT 0;

-- Backfill live tasks preserving prior visual order (createdAt DESC, id ASC) per (projectId, status).
WITH ranked AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "projectId", "status"
      ORDER BY "createdAt" DESC, "id" ASC
    ) - 1 AS "pos"
  FROM "tasks"
  WHERE "deletedAt" IS NULL
)
UPDATE "tasks" AS t
SET "position" = ranked."pos"
FROM ranked
WHERE t."id" = ranked."id";

-- Soft-deleted rows keep DEFAULT 0; excluded from live unique index below.

-- CreateIndex
CREATE INDEX "tasks_projectId_status_position_idx" ON "tasks"("projectId", "status", "position");

-- Live uniqueness (Prisma cannot express partial unique in schema; enforced in SQL).
CREATE UNIQUE INDEX "tasks_projectId_status_position_live_uidx"
ON "tasks"("projectId", "status", "position")
WHERE "deletedAt" IS NULL;
