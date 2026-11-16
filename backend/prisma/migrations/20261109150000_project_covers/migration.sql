-- Additive project covers (020-project-covers).
-- Generate Client: `npm run prisma:generate` (TypeScript client only; no DB changes).
-- Apply this versioned migration: `npm run prisma:deploy`.
-- Do not run `prisma migrate reset` or delete Docker volumes unless authorized.
-- Do not store project covers under task attachments paths.

-- CreateTable
CREATE TABLE "project_covers" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "uploadedByUserId" UUID NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_covers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "project_covers_projectId_key" ON "project_covers"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "project_covers_storageKey_key" ON "project_covers"("storageKey");

-- AddForeignKey
ALTER TABLE "project_covers" ADD CONSTRAINT "project_covers_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_covers" ADD CONSTRAINT "project_covers_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
