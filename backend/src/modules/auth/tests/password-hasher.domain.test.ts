import { describe, expect, it } from "vitest";
import { InvalidPasswordError } from "../domain/errors";
import { hashPassword, verifyPassword } from "../domain/password-hasher";

describe("password hashing", () => {
  it("hashes with Argon2id so the stored value is not plaintext", async () => {
    const plaintext = "correct-horse-battery";
    const passwordHash = await hashPassword(plaintext);

    expect(passwordHash).not.toBe(plaintext);
    expect(passwordHash.startsWith("$argon2id$")).toBe(true);
    expect(passwordHash).not.toContain(plaintext);
  });

  it("verifies the original password and rejects a wrong password", async () => {
    const passwordHash = await hashPassword("secret-pass");

    await expect(verifyPassword(passwordHash, "secret-pass")).resolves.toBe(
      true,
    );
    await expect(verifyPassword(passwordHash, "wrong-pass")).resolves.toBe(
      false,
    );
  });

  it("rejects an empty password before hashing", async () => {
    await expect(hashPassword("")).rejects.toBeInstanceOf(InvalidPasswordError);
  });

  it("does not verify against a malformed hash", async () => {
    await expect(verifyPassword("not-a-hash", "secret-pass")).resolves.toBe(
      false,
    );
  });
});
