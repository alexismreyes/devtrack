import { describe, expect, it } from "vitest";
import { assertOwnProfile } from "../domain/authorization";
import { canonicalizeEmail, ensureEmailAvailable } from "../domain/email";
import {
  DuplicateEmailError,
  InvalidDisplayNameError,
  InvalidUserEmailError,
  ProfileForbiddenError,
} from "../domain/errors";
import { User } from "../domain/user";

describe("users domain", () => {
  it("assigns a UUID identity and creation time when registered by the system", () => {
    const before = Date.now();
    const user = User.register("Ada@Example.COM", "Ada Lovelace");
    const after = Date.now();

    expect(user.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(user.createdAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(user.createdAt.getTime()).toBeLessThanOrEqual(after);
  });

  it("stores email in canonical lowercase form", () => {
    const user = User.register("Ada@Example.COM", "Ada");
    expect(user.email).toBe("ada@example.com");
    expect(canonicalizeEmail("Ada@Example.COM")).toBe("ada@example.com");
    expect(canonicalizeEmail(" ada@example.com ")).toBe("ada@example.com");
  });

  it("treats letter-case variants as the same email for uniqueness", () => {
    expect(canonicalizeEmail("USER@DevTrack.dev")).toBe(
      canonicalizeEmail("user@devtrack.dev"),
    );

    const existing = User.register("user@devtrack.dev", "Ada");
    expect(() => ensureEmailAvailable(existing)).toThrow(DuplicateEmailError);
    expect(() => ensureEmailAvailable(null)).not.toThrow();
  });

  it("requires a non-empty email and display name", () => {
    expect(() => User.register("   ", "Ada")).toThrow(InvalidUserEmailError);
    expect(() => User.register("ada@example.com", "   ")).toThrow(
      InvalidDisplayNameError,
    );
    expect(() => canonicalizeEmail("")).toThrow(InvalidUserEmailError);
  });

  it("does not include a password hash on the user entity", () => {
    const user = User.register("ada@example.com", "Ada");
    expect(user).not.toHaveProperty("passwordHash");
    expect(user).not.toHaveProperty("password");
    expect(JSON.stringify(user)).not.toMatch(/password/i);
  });

  it("uses the provided clock for created time", () => {
    const now = new Date("2026-10-26T16:00:00.000Z");
    const user = User.register("ada@example.com", "Ada", now);
    expect(user.createdAt.toISOString()).toBe("2026-10-26T16:00:00.000Z");
  });

  it("rehydrates persisted identity without changing it", () => {
    const id = "11111111-1111-4111-8111-111111111111";
    const createdAt = new Date("2026-01-02T03:04:05.000Z");
    const user = User.rehydrate(id, "ada@example.com", "Ada", createdAt);

    expect(user.id).toBe(id);
    expect(user.email).toBe("ada@example.com");
    expect(user.displayName).toBe("Ada");
    expect(user.createdAt.toISOString()).toBe("2026-01-02T03:04:05.000Z");
  });

  it("updates displayName only and stays frozen", () => {
    const user = User.register("ada@example.com", "Ada");
    const renamed = user.withDisplayName(" Ada Lovelace ");

    expect(renamed.displayName).toBe("Ada Lovelace");
    expect(renamed.email).toBe(user.email);
    expect(renamed.id).toBe(user.id);
    expect(user.displayName).toBe("Ada");
    expect(Object.isFrozen(user)).toBe(true);
    expect(() => {
      (user as { displayName: string }).displayName = "Mutated";
    }).toThrow();
  });

  it("authorizes own-profile access only when actor matches target", () => {
    const actorId = "11111111-1111-4111-8111-111111111111";
    const otherId = "22222222-2222-4222-8222-222222222222";

    expect(() => assertOwnProfile(actorId, actorId)).not.toThrow();
    expect(() => assertOwnProfile(actorId, otherId)).toThrow(
      ProfileForbiddenError,
    );
  });
});
