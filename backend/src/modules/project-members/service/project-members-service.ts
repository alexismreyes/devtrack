import type { ProjectSnapshotPort } from "../../projects/access/project-snapshot-port";
import type { UsersIdentityPort } from "../../users/identity/users-identity-port";
import {
  assertAuthorizedForOperation,
  type ProjectOperation,
} from "../domain/authorization";
import {
  MembershipNotFoundError,
  MembershipProjectNotFoundError,
  OwnerMembershipConflictError,
} from "../domain/errors";
import {
  assertCanChangeMemberRole,
  assertCanRemoveMember,
} from "../domain/owner-invariants";
import {
  assertExistingMemberUser,
  assertMembershipAvailable,
  canonicalizeMemberEmail,
  type ProjectMember,
  type ProjectMemberRole,
} from "../domain/project-member";
import type { ProjectMembersRepository } from "../repository/project-members-repository";

export type ProjectMemberView = {
  id: string;
  userId: string;
  email: string;
  displayName: string;
  role: ProjectMemberRole;
  createdAt: Date;
};

export class ProjectMembersService {
  constructor(
    private readonly members: ProjectMembersRepository,
    private readonly identities: UsersIdentityPort,
    private readonly projects: ProjectSnapshotPort,
  ) {}

  async listByProject(
    actorId: string,
    projectId: string,
  ): Promise<ProjectMemberView[]> {
    const project = await this.requireProject(projectId);
    await this.requireOperation(actorId, project.id, project, "list_members");
    const members = await this.members.listByProjectId(projectId);
    const views: ProjectMemberView[] = [];
    for (const member of members) {
      views.push(await this.toView(member));
    }
    return views;
  }

  async addByEmail(
    actorId: string,
    projectId: string,
    email: string,
    role: ProjectMemberRole,
  ): Promise<ProjectMemberView> {
    const project = await this.requireProject(projectId);
    await this.requireOperation(actorId, project.id, project, "manage_members");
    const identity = await this.identities.findByEmail(
      canonicalizeMemberEmail(email),
    );
    assertExistingMemberUser(identity);
    const existing = await this.members.findByProjectAndUser(
      projectId,
      identity.id,
    );
    assertMembershipAvailable(existing);
    const created = await this.members.create({
      projectId,
      userId: identity.id,
      role,
    });
    return {
      id: created.id,
      userId: created.userId,
      email: identity.email,
      displayName: identity.displayName,
      role: created.role,
      createdAt: created.createdAt,
    };
  }

  async changeRole(
    actorId: string,
    projectId: string,
    userId: string,
    role: ProjectMemberRole,
  ): Promise<ProjectMemberView> {
    const project = await this.requireProject(projectId);
    await this.requireOperation(actorId, project.id, project, "manage_members");
    const members = await this.members.listByProjectId(projectId);
    const target = members.find((member) => member.userId === userId);
    if (target === undefined) {
      if (userId === project.ownerUserId) {
        throw new OwnerMembershipConflictError();
      }
      throw new MembershipNotFoundError();
    }
    assertCanChangeMemberRole({
      targetUserId: userId,
      ownerUserId: project.ownerUserId,
      nextRole: role,
      members,
    });
    const updated = await this.members.updateRole(projectId, userId, role);
    return this.toView(updated);
  }

  async remove(
    actorId: string,
    projectId: string,
    userId: string,
  ): Promise<void> {
    const project = await this.requireProject(projectId);
    await this.requireOperation(actorId, project.id, project, "manage_members");
    if (userId === project.ownerUserId) {
      throw new OwnerMembershipConflictError();
    }
    const members = await this.members.listByProjectId(projectId);
    const target = members.find((member) => member.userId === userId);
    if (target === undefined) {
      throw new MembershipNotFoundError();
    }
    assertCanRemoveMember({
      targetUserId: userId,
      ownerUserId: project.ownerUserId,
      members,
    });
    await this.members.deleteByProjectAndUser(projectId, userId);
  }

  private async requireProject(projectId: string) {
    const project = await this.projects.findById(projectId);
    if (project === null) {
      throw new MembershipProjectNotFoundError();
    }
    return project;
  }

  private async requireOperation(
    actorId: string,
    projectId: string,
    project: { ownerUserId: string; archivedAt: Date | null },
    operation: ProjectOperation,
  ): Promise<void> {
    const membership = await this.members.findByProjectAndUser(
      projectId,
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

  private async toView(member: ProjectMember): Promise<ProjectMemberView> {
    const identity = await this.identities.findById(member.userId);
    assertExistingMemberUser(identity);
    return {
      id: member.id,
      userId: member.userId,
      email: identity.email,
      displayName: identity.displayName,
      role: member.role,
      createdAt: member.createdAt,
    };
  }
}
