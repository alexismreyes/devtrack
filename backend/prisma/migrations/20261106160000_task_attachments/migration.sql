-- Additive task attachments + cover pointer and attachment activity kinds (017-task-attachments).
-- Generate Client: `npm run prisma:generate` (TypeScript client only; no DB changes).
-- Apply this versioned migration: `npm run prisma:deploy`.
-- Do not run `prisma migrate reset` or delete Docker volumes unless authorized.
-- Do not add app-wide audit (C) tables or attachment soft-delete.

-- AlterEnum (additive values only)
ALTER TYPE "TaskActivityKind" ADD VALUE 'ATTACHMENT_ADDED';
ALTER TYPE "TaskActivityKind" ADD VALUE 'ATTACHMENT_REMOVED';
ALTER TYPE "TaskActivityKind" ADD VALUE 'COVER_CHANGED';

-- CreateTable
CREATE TABLE "task_attachments" (
    "id" UUID NOT NULL,
    "taskId" UUID NOT NULL,
    "uploadedByUserId" UUID NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "task_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "task_attachments_storageKey_key" ON "task_attachments"("storageKey");

-- CreateIndex
CREATE INDEX "task_attachments_taskId_idx" ON "task_attachments"("taskId");

-- CreateIndex
CREATE INDEX "task_attachments_taskId_createdAt_idx" ON "task_attachments"("taskId", "createdAt");

-- AddForeignKey
ALTER TABLE "task_attachments" ADD CONSTRAINT "task_attachments_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_attachments" ADD CONSTRAINT "task_attachments_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN "coverAttachmentId" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "tasks_coverAttachmentId_key" ON "tasks"("coverAttachmentId");

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_coverAttachmentId_fkey" FOREIGN KEY ("coverAttachmentId") REFERENCES "task_attachments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
