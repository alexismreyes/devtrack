-- Expand: ProjectStatus catalog + Task.status as stable string key (not enum, not FK).
-- Backfill seeded TODO / IN_PROGRESS / DONE per project; preserve existing task status text.
-- Constrain: drop Postgres TaskStatus enum when unused.

-- 1) Create catalog table
CREATE TABLE "project_statuses" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameKey" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "isSystem" BOOLEAN NOT NULL,
    "isCompleted" BOOLEAN NOT NULL,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_statuses_pkey" PRIMARY KEY ("id")
);

-- 2) Convert tasks.status enum → text (preserve TODO / IN_PROGRESS / DONE values)
ALTER TABLE "tasks" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "tasks" ALTER COLUMN "status" TYPE TEXT USING ("status"::text);
ALTER TABLE "tasks" ALTER COLUMN "status" SET DEFAULT 'TODO';

-- 3) Drop unused enum type
DROP TYPE "TaskStatus";

-- 4) Backfill three seeded statuses for every existing project
INSERT INTO "project_statuses" ("id", "projectId", "key", "name", "nameKey", "color", "isSystem", "isCompleted", "position", "createdAt")
SELECT gen_random_uuid(), p."id", 'TODO', 'To do', 'to do', 'GRAY', true, false, 0, CURRENT_TIMESTAMP
FROM "projects" p;

INSERT INTO "project_statuses" ("id", "projectId", "key", "name", "nameKey", "color", "isSystem", "isCompleted", "position", "createdAt")
SELECT gen_random_uuid(), p."id", 'IN_PROGRESS', 'In progress', 'in progress', 'BLUE', true, false, 1, CURRENT_TIMESTAMP
FROM "projects" p;

INSERT INTO "project_statuses" ("id", "projectId", "key", "name", "nameKey", "color", "isSystem", "isCompleted", "position", "createdAt")
SELECT gen_random_uuid(), p."id", 'DONE', 'Done', 'done', 'GREEN', true, true, 2, CURRENT_TIMESTAMP
FROM "projects" p;

-- 5) Constraints and indexes
CREATE UNIQUE INDEX "project_statuses_projectId_key_key" ON "project_statuses"("projectId", "key");
CREATE UNIQUE INDEX "project_statuses_projectId_nameKey_key" ON "project_statuses"("projectId", "nameKey");
CREATE UNIQUE INDEX "project_statuses_projectId_position_key" ON "project_statuses"("projectId", "position");
CREATE INDEX "project_statuses_projectId_idx" ON "project_statuses"("projectId");
CREATE INDEX "project_statuses_projectId_position_idx" ON "project_statuses"("projectId", "position");

ALTER TABLE "project_statuses" ADD CONSTRAINT "project_statuses_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
