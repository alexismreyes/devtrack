-- Additive per-project label catalog + task assignments (012-task-labels).
-- Generate Client: `npm run prisma:generate` (TypeScript client only; no DB changes).
-- Apply this versioned migration: `npm run prisma:deploy`.
-- Do not run `prisma migrate reset` or delete Docker volumes unless authorized.
-- Do not add checklists (F) or app-wide audit (C) tables.

-- CreateTable
CREATE TABLE "project_labels" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "nameKey" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_labels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_labels" (
    "taskId" UUID NOT NULL,
    "labelId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "task_labels_pkey" PRIMARY KEY ("taskId","labelId")
);

-- CreateIndex
CREATE INDEX "project_labels_projectId_idx" ON "project_labels"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "project_labels_projectId_nameKey_key" ON "project_labels"("projectId", "nameKey");

-- CreateIndex
CREATE INDEX "task_labels_taskId_idx" ON "task_labels"("taskId");

-- CreateIndex
CREATE INDEX "task_labels_labelId_idx" ON "task_labels"("labelId");

-- AddForeignKey
ALTER TABLE "project_labels" ADD CONSTRAINT "project_labels_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_labels" ADD CONSTRAINT "task_labels_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_labels" ADD CONSTRAINT "task_labels_labelId_fkey" FOREIGN KEY ("labelId") REFERENCES "project_labels"("id") ON DELETE CASCADE ON UPDATE CASCADE;
