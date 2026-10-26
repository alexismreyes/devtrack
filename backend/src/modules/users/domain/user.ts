import { randomUUID } from "node:crypto";
import { canonicalizeEmail } from "./email";
import { InvalidDisplayNameError } from "./errors";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeDisplayName(displayName: string): string {
  const normalized = displayName.trim();
  if (normalized === "") {
    throw new InvalidDisplayNameError();
  }
  return normalized;
}

export class User {
  readonly id: string;
  readonly email: string;
  readonly displayName: string;
  readonly createdAt: Date;

  private constructor(
    id: string,
    email: string,
    displayName: string,
    createdAt: Date,
  ) {
    if (!UUID_PATTERN.test(id)) {
      throw new Error("User id must be a UUID");
    }
    if (Number.isNaN(createdAt.getTime())) {
      throw new Error("User created time must be a valid date");
    }

    this.id = id;
    this.email = email;
    this.displayName = displayName;
    this.createdAt = new Date(createdAt.getTime());
    Object.freeze(this);
  }

  static register(
    email: string,
    displayName: string,
    now: Date = new Date(),
  ): User {
    return new User(
      randomUUID(),
      canonicalizeEmail(email),
      normalizeDisplayName(displayName),
      now,
    );
  }

  static rehydrate(
    id: string,
    email: string,
    displayName: string,
    createdAt: Date,
  ): User {
    return new User(
      id,
      canonicalizeEmail(email),
      normalizeDisplayName(displayName),
      createdAt,
    );
  }

  withDisplayName(displayName: string): User {
    return new User(
      this.id,
      this.email,
      normalizeDisplayName(displayName),
      this.createdAt,
    );
  }
}
