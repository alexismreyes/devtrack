import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { loadConfig } from "../../../config/config";
import { loadEnvFiles } from "../../../config/env";
import { createPrismaClient } from "../../../infrastructure/prisma/client";
import { DuplicateEmailError } from "../../users/domain/errors";
import { PrismaUsersRepository } from "../../users/repository/prisma-users-repository";
import { hashPassword } from "../domain/password-hasher";
import { PrismaAuthRepository } from "../repository/prisma-auth-repository";

loadEnvFiles();
process.env.CORS_ORIGIN ??= "http://localhost:5173";
const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);

describe("PrismaAuthRepository", () => {
  let prisma: ReturnType<typeof createPrismaClient> | null = null;
  let users: PrismaUsersRepository | null = null;
  let auth: PrismaAuthRepository | null = null;

  if (hasDatabaseUrl) {
    prisma = createPrismaClient(loadConfig().databaseUrl);
    users = new PrismaUsersRepository(prisma);
    auth = new PrismaAuthRepository(prisma);
  }

  afterAll(async () => {
    await prisma?.$disconnect();
  });

  it.skipIf(!hasDatabaseUrl)(
    "registers a user, password hash, and session in one transaction",
    async () => {
      if (!auth || !users || !prisma) {
        return;
      }

      const email = `reg-${randomUUID()}@example.com`;
      const plaintext = "registration-secret";
      const passwordHash = await hashPassword(plaintext);

      const registered = await auth.createRegisteredUser({
        email: email.toUpperCase(),
        displayName: "Ada",
        passwordHash,
      });

      const persistedUser = await users.findById(registered.user.id);
      const storedHash = await auth.findPasswordHashByUserId(
        registered.user.id,
      );
      const persistedSession = await auth.findSessionById(
        registered.session.id,
      );

      expect(persistedUser?.email).toBe(email);
      expect(persistedUser).not.toHaveProperty("passwordHash");
      expect(storedHash).toBe(passwordHash);
      expect(storedHash).not.toBe(plaintext);
      expect(persistedSession?.userId).toBe(registered.user.id);
      expect(persistedSession?.isValid()).toBe(true);

      const credentialCount = await prisma.authPasswordCredential.count({
        where: { userId: registered.user.id },
      });
      expect(credentialCount).toBe(1);
    },
  );

  it.skipIf(!hasDatabaseUrl)(
    "does not leave a partial user when duplicate email registration fails",
    async () => {
      if (!auth || !users) {
        return;
      }

      const local = randomUUID();
      const email = `txn-${local}@example.com`;
      const passwordHash = await hashPassword("first-secret");

      const first = await auth.createRegisteredUser({
        email,
        displayName: "First",
        passwordHash,
      });

      await expect(
        auth.createRegisteredUser({
          email: email.toUpperCase(),
          displayName: "Second",
          passwordHash: await hashPassword("second-secret"),
        }),
      ).rejects.toBeInstanceOf(DuplicateEmailError);

      const found = await users.findByEmail(email);
      expect(found?.id).toBe(first.user.id);
      expect(found?.displayName).toBe("First");
    },
  );

  it.skipIf(!hasDatabaseUrl)(
    "creates an additional session without revoking existing sessions",
    async () => {
      if (!auth) {
        return;
      }

      const email = `sess-${randomUUID()}@example.com`;
      const registered = await auth.createRegisteredUser({
        email,
        displayName: "Ada",
        passwordHash: await hashPassword("session-secret"),
      });

      const second = await auth.createSession(registered.user.id);
      const firstAfter = await auth.findSessionById(registered.session.id);
      const secondAfter = await auth.findSessionById(second.id);

      expect(firstAfter?.isValid()).toBe(true);
      expect(secondAfter?.isValid()).toBe(true);
      expect(second.id).not.toBe(registered.session.id);
    },
  );

  it.skipIf(!hasDatabaseUrl)(
    "revokes only the requested session",
    async () => {
      if (!auth) {
        return;
      }

      const email = `revoke-${randomUUID()}@example.com`;
      const registered = await auth.createRegisteredUser({
        email,
        displayName: "Ada",
        passwordHash: await hashPassword("revoke-secret"),
      });
      const other = await auth.createSession(registered.user.id);

      await auth.revokeSession(registered.session.id);

      const revoked = await auth.findSessionById(registered.session.id);
      const remaining = await auth.findSessionById(other.id);

      expect(revoked?.isValid()).toBe(false);
      expect(revoked?.revokedAt).not.toBeNull();
      expect(remaining?.isValid()).toBe(true);
    },
  );

  it.skipIf(!hasDatabaseUrl)(
    "stores a password hash through the auth repository only",
    async () => {
      if (!auth || !users) {
        return;
      }

      const created = await users.create({
        email: `hash-${randomUUID()}@example.com`,
        displayName: "Ada",
      });
      const passwordHash = await hashPassword("saved-secret");
      await auth.savePasswordHash(created.id, passwordHash);

      const loadedUser = await users.findById(created.id);
      const loadedHash = await auth.findPasswordHashByUserId(created.id);

      expect(loadedUser).not.toHaveProperty("passwordHash");
      expect(loadedHash).toBe(passwordHash);
    },
  );

  it.skipIf(!hasDatabaseUrl)(
    "replaces a password hash and revokes other sessions for the user",
    async () => {
      if (!auth) {
        return;
      }

      const email = `pwd-${randomUUID()}@example.com`;
      const registered = await auth.createRegisteredUser({
        email,
        displayName: "Ada",
        passwordHash: await hashPassword("first-secret"),
      });
      const other = await auth.createSession(registered.user.id);
      const nextHash = await hashPassword("second-secret");

      await auth.savePasswordHash(registered.user.id, nextHash);
      await auth.revokeSessionsForUserExcept(
        registered.user.id,
        registered.session.id,
      );

      expect(await auth.findPasswordHashByUserId(registered.user.id)).toBe(
        nextHash,
      );
      expect(
        (await auth.findSessionById(registered.session.id))?.isValid(),
      ).toBe(true);
      expect((await auth.findSessionById(other.id))?.isValid()).toBe(false);
    },
  );
});
