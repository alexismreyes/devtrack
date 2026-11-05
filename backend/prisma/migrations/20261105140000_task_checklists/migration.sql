-- Additive task checklists + items and checklist activity kinds (015-task-checklists).
-- Generate Client: `npm run prisma:generate` (TypeScript client only; no DB changes).
-- Apply this versioned migration: `npm run prisma:deploy`.
-- Do not run `prisma migrate reset` or delete Docker volumes unless authorized.
-- Do not add attachments (G) or app-wide audit (C) tables.

-- AlterEnum (additive values only)
ALTER TYPE "TaskActivityKind" ADD VALUE 'CHECKLIST_ADDED';
ALTER TYPE "TaskActivityKind" ADD VALUE 'CHECKLIST_REMOVED';
ALTER TYPE "TaskActivityKind" ADD VALUE 'CHECKLIST_ITEM_COMPLETED';
ALTER TYPE "TaskActivityKind" ADD VALUE 'CHECKLIST_ITEM_UNCOMPLETED';

-- CreateTable
CREATE TABLE "task_checklists" (
    "id" UUID NOT NULL,
    "taskId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "task_checklists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_checklist_items" (
    "id" UUID NOT NULL,
    "checklistId" UUID NOT NULL,
    "text" TEXT NOT NULL,
    "checked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "task_checklist_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "task_checklists_taskId_idx" ON "task_checklists"("taskId");

-- CreateIndex
CREATE INDEX "task_checklist_items_checklistId_idx" ON "task_checklist_items"("checklistId");

-- AddForeignKey
ALTER TABLE "task_checklists" ADD CONSTRAINT "task_checklists_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_checklist_items" ADD CONSTRAINT "task_checklist_items_checklistId_fkey" FOREIGN KEY ("checklistId") REFERENCES "task_checklists"("id") ON DELETE CASCADE ON UPDATE CASCADE;
