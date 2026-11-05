import type { LabelColor, ProjectLabel } from "../domain/project-label";

export type CreateLabelInput = {
  projectId: string;
  name: string;
  color: LabelColor;
};

export type UpdateLabelInput = {
  name?: string;
  color?: LabelColor;
};

export interface LabelsRepository {
  create(input: CreateLabelInput): Promise<ProjectLabel>;
  findByIdInProject(
    projectId: string,
    labelId: string,
  ): Promise<ProjectLabel | null>;
  findByIdsInProject(
    projectId: string,
    labelIds: string[],
  ): Promise<ProjectLabel[]>;
  listByProjectId(projectId: string): Promise<ProjectLabel[]>;
  update(id: string, input: UpdateLabelInput): Promise<ProjectLabel>;
  delete(id: string): Promise<void>;
}
