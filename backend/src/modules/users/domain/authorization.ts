import { ProfileForbiddenError } from "./errors";

export function assertOwnProfile(actorId: string, targetUserId: string): void {
  if (actorId !== targetUserId) {
    throw new ProfileForbiddenError();
  }
}
