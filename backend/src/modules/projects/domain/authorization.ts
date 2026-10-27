import { ProjectForbiddenError } from "./errors";

export function assertProjectOwner(actorId: string, ownerUserId: string): void {
  if (actorId !== ownerUserId) {
    throw new ProjectForbiddenError();
  }
}
