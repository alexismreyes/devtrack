import { argon2id, hash, verify } from "argon2";
import { InvalidPasswordError } from "./errors";

export async function hashPassword(plaintext: string): Promise<string> {
  if (plaintext.length === 0) {
    throw new InvalidPasswordError();
  }
  return hash(plaintext, { type: argon2id });
}

export async function verifyPassword(
  passwordHash: string,
  plaintext: string,
): Promise<boolean> {
  try {
    return await verify(passwordHash, plaintext);
  } catch {
    return false;
  }
}
