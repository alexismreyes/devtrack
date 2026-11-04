import type {
  AuthorizedProjectSnapshot,
  TaskAuthorizationPort,
} from "../../project-members/access/task-authorization-port";
import { assertAuthorizedForOperation } from "../../project-members/domain/authorization";
import { MembershipProjectNotFoundError } from "../../project-members/domain/errors";
import type { ProjectMemberRole } from "../../project-members/domain/project-member";
import type { OwnedProjectSnapshot } from "../../projects/access/project-access-port";

type SeededProject = OwnedProjectSnapshot & {
  members: Map<string, ProjectMemberRole>;
};

export class FakeTaskAuthorizationPort implements TaskAuthorizationPort {
  readonly projectsById = new Map<string, SeededProject>();

  seed(
    snapshot: OwnedProjectSnapshot,
    members: Record<string, ProjectMemberRole> = {},
  ): void {
    const existing = this.projectsById.get(snapshot.id);
    this.projectsById.set(snapshot.id, {
      id: snapshot.id,
      ownerUserId: snapshot.ownerUserId,
      name: snapshot.name,
      archivedAt:
        snapshot.archivedAt === null
          ? null
          : new Date(snapshot.archivedAt.getTime()),
      members: existing?.members ?? new Map(Object.entries(members)),
    });
  }

  addMember(projectId: string, userId: string, role: ProjectMemberRole): void {
    const project = this.projectsById.get(projectId);
    if (project === undefined) {
      return;
    }
    project.members.set(userId, role);
  }

  async requireTaskRead(
    actorId: string,
    projectId: string,
  ): Promise<AuthorizedProjectSnapshot> {
    return this.require(actorId, projectId, "read_task");
  }

  async requireTaskWrite(
    actorId: string,
    projectId: string,
  ): Promise<AuthorizedProjectSnapshot> {
    return this.require(actorId, projectId, "write_task");
  }

  async requireProjectOwner(
    actorId: string,
    projectId: string,
  ): Promise<AuthorizedProjectSnapshot> {
    return this.require(actorId, projectId, "manage_members");
  }

  private async require(
    actorId: string,
    projectId: string,
    operation: "read_task" | "write_task" | "manage_members",
  ): Promise<AuthorizedProjectSnapshot> {
    const project = this.projectsById.get(projectId);
    if (project === undefined) {
      throw new MembershipProjectNotFoundError();
    }
    assertAuthorizedForOperation(
      {
        actorId,
        ownerUserId: project.ownerUserId,
        archivedAt: project.archivedAt,
        membershipRole: project.members.get(actorId) ?? null,
      },
      operation,
    );
    return {
      id: project.id,
      ownerUserId: project.ownerUserId,
      archivedAt:
        project.archivedAt === null
          ? null
          : new Date(project.archivedAt.getTime()),
    };
  }
}
