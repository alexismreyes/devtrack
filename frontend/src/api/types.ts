export type ProbeResponseDto = {
  id: string;
  recordedAt: string;
};

export type ProbeListResponseDto = {
  probes: ProbeResponseDto[];
};

export type HealthResponseDto = {
  status: "ok";
};

export type PublicUserDto = {
  id: string;
  email: string;
  displayName: string;
};

export type RegisterRequestDto = {
  email: string;
  password: string;
  displayName: string;
};

export type LoginRequestDto = {
  email: string;
  password: string;
};

export type UpdateProfileRequestDto = {
  displayName: string;
};

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
  description?: string | null;
};

export type UpdateProjectRequestDto = {
  name?: string;
  description?: string | null;
};

export type ErrorEnvelope = {
  error: {
    code: string;
    message: string;
  };
};
