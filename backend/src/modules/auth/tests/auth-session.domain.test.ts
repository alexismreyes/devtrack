import { describe, expect, it } from "vitest";
import {
  AuthSession,
  SESSION_ABSOLUTE_TTL_MS,
} from "../domain/auth-session";

const USER_ID = "11111111-1111-4111-8111-111111111111";

describe("auth session domain", () => {
  it("issues an opaque UUID session that expires 7 days after issuance", () => {
    const issuedAt = new Date("2026-10-26T00:00:00.000Z");
    const session = AuthSession.issue(USER_ID, issuedAt);

    expect(session.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(session.userId).toBe(USER_ID);
    expect(session.createdAt.toISOString()).toBe("2026-10-26T00:00:00.000Z");
    expect(session.expiresAt.getTime()).toBe(
      issuedAt.getTime() + SESSION_ABSOLUTE_TTL_MS,
    );
    expect(session.expiresAt.toISOString()).toBe("2026-11-02T00:00:00.000Z");
    expect(session.revokedAt).toBeNull();
  });

  it("allows multiple concurrent sessions for the same user", () => {
    const first = AuthSession.issue(USER_ID);
    const second = AuthSession.issue(USER_ID);

    expect(first.id).not.toBe(second.id);
    expect(first.userId).toBe(second.userId);
    expect(first.isValid()).toBe(true);
    expect(second.isValid()).toBe(true);
  });

  it("is valid only while unrevoked and before absolute expiry", () => {
    const issuedAt = new Date("2026-10-26T00:00:00.000Z");
    const session = AuthSession.issue(USER_ID, issuedAt);

    expect(session.isValid(issuedAt)).toBe(true);
    expect(
      session.isValid(new Date(session.expiresAt.getTime() - 1)),
    ).toBe(true);
    expect(session.isValid(session.expiresAt)).toBe(false);
    expect(
      session.isValid(new Date(session.expiresAt.getTime() + 1)),
    ).toBe(false);
  });

  it("becomes invalid when that session is revoked", () => {
    const issuedAt = new Date("2026-10-26T00:00:00.000Z");
    const session = AuthSession.issue(USER_ID, issuedAt);
    const revokedAt = new Date("2026-10-27T00:00:00.000Z");
    const revoked = session.revoke(revokedAt);

    expect(session.isValid(revokedAt)).toBe(true);
    expect(revoked.revokedAt?.toISOString()).toBe("2026-10-27T00:00:00.000Z");
    expect(revoked.isValid(revokedAt)).toBe(false);
    expect(revoked.isValid(issuedAt)).toBe(false);
  });

  it("rehydrates persisted session fields without changing them", () => {
    const id = "33333333-3333-4333-8333-333333333333";
    const createdAt = new Date("2026-10-26T00:00:00.000Z");
    const expiresAt = new Date("2026-11-02T00:00:00.000Z");
    const session = AuthSession.rehydrate(
      id,
      USER_ID,
      createdAt,
      expiresAt,
      null,
    );

    expect(session.id).toBe(id);
    expect(session.userId).toBe(USER_ID);
    expect(session.createdAt.toISOString()).toBe(createdAt.toISOString());
    expect(session.expiresAt.toISOString()).toBe(expiresAt.toISOString());
    expect(session.revokedAt).toBeNull();
    expect(Object.isFrozen(session)).toBe(true);
  });
});
