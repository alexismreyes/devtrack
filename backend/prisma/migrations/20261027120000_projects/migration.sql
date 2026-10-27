-- Additive projects persistence. Keep SystemProbe without project or user ownership.
-- Generate Client: `npm run prisma:generate` (TypeScript client only; no DB changes).
-- Apply this versioned migration: `npm run prisma:deploy`.
-- Development may also use `npm run prisma:migrate` to create future migrations.
-- Do not run `prisma migrate reset` or delete Docker volumes unless authorized.

-- CreateTable
CREATE TABLE "projects" (
    "id" UUID NOT NULL,
    "ownerUserId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "projects_ownerUserId_idx" ON "projects"("ownerUserId");

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
