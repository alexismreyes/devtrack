import type {
  ProjectAccessOperation,
  ProjectAuthorizationSnapshot,
  ProjectMembershipQueryPort,
} from "../../projects/access/project-membership-port";
import type { FakeProjectAccessPort } from "./fake-project-access-port";
import type { FakeTaskAuthorizationPort } from "./fake-task-authorization-port";

/**
 * Membership-scoped project ids for dashboard tests.
 * Owners via ownerUserId; EDITOR/VIEWER via authorization member map.
 */
export class FakeProjectMembershipQueryPort
  implements ProjectMembershipQueryPort
{
  constructor(
    private readonly projects: FakeProjectAccessPort,
    private readonly authorization: FakeTaskAuthorizationPort,
  ) {}

  async listAuthorizedActiveProjectIds(actorId: string): Promise<string[]> {
    const ids = new Set<string>();
    for (const project of this.projects.projectsById.values()) {
      if (project.archivedAt !== null) {
        continue;
      }
      if (project.ownerUserId === actorId) {
        ids.add(project.id);
        continue;
      }
      const auth = this.authorization.projectsById.get(project.id);
      if (auth?.members.has(actorId)) {
        ids.add(project.id);
      }
    }
    return [...ids];
  }

  async listDistinctMemberUserIdsForProjectIds(
    projectIds: string[],
  ): Promise<string[]> {
    const users = new Set<string>();
    for (const projectId of projectIds) {
      const project = this.projects.projectsById.get(projectId);
      if (project !== undefined) {
        users.add(project.ownerUserId);
      }
      const auth = this.authorization.projectsById.get(projectId);
      if (auth !== undefined) {
        for (const userId of auth.members.keys()) {
          users.add(userId);
        }
      }
    }
    return [...users];
  }

  async assertAuthorized(
    _actorId: string,
    _project: ProjectAuthorizationSnapshot,
    _operation: ProjectAccessOperation,
  ): Promise<void> {
    // Dashboard path does not call assertAuthorized.
  }
}
