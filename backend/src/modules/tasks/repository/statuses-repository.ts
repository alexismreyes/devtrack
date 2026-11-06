import type {
  ProjectStatus,
  StatusColor,
} from "../domain/project-status";

export type CreateStatusInput = {
  projectId: string;
  name: string;
  color: StatusColor;
  isCompleted?: boolean;
};

export type UpdateStatusInput = {
  name?: string;
  color?: StatusColor;
  isCompleted?: boolean;
};

export interface StatusesRepository {
  create(input: CreateStatusInput): Promise<ProjectStatus>;
  findByIdInProject(
    projectId: string,
    statusId: string,
  ): Promise<ProjectStatus | null>;
  findByKeyInProject(
    projectId: string,
    key: string,
  ): Promise<ProjectStatus | null>;
  listByProjectId(projectId: string): Promise<ProjectStatus[]>;
  listByProjectIds(projectIds: string[]): Promise<ProjectStatus[]>;
  update(id: string, input: UpdateStatusInput): Promise<ProjectStatus>;
  delete(id: string): Promise<void>;
  reorder(
    projectId: string,
    orderedIds: string[],
  ): Promise<ProjectStatus[]>;
  countLiveTasksByStatusKey(projectId: string, key: string): Promise<number>;
  countNonCompleted(projectId: string): Promise<number>;
  seedDefaultsForProject(projectId: string): Promise<ProjectStatus[]>;
}
