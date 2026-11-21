import type { Project } from "../domain/project";

export type CreateProjectInput = {
  ownerUserId: string;
  name: string;
  description: string | null;
};

export type UpdateProjectInput = {
  name?: string;
  description?: string | null;
};

export interface ProjectsRepository {
  create(input: CreateProjectInput): Promise<Project>;
  findById(id: string): Promise<Project | null>;
  listByOwnerId(ownerUserId: string): Promise<Project[]>;
  listActiveByIds(ids: string[]): Promise<Project[]>;
  listArchivedByOwnerId(ownerUserId: string): Promise<Project[]>;
  update(id: string, input: UpdateProjectInput): Promise<Project>;
  archive(id: string): Promise<Project>;
  unarchive(id: string): Promise<Project>;
}
