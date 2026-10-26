import type { UsersRepository } from "../repository/users-repository";
import type {
  CreateUserIdentityInput,
  UserIdentity,
  UsersIdentityPort,
} from "./users-identity-port";

function toIdentity(user: {
  id: string;
  email: string;
  displayName: string;
}): UserIdentity {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
  };
}

export class UsersIdentityAdapter implements UsersIdentityPort {
  constructor(private readonly users: UsersRepository) {}

  async create(input: CreateUserIdentityInput): Promise<UserIdentity> {
    const user = await this.users.create(input);
    return toIdentity(user);
  }

  async findById(id: string): Promise<UserIdentity | null> {
    const user = await this.users.findById(id);
    return user === null ? null : toIdentity(user);
  }

  async findByEmail(email: string): Promise<UserIdentity | null> {
    const user = await this.users.findByEmail(email);
    return user === null ? null : toIdentity(user);
  }
}
