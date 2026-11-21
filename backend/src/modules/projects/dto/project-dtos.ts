import type { ProjectBoardBackgroundSummary } from "../domain/project-board-background";
import type { ProjectCoverSummary } from "../domain/project-cover";
import type { ProjectView } from "../service/projects-service";

export type PublicProjectCoverSummaryDto = {
  id: string;
  contentType: string;
};

export type PublicProjectBoardBackgroundSummaryDto = {
  id: string;
  contentType: string;
};

export type PublicProjectDto = {
  id: string;
  ownerUserId: string;
  name: string;
  description: string | null;
  createdAt: string;
  archivedAt: string | null;
  cover: PublicProjectCoverSummaryDto | null;
  boardBackground: PublicProjectBoardBackgroundSummaryDto | null;
};

export type ProjectListResponseDto = {
  projects: PublicProjectDto[];
};

export type CreateProjectRequestDto = {
  name: string;
  description: string | null;
};

export type UpdateProjectRequestDto = {
  name?: string;
  description?: string | null;
};

export type ProjectCoverResponseDto = {
  cover: PublicProjectCoverSummaryDto | null;
};

export type ProjectBoardBackgroundResponseDto = {
  boardBackground: PublicProjectBoardBackgroundSummaryDto | null;
};

export function toPublicProjectCoverSummaryDto(
  cover: ProjectCoverSummary | null,
): PublicProjectCoverSummaryDto | null {
  if (cover === null) {
    return null;
  }
  return {
    id: cover.id,
    contentType: cover.contentType,
  };
}

export function toPublicProjectBoardBackgroundSummaryDto(
  boardBackground: ProjectBoardBackgroundSummary | null,
): PublicProjectBoardBackgroundSummaryDto | null {
  if (boardBackground === null) {
    return null;
  }
  return {
    id: boardBackground.id,
    contentType: boardBackground.contentType,
  };
}

export function toPublicProjectDto(project: ProjectView): PublicProjectDto {
  return {
    id: project.id,
    ownerUserId: project.ownerUserId,
    name: project.name,
    description: project.description,
    createdAt: project.createdAt.toISOString(),
    archivedAt:
      project.archivedAt === null ? null : project.archivedAt.toISOString(),
    cover: toPublicProjectCoverSummaryDto(project.cover),
    boardBackground: toPublicProjectBoardBackgroundSummaryDto(
      project.boardBackground,
    ),
  };
}
