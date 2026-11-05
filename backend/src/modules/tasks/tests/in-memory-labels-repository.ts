import {
  DuplicateLabelNameError,
  LabelNotFoundError,
} from "../domain/errors";
import { ProjectLabel, sortLabelsByNameAsc } from "../domain/project-label";
import type {
  CreateLabelInput,
  LabelsRepository,
  UpdateLabelInput,
} from "../repository/labels-repository";

export class InMemoryLabelsRepository implements LabelsRepository {
  readonly labelsById = new Map<string, ProjectLabel>();

  async create(input: CreateLabelInput): Promise<ProjectLabel> {
    const label = ProjectLabel.create(
      input.projectId,
      input.name,
      input.color,
    );
    this.assertNameAvailable(label.projectId, label.nameKey);
    this.labelsById.set(label.id, label);
    return label;
  }

  async findByIdInProject(
    projectId: string,
    labelId: string,
  ): Promise<ProjectLabel | null> {
    const label = this.labelsById.get(labelId) ?? null;
    if (label === null || label.projectId !== projectId) {
      return null;
    }
    return label;
  }

  async findByIdsInProject(
    projectId: string,
    labelIds: string[],
  ): Promise<ProjectLabel[]> {
    const found: ProjectLabel[] = [];
    for (const id of labelIds) {
      const label = await this.findByIdInProject(projectId, id);
      if (label !== null) {
        found.push(label);
      }
    }
    return found;
  }

  async listByProjectId(projectId: string): Promise<ProjectLabel[]> {
    return sortLabelsByNameAsc(
      [...this.labelsById.values()].filter(
        (label) => label.projectId === projectId,
      ),
    );
  }

  async update(id: string, input: UpdateLabelInput): Promise<ProjectLabel> {
    const existing = this.labelsById.get(id);
    if (existing === undefined) {
      throw new LabelNotFoundError();
    }
    const updated = existing.withDetails(input);
    if (updated.nameKey !== existing.nameKey) {
      this.assertNameAvailable(updated.projectId, updated.nameKey, id);
    }
    this.labelsById.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    if (!this.labelsById.has(id)) {
      throw new LabelNotFoundError();
    }
    this.labelsById.delete(id);
  }

  private assertNameAvailable(
    projectId: string,
    nameKey: string,
    excludingId?: string,
  ): void {
    for (const label of this.labelsById.values()) {
      if (
        label.projectId === projectId &&
        label.nameKey === nameKey &&
        label.id !== excludingId
      ) {
        throw new DuplicateLabelNameError();
      }
    }
  }
}
