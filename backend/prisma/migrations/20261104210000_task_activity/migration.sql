-- Additive task-scoped activity events (011-task-activity).
-- Generate Client: `npm run prisma:generate` (TypeScript client only; no DB changes).
-- Apply this versioned migration: `npm run prisma:deploy`.
-- Do not run `prisma migrate reset` or delete Docker volumes unless authorized.
-- Do not add labels (E), app-wide audit (C), or peer activity product tables.

-- CreateEnum
CREATE TYPE "TaskActivityKind" AS ENUM ('TASK_CREATED', 'TASK_FIELDS_CHANGED', 'TASK_SOFT_DELETED', 'COMMENT_ADDED');

-- CreateTable
CREATE TABLE "task_activity_events" (
    "id" UUID NOT NULL,
    "taskId" UUID NOT NULL,
    "actorUserId" UUID NOT NULL,
    "kind" "TaskActivityKind" NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "task_activity_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "task_activity_events_taskId_idx" ON "task_activity_events"("taskId");

-- CreateIndex
CREATE INDEX "task_activity_events_taskId_createdAt_idx" ON "task_activity_events"("taskId", "createdAt");

-- AddForeignKey
ALTER TABLE "task_activity_events" ADD CONSTRAINT "task_activity_events_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_activity_events" ADD CONSTRAINT "task_activity_events_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
