import type { LabelColor, ProjectLabel } from "../domain/project-label";

export type PublicLabelDto = {
  id: string;
  projectId: string;
  name: string;
  color: LabelColor;
  createdAt: string;
};

export type TaskEmbeddedLabelDto = {
  id: string;
  name: string;
  color: LabelColor;
};

export type LabelListResponseDto = {
  labels: PublicLabelDto[];
};

export type CreateLabelRequestDto = {
  name: string;
  color: LabelColor;
};

export type UpdateLabelRequestDto = {
  name?: string;
  color?: LabelColor;
};

export type ReplaceTaskLabelsRequestDto = {
  labelIds: string[];
};

export type TaskLabelsResponseDto = {
  labels: PublicLabelDto[];
};

export function toPublicLabelDto(label: ProjectLabel): PublicLabelDto {
  return {
    id: label.id,
    projectId: label.projectId,
    name: label.name,
    color: label.color,
    createdAt: label.createdAt.toISOString(),
  };
}

export function toTaskEmbeddedLabelDto(
  label: Pick<ProjectLabel, "id" | "name" | "color">,
): TaskEmbeddedLabelDto {
  return {
    id: label.id,
    name: label.name,
    color: label.color,
  };
}
