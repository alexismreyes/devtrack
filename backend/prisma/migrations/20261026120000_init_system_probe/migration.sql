-- CreateTable
CREATE TABLE "system_probes" (
    "id" UUID NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_probes_pkey" PRIMARY KEY ("id")
);
