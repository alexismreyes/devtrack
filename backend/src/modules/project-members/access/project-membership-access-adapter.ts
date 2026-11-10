import type {
  OwnerMembershipWritePort,
  ProjectAccessOperation,
  ProjectAuthorizationSnapshot,
  ProjectMembershipQueryPort,
} from "../../projects/access/project-membership-port";
import type { ProjectSnapshotPort } from "../../projects/access/project-snapshot-port";
import { assertAuthorizedForOperation } from "../domain/authorization";
import type { ProjectMembersRepository } from "../repository/project-members-repository";

export class ProjectMembershipAccessAdapter
  implements ProjectMembershipQueryPort
{
  constructor(
    private readonly members: ProjectMembersRepository,
    private readonly projects: ProjectSnapshotPort,
  ) {}

  async listAuthorizedActiveProjectIds(actorId: string): Promise<string[]> {
    const ownedIds = await this.projects.listActiveIdsByOwnerId(actorId);
    const memberIds = await this.members.listProjectIdsByUserId(actorId);
    const memberActiveIds = await this.projects.listActiveIds(memberIds);
    return [...new Set([...ownedIds, ...memberActiveIds])];
  }

  async listDistinctMemberUserIdsForProjectIds(
    projectIds: string[],
  ): Promise<string[]> {
    if (projectIds.length === 0) {
      return [];
    }
    const fromMembers =
      await this.members.listDistinctUserIdsByProjectIds(projectIds);
    const owners = new Set<string>(fromMembers);
    for (const projectId of projectIds) {
      const snapshot = await this.projects.findById(projectId);
      if (snapshot !== null) {
        owners.add(snapshot.ownerUserId);
      }
    }
    return [...owners];
  }

  async assertAuthorized(
    actorId: string,
    project: ProjectAuthorizationSnapshot,
    operation: ProjectAccessOperation,
  ): Promise<void> {
    const membership = await this.members.findByProjectAndUser(
      project.id,
      actorId,
    );
    assertAuthorizedForOperation(
      {
        actorId,
        ownerUserId: project.ownerUserId,
        archivedAt: project.archivedAt,
        membershipRole: membership?.role ?? null,
      },
      operation,
    );
  }
}

export class OwnerMembershipWriteAdapter implements OwnerMembershipWritePort {
  constructor(private readonly members: ProjectMembersRepository) {}

  async insertCreatingOwner(projectId: string, userId: string): Promise<void> {
    await this.members.create({
      projectId,
      userId,
      role: "OWNER",
    });
  }
}
