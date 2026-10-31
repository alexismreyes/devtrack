import type { ProjectMemberRole } from "../domain/project-member";
import type { ProjectMemberView } from "../service/project-members-service";

export type PublicMemberDto = {
  id: string;
  userId: string;
  email: string;
  displayName: string;
  role: ProjectMemberRole;
  createdAt: string;
};

export type MemberListResponseDto = {
  members: PublicMemberDto[];
};

export type AddMemberRequestDto = {
  email: string;
  role: ProjectMemberRole;
};

export type UpdateMemberRequestDto = {
  role: ProjectMemberRole;
};

export function toPublicMemberDto(member: ProjectMemberView): PublicMemberDto {
  return {
    id: member.id,
    userId: member.userId,
    email: member.email,
    displayName: member.displayName,
    role: member.role,
    createdAt: member.createdAt.toISOString(),
  };
}
