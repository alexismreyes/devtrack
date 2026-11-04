import type {
  CreateUserIdentityInput,
  UserIdentity,
  UsersIdentityPort,
} from "../../users/identity/users-identity-port";

export class FakeUsersIdentityPort implements UsersIdentityPort {
  readonly usersById = new Map<string, UserIdentity>();

  seed(user: UserIdentity): void {
    this.usersById.set(user.id, { ...user });
  }

  async create(input: CreateUserIdentityInput): Promise<UserIdentity> {
    throw new Error(`Unexpected create for ${input.email}`);
  }

  async findById(id: string): Promise<UserIdentity | null> {
    return this.usersById.get(id) ?? null;
  }

  async findByEmail(email: string): Promise<UserIdentity | null> {
    const canonical = email.trim().toLowerCase();
    for (const user of this.usersById.values()) {
      if (user.email === canonical) {
        return user;
      }
    }
    return null;
  }
}
