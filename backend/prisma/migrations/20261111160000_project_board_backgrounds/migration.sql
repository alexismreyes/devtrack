-- Additive project board backgrounds (037-board-background).
-- Generate Client: `npm run prisma:generate` (TypeScript client only; no DB changes).
-- Apply this versioned migration: `npm run prisma:deploy`.
-- Do not run `prisma migrate reset` or delete Docker volumes unless authorized.
-- Distinct from project_covers and task attachments volumes/paths.

-- CreateTable
CREATE TABLE "project_board_backgrounds" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "uploadedByUserId" UUID NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_board_backgrounds_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "project_board_backgrounds_projectId_key" ON "project_board_backgrounds"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "project_board_backgrounds_storageKey_key" ON "project_board_backgrounds"("storageKey");

-- AddForeignKey
ALTER TABLE "project_board_backgrounds" ADD CONSTRAINT "project_board_backgrounds_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_board_backgrounds" ADD CONSTRAINT "project_board_backgrounds_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
