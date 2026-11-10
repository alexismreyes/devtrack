import type { ProjectMembershipQueryPort } from "../access/project-membership-port";
import type { UnitOfWork } from "../access/unit-of-work";
import {
  ProjectArchivedError,
  ProjectCoverNotFoundError,
  ProjectCoverStorageError,
  ProjectNotFoundError,
} from "../domain/errors";
import {
  ProjectCover,
  resolveProjectCoverContentType,
  toProjectCoverSummary,
  type ProjectCoverContentType,
  type ProjectCoverSummary,
} from "../domain/project-cover";
import type { ProjectCoversRepository } from "../repository/project-covers-repository";
import type { ProjectsRepository } from "../repository/projects-repository";
import type { ProjectCoverStoragePort } from "../storage/project-cover-storage-port";

export type ProjectCoverContentView = {
  bytes: Uint8Array;
  contentType: ProjectCoverContentType;
  originalFilename: string;
  sizeBytes: number;
};

export type UploadProjectCoverCommand = {
  originalFilename: string;
  clientContentType: string | undefined;
  bytes: Uint8Array;
};

export class ProjectCoversService {
  constructor(
    private readonly covers: ProjectCoversRepository,
    private readonly projects: ProjectsRepository,
    private readonly membership: ProjectMembershipQueryPort,
    private readonly storage: ProjectCoverStoragePort,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  async upload(
    actorId: string,
    projectId: string,
    command: UploadProjectCoverCommand,
  ): Promise<ProjectCoverSummary> {
    const project = await this.requireWritableProject(actorId, projectId);

    const contentType = resolveProjectCoverContentType(
      command.bytes,
      command.clientContentType,
    );
    const cover = ProjectCover.create({
      projectId: project.id,
      uploadedByUserId: actorId,
      originalFilename: command.originalFilename,
      contentType,
      sizeBytes: command.bytes.byteLength,
    });

    // Prefer write blob then replace metadata; compensate new blob on DB failure.
    await this.storage.write(cover.storageKey, command.bytes);
    try {
      const { saved, previous } = await this.unitOfWork.run(async () =>
        this.covers.replaceForProject(project.id, cover),
      );
      if (previous !== null) {
        try {
          await this.storage.delete(previous.storageKey);
        } catch {
          // Metadata already points at new blob; orphan prior blob is acceptable.
        }
      }
      return toProjectCoverSummary(saved);
    } catch (err) {
      try {
        await this.storage.delete(cover.storageKey);
      } catch {
        // Best-effort compensation; surface original failure.
      }
      throw err;
    }
  }

  async clear(actorId: string, projectId: string): Promise<void> {
    await this.requireWritableProject(actorId, projectId);

    const deleted = await this.unitOfWork.run(async () =>
      this.covers.deleteByProjectId(projectId),
    );
    if (deleted === null) {
      return;
    }
    try {
      await this.storage.delete(deleted.storageKey);
    } catch {
      // Metadata already removed; orphan blob is acceptable without GC.
    }
  }

  async getContent(
    actorId: string,
    projectId: string,
  ): Promise<ProjectCoverContentView> {
    await this.requireReadableProject(actorId, projectId);
    const cover = await this.covers.findByProjectId(projectId);
    if (cover === null) {
      throw new ProjectCoverNotFoundError();
    }
    try {
      const bytes = await this.storage.read(cover.storageKey);
      return {
        bytes,
        contentType: cover.contentType,
        originalFilename: cover.originalFilename,
        sizeBytes: cover.sizeBytes,
      };
    } catch (err) {
      if (err instanceof ProjectCoverStorageError) {
        throw new ProjectCoverNotFoundError();
      }
      throw err;
    }
  }

  async getSummary(
    actorId: string,
    projectId: string,
  ): Promise<ProjectCoverSummary | null> {
    await this.requireReadableProject(actorId, projectId);
    const cover = await this.covers.findByProjectId(projectId);
    return cover === null ? null : toProjectCoverSummary(cover);
  }

  private async requireReadableProject(
    actorId: string,
    projectId: string,
  ) {
    const project = await this.requireProject(projectId);
    await this.membership.assertAuthorized(
      actorId,
      {
        id: project.id,
        ownerUserId: project.ownerUserId,
        archivedAt: project.archivedAt,
      },
      "read_project",
    );
    return project;
  }

  private async requireWritableProject(
    actorId: string,
    projectId: string,
  ) {
    const project = await this.requireProject(projectId);
    await this.membership.assertAuthorized(
      actorId,
      {
        id: project.id,
        ownerUserId: project.ownerUserId,
        archivedAt: project.archivedAt,
      },
      "patch_project",
    );
    if (project.archivedAt !== null) {
      throw new ProjectArchivedError();
    }
    return project;
  }

  private async requireProject(projectId: string) {
    const project = await this.projects.findById(projectId);
    if (project === null) {
      throw new ProjectNotFoundError();
    }
    return project;
  }
}
