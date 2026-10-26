import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { loadConfig } from "../../../config/config";
import { loadEnvFiles } from "../../../config/env";
import { createPrismaClient } from "../../../infrastructure/prisma/client";
import { DuplicateEmailError, UserNotFoundError } from "../domain/errors";
import { PrismaUsersRepository } from "../repository/prisma-users-repository";

loadEnvFiles();
process.env.CORS_ORIGIN ??= "http://localhost:5173";
const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);

describe("PrismaUsersRepository", () => {
  let prisma: ReturnType<typeof createPrismaClient> | null = null;
  let repository: PrismaUsersRepository | null = null;

  if (hasDatabaseUrl) {
    prisma = createPrismaClient(loadConfig().databaseUrl);
    repository = new PrismaUsersRepository(prisma);
  }

  afterAll(async () => {
    await prisma?.$disconnect();
  });

  it.skipIf(!hasDatabaseUrl)(
    "creates and finds a user without exposing a password hash",
    async () => {
      if (!repository) {
        return;
      }

      const email = `user-${randomUUID()}@example.com`;
      const created = await repository.create({
        email: email.toUpperCase(),
        displayName: " Ada ",
      });

      expect(created.email).toBe(email);
      expect(created.displayName).toBe("Ada");
      expect(created).not.toHaveProperty("passwordHash");

      const byId = await repository.findById(created.id);
      const byEmail = await repository.findByEmail(email.toUpperCase());

      expect(byId?.id).toBe(created.id);
      expect(byEmail?.id).toBe(created.id);
      expect(byId).not.toHaveProperty("passwordHash");
      expect(JSON.stringify(byId)).not.toMatch(/password/i);
    },
  );

  it.skipIf(!hasDatabaseUrl)(
    "rejects a duplicate email including a different letter case",
    async () => {
      if (!repository) {
        return;
      }

      const local = randomUUID();
      const email = `dup-${local}@example.com`;
      await repository.create({ email, displayName: "First" });

      await expect(
        repository.create({
          email: email.toUpperCase(),
          displayName: "Second",
        }),
      ).rejects.toBeInstanceOf(DuplicateEmailError);

      const found = await repository.findByEmail(email);
      expect(found?.displayName).toBe("First");
    },
  );

  it.skipIf(!hasDatabaseUrl)(
    "updates displayName only",
    async () => {
      if (!repository) {
        return;
      }

      const email = `rename-${randomUUID()}@example.com`;
      const created = await repository.create({
        email,
        displayName: "Ada",
      });

      const updated = await repository.updateDisplayName(
        created.id,
        "Ada Lovelace",
      );

      expect(updated.email).toBe(email);
      expect(updated.displayName).toBe("Ada Lovelace");
      expect(updated.id).toBe(created.id);
    },
  );

  it.skipIf(!hasDatabaseUrl)(
    "throws when updating a missing user",
    async () => {
      if (!repository) {
        return;
      }

      await expect(
        repository.updateDisplayName(
          "99999999-9999-4999-8999-999999999999",
          "Ghost",
        ),
      ).rejects.toBeInstanceOf(UserNotFoundError);
    },
  );
});
