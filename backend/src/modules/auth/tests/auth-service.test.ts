import { describe, expect, it } from "vitest";
import { DuplicateEmailError } from "../../users/domain/errors";
import { UsersIdentityAdapter } from "../../users/identity/users-identity-adapter";
import { InMemoryUsersRepository } from "../../users/tests/in-memory-users-repository";
import { AuthSession } from "../domain/auth-session";
import {
  InvalidCredentialsError,
  UnauthenticatedError,
} from "../domain/errors";
import { AuthService } from "../service/auth-service";
import { InMemoryAuthRepository } from "./in-memory-auth-repository";

function createAuthService() {
  const users = new InMemoryUsersRepository();
  const auth = new InMemoryAuthRepository(users);
  const service = new AuthService(auth, new UsersIdentityAdapter(users));
  return { users, auth, service };
}

describe("AuthService", () => {
  it("registers a user and issues a session without exposing a hash", async () => {
    const { service, auth } = createAuthService();

    const result = await service.register({
      email: "Ada@Example.COM",
      password: "secret-pass",
      displayName: "Ada",
    });

    expect(result.user.email).toBe("ada@example.com");
    expect(result.user.displayName).toBe("Ada");
    expect(result.user).not.toHaveProperty("passwordHash");
    expect(result.session.userId).toBe(result.user.id);
    expect(result.session.isValid()).toBe(true);

    const storedHash = await auth.findPasswordHashByUserId(result.user.id);
    expect(storedHash).not.toBe("secret-pass");
    expect(storedHash?.startsWith("$argon2id$")).toBe(true);
  });

  it("rejects a duplicate email including a different letter case", async () => {
    const { service } = createAuthService();
    await service.register({
      email: "ada@example.com",
      password: "secret-pass",
      displayName: "Ada",
    });

    await expect(
      service.register({
        email: "ADA@example.com",
        password: "other-pass",
        displayName: "Other",
      }),
    ).rejects.toBeInstanceOf(DuplicateEmailError);
  });

  it("logs in with a case-insensitive email and creates a new session", async () => {
    const { service } = createAuthService();
    const registered = await service.register({
      email: "ada@example.com",
      password: "secret-pass",
      displayName: "Ada",
    });

    const loggedIn = await service.login({
      email: "ADA@example.com",
      password: "secret-pass",
    });

    expect(loggedIn.user.id).toBe(registered.user.id);
    expect(loggedIn.session.id).not.toBe(registered.session.id);
    expect(registered.session.isValid()).toBe(true);
    expect(loggedIn.session.isValid()).toBe(true);
  });

  it("rejects unknown emails and wrong passwords with the same credentials error", async () => {
    const { service } = createAuthService();
    await service.register({
      email: "ada@example.com",
      password: "secret-pass",
      displayName: "Ada",
    });

    const unknown = service.login({
      email: "missing@example.com",
      password: "secret-pass",
    });
    const wrong = service.login({
      email: "ada@example.com",
      password: "wrong-pass",
    });

    await expect(unknown).rejects.toBeInstanceOf(InvalidCredentialsError);
    await expect(wrong).rejects.toBeInstanceOf(InvalidCredentialsError);
    await expect(unknown).rejects.toThrow("Invalid email or password");
    await expect(wrong).rejects.toThrow("Invalid email or password");
  });

  it("revokes only the current session on logout", async () => {
    const { service, auth } = createAuthService();
    const registered = await service.register({
      email: "ada@example.com",
      password: "secret-pass",
      displayName: "Ada",
    });
    const second = await service.login({
      email: "ada@example.com",
      password: "secret-pass",
    });

    await service.logout(registered.session.id);

    const revoked = await auth.findSessionById(registered.session.id);
    const remaining = await auth.findSessionById(second.session.id);
    expect(revoked?.isValid()).toBe(false);
    expect(remaining?.isValid()).toBe(true);
  });

  it("authenticates a valid session and rejects missing, malformed, expired, and revoked ones", async () => {
    const { service, auth, users } = createAuthService();
    const registered = await service.register({
      email: "ada@example.com",
      password: "secret-pass",
      displayName: "Ada",
    });

    await expect(
      service.authenticate(registered.session.id),
    ).resolves.toEqual({
      userId: registered.user.id,
      sessionId: registered.session.id,
    });
    await expect(service.authenticate(undefined)).rejects.toBeInstanceOf(
      UnauthenticatedError,
    );
    await expect(service.authenticate("not-a-session")).rejects.toBeInstanceOf(
      UnauthenticatedError,
    );

    const expired = AuthSession.rehydrate(
      "33333333-3333-4333-8333-333333333333",
      registered.user.id,
      new Date("2020-01-01T00:00:00.000Z"),
      new Date("2020-01-08T00:00:00.000Z"),
      null,
    );
    auth.putSession(expired);
    await expect(service.authenticate(expired.id)).rejects.toBeInstanceOf(
      UnauthenticatedError,
    );

    await service.logout(registered.session.id);
    await expect(
      service.authenticate(registered.session.id),
    ).rejects.toBeInstanceOf(UnauthenticatedError);

    const orphan = AuthSession.issue("99999999-9999-4999-8999-999999999999");
    auth.putSession(orphan);
    await expect(service.authenticate(orphan.id)).rejects.toBeInstanceOf(
      UnauthenticatedError,
    );
    expect(users.usersById.has(orphan.userId)).toBe(false);
  });
});
