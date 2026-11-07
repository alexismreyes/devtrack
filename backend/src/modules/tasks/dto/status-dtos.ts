import type { ProjectStatus, StatusColor } from "../domain/project-status";

export type PublicProjectStatusDto = {
  id: string;
  projectId: string;
  key: string;
  name: string;
  color: StatusColor;
  isSystem: boolean;
  isCompleted: boolean;
  position: number;
  createdAt: string;
};

export type StatusListResponseDto = {
  statuses: PublicProjectStatusDto[];
};

export type CreateStatusRequestDto = {
  name: string;
  color: StatusColor;
  isCompleted?: boolean;
};

export type UpdateStatusRequestDto = {
  name?: string;
  color?: StatusColor;
  isCompleted?: boolean;
};

export type ReorderStatusesRequestDto = {
  statusIds: string[];
};

export function toPublicProjectStatusDto(
  status: ProjectStatus,
): PublicProjectStatusDto {
  return {
    id: status.id,
    projectId: status.projectId,
    key: status.key,
    name: status.name,
    color: status.color,
    isSystem: status.isSystem,
    isCompleted: status.isCompleted,
    position: status.position,
    createdAt: status.createdAt.toISOString(),
  };
}
