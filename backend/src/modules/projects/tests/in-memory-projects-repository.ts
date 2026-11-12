import { ProjectNotFoundError } from "../domain/errors";
import { Project } from "../domain/project";
import type {
  CreateProjectInput,
  ProjectsRepository,
  UpdateProjectInput,
} from "../repository/projects-repository";

export class InMemoryProjectsRepository implements ProjectsRepository {
  readonly projectsById = new Map<string, Project>();

  async create(input: CreateProjectInput): Promise<Project> {
    const project = Project.create(
      input.ownerUserId,
      input.name,
      input.description,
    );
    this.projectsById.set(project.id, project);
    return project;
  }

  async findById(id: string): Promise<Project | null> {
    return this.projectsById.get(id) ?? null;
  }

  async listByOwnerId(ownerUserId: string): Promise<Project[]> {
    return [...this.projectsById.values()]
      .filter(
        (project) =>
          project.ownerUserId === ownerUserId && project.archivedAt === null,
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async listActiveByIds(ids: string[]): Promise<Project[]> {
    if (ids.length === 0) {
      return [];
    }
    const wanted = new Set(ids);
    return [...this.projectsById.values()]
      .filter(
        (project) => wanted.has(project.id) && project.archivedAt === null,
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async listArchivedByOwnerId(ownerUserId: string): Promise<Project[]> {
    return [...this.projectsById.values()]
      .filter(
        (project) =>
          project.ownerUserId === ownerUserId && project.archivedAt !== null,
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async update(id: string, input: UpdateProjectInput): Promise<Project> {
    const existing = await this.findById(id);
    if (existing === null) {
      throw new ProjectNotFoundError();
    }
    const updated = existing.withDetails(input);
    this.projectsById.set(id, updated);
    return updated;
  }

  async archive(id: string): Promise<Project> {
    const existing = await this.findById(id);
    if (existing === null) {
      throw new ProjectNotFoundError();
    }
    const archived = existing.archive();
    this.projectsById.set(id, archived);
    return archived;
  }

  async unarchive(id: string): Promise<Project> {
    const existing = await this.findById(id);
    if (existing === null) {
      throw new ProjectNotFoundError();
    }
    const unarchived = existing.unarchive();
    this.projectsById.set(id, unarchived);
    return unarchived;
  }
}
