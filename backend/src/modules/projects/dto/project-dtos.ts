export type PublicProjectDto = {
  id: string;
  ownerUserId: string;
  name: string;
  description: string | null;
  createdAt: string;
  archivedAt: string | null;
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

export function toPublicProjectDto(project: {
  id: string;
  ownerUserId: string;
  name: string;
  description: string | null;
  createdAt: Date;
  archivedAt: Date | null;
}): PublicProjectDto {
  return {
    id: project.id,
    ownerUserId: project.ownerUserId,
    name: project.name,
    description: project.description,
    createdAt: project.createdAt.toISOString(),
    archivedAt: project.archivedAt === null ? null : project.archivedAt.toISOString(),
  };
}
