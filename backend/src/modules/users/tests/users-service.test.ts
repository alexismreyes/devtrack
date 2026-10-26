import { describe, expect, it } from "vitest";
import { ProfileForbiddenError } from "../domain/errors";
import { UsersService } from "../service/users-service";
import { InMemoryUsersRepository } from "./in-memory-users-repository";

describe("UsersService", () => {
  it("returns the actor's own profile", async () => {
    const users = new InMemoryUsersRepository();
    const service = new UsersService(users);
    const created = await users.create({
      email: "ada@example.com",
      displayName: "Ada",
    });

    const profile = await service.getProfile(created.id, created.id);

    expect(profile.id).toBe(created.id);
    expect(profile.email).toBe("ada@example.com");
    expect(profile.displayName).toBe("Ada");
    expect(profile).not.toHaveProperty("passwordHash");
  });

  it("rejects reading another user's profile", async () => {
    const users = new InMemoryUsersRepository();
    const service = new UsersService(users);
    const actor = await users.create({
      email: "ada@example.com",
      displayName: "Ada",
    });
    const other = await users.create({
      email: "grace@example.com",
      displayName: "Grace",
    });

    await expect(service.getProfile(actor.id, other.id)).rejects.toBeInstanceOf(
      ProfileForbiddenError,
    );
  });

  it("updates displayName only when the actor owns the profile", async () => {
    const users = new InMemoryUsersRepository();
    const service = new UsersService(users);
    const created = await users.create({
      email: "ada@example.com",
      displayName: "Ada",
    });

    const updated = await service.updateDisplayName(
      created.id,
      created.id,
      "Ada Lovelace",
    );

    expect(updated.displayName).toBe("Ada Lovelace");
    expect(updated.email).toBe("ada@example.com");
    expect(updated.id).toBe(created.id);
  });

  it("rejects updating another user's displayName", async () => {
    const users = new InMemoryUsersRepository();
    const service = new UsersService(users);
    const actor = await users.create({
      email: "ada@example.com",
      displayName: "Ada",
    });
    const other = await users.create({
      email: "grace@example.com",
      displayName: "Grace",
    });

    await expect(
      service.updateDisplayName(actor.id, other.id, "Hacked"),
    ).rejects.toBeInstanceOf(ProfileForbiddenError);

    const unchanged = await users.findById(other.id);
    expect(unchanged?.displayName).toBe("Grace");
  });
});
