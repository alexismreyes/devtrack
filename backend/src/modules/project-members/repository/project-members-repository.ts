import type {
  ProjectMember,
  ProjectMemberRole,
} from "../domain/project-member";

export type CreateMembershipInput = {
  projectId: string;
  userId: string;
  role: ProjectMemberRole;
};

export interface ProjectMembersRepository {
  create(input: CreateMembershipInput): Promise<ProjectMember>;
  listByProjectId(projectId: string): Promise<ProjectMember[]>;
  findByProjectAndUser(
    projectId: string,
    userId: string,
  ): Promise<ProjectMember | null>;
  listProjectIdsByUserId(userId: string): Promise<string[]>;
  listDistinctUserIdsByProjectIds(projectIds: string[]): Promise<string[]>;
  deleteByProjectAndUser(projectId: string, userId: string): Promise<void>;
  updateRole(
    projectId: string,
    userId: string,
    role: ProjectMemberRole,
  ): Promise<ProjectMember>;
}
