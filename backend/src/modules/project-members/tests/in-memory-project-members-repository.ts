import { MembershipNotFoundError } from "../domain/errors";
import {
  assertMembershipAvailable,
  ProjectMember,
  type ProjectMemberRole,
} from "../domain/project-member";
import type {
  CreateMembershipInput,
  ProjectMembersRepository,
} from "../repository/project-members-repository";

export class InMemoryProjectMembersRepository
  implements ProjectMembersRepository
{
  readonly membersById = new Map<string, ProjectMember>();

  async create(input: CreateMembershipInput): Promise<ProjectMember> {
    const existing = await this.findByProjectAndUser(
      input.projectId,
      input.userId,
    );
    assertMembershipAvailable(existing);
    const member = ProjectMember.create(
      input.projectId,
      input.userId,
      input.role,
    );
    this.membersById.set(member.id, member);
    return member;
  }

  async listByProjectId(projectId: string): Promise<ProjectMember[]> {
    return [...this.membersById.values()]
      .filter((member) => member.projectId === projectId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async findByProjectAndUser(
    projectId: string,
    userId: string,
  ): Promise<ProjectMember | null> {
    for (const member of this.membersById.values()) {
      if (member.projectId === projectId && member.userId === userId) {
        return member;
      }
    }
    return null;
  }

  async listProjectIdsByUserId(userId: string): Promise<string[]> {
    return [...this.membersById.values()]
      .filter((member) => member.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((member) => member.projectId);
  }

  async listDistinctUserIdsByProjectIds(
    projectIds: string[],
  ): Promise<string[]> {
    if (projectIds.length === 0) {
      return [];
    }
    const idSet = new Set(projectIds);
    return [
      ...new Set(
        [...this.membersById.values()]
          .filter((member) => idSet.has(member.projectId))
          .map((member) => member.userId),
      ),
    ];
  }

  async deleteByProjectAndUser(
    projectId: string,
    userId: string,
  ): Promise<void> {
    const existing = await this.requireMember(projectId, userId);
    this.membersById.delete(existing.id);
  }

  async updateRole(
    projectId: string,
    userId: string,
    role: ProjectMemberRole,
  ): Promise<ProjectMember> {
    const existing = await this.requireMember(projectId, userId);
    const updated = existing.withRole(role);
    this.membersById.set(updated.id, updated);
    return updated;
  }

  private async requireMember(
    projectId: string,
    userId: string,
  ): Promise<ProjectMember> {
    const existing = await this.findByProjectAndUser(projectId, userId);
    if (existing === null) {
      throw new MembershipNotFoundError();
    }
    return existing;
  }
}
