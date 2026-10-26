import { assertOwnProfile } from "../domain/authorization";
import { UserNotFoundError } from "../domain/errors";
import type { User } from "../domain/user";
import type { UsersRepository } from "../repository/users-repository";

export class UsersService {
  constructor(private readonly users: UsersRepository) {}

  async getProfile(actorId: string, targetUserId: string): Promise<User> {
    assertOwnProfile(actorId, targetUserId);
    const user = await this.users.findById(targetUserId);
    if (user === null) {
      throw new UserNotFoundError();
    }
    return user;
  }

  async updateDisplayName(
    actorId: string,
    targetUserId: string,
    displayName: string,
  ): Promise<User> {
    assertOwnProfile(actorId, targetUserId);
    return this.users.updateDisplayName(targetUserId, displayName);
  }
}
