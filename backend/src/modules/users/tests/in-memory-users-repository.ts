import { canonicalizeEmail, ensureEmailAvailable } from "../domain/email";
import { UserNotFoundError } from "../domain/errors";
import { User } from "../domain/user";
import type {
  CreateUserInput,
  UsersRepository,
} from "../repository/users-repository";

export class InMemoryUsersRepository implements UsersRepository {
  readonly usersById = new Map<string, User>();

  async create(input: CreateUserInput): Promise<User> {
    const user = User.register(input.email, input.displayName);
    const existing = await this.findByEmail(user.email);
    ensureEmailAvailable(existing);
    this.usersById.set(user.id, user);
    return user;
  }

  async findById(id: string): Promise<User | null> {
    return this.usersById.get(id) ?? null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const canonical = canonicalizeEmail(email);
    for (const user of this.usersById.values()) {
      if (user.email === canonical) {
        return user;
      }
    }
    return null;
  }

  async updateDisplayName(id: string, displayName: string): Promise<User> {
    const existing = await this.findById(id);
    if (existing === null) {
      throw new UserNotFoundError();
    }
    const updated = existing.withDisplayName(displayName);
    this.usersById.set(id, updated);
    return updated;
  }
}
