import type {
  CreateProjectRequestDto,
  ErrorEnvelope,
  HealthResponseDto,
  LoginRequestDto,
  ProbeListResponseDto,
  ProbeResponseDto,
  ProjectListResponseDto,
  PublicProjectDto,
  PublicUserDto,
  RegisterRequestDto,
  UpdateProfileRequestDto,
  UpdateProjectRequestDto,
} from "./types";

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export function getApiBaseUrl(): string {
  const value = import.meta.env.VITE_API_URL;
  if (typeof value !== "string" || value.trim() === "") {
    throw new ApiError(
      500,
      "INTERNAL_ERROR",
      "VITE_API_URL is not configured",
    );
  }
  return value.replace(/\/$/, "");
}

export function toUserMessage(err: unknown): string {
  if (err instanceof ApiError) {
    return err.message;
  }
  if (err instanceof Error && /failed to fetch|networkerror|load failed/i.test(err.message)) {
    return "Could not reach the API";
  }
  if (err instanceof Error && err.message.trim() !== "") {
    return err.message;
  }
  return "Could not reach the API";
}

export function isUnauthenticated(err: unknown): boolean {
  return err instanceof ApiError && err.code === "UNAUTHENTICATED";
}

export function isForbidden(err: unknown): boolean {
  return err instanceof ApiError && err.code === "FORBIDDEN";
}

export async function getHealth(): Promise<HealthResponseDto> {
  const body = await request("GET", "/health");
  if (!isHealthResponse(body)) {
    throw new ApiError(500, "INTERNAL_ERROR", "Unexpected health response");
  }
  return body;
}

export async function listProbes(): Promise<ProbeListResponseDto> {
  const body = await request("GET", "/api/system/probes");
  if (!isProbeListResponse(body)) {
    throw new ApiError(500, "INTERNAL_ERROR", "Unexpected probe list response");
  }
  return body;
}

export async function createProbe(): Promise<ProbeResponseDto> {
  const body = await request("POST", "/api/system/probes", {});
  if (!isProbeResponse(body)) {
    throw new ApiError(500, "INTERNAL_ERROR", "Unexpected probe response");
  }
  return body;
}

export async function register(input: RegisterRequestDto): Promise<PublicUserDto> {
  const body = await request("POST", "/api/auth/register", input);
  return requirePublicUser(body, "Unexpected register response");
}

export async function login(input: LoginRequestDto): Promise<PublicUserDto> {
  const body = await request("POST", "/api/auth/login", input);
  return requirePublicUser(body, "Unexpected login response");
}

export async function logout(): Promise<void> {
  await request("POST", "/api/auth/logout");
}

export async function getProfile(): Promise<PublicUserDto> {
  const body = await request("GET", "/api/users/me");
  return requirePublicUser(body, "Unexpected profile response");
}

export async function updateProfile(
  input: UpdateProfileRequestDto,
): Promise<PublicUserDto> {
  const body = await request("PATCH", "/api/users/me", input);
  return requirePublicUser(body, "Unexpected profile response");
}

export async function listProjects(): Promise<ProjectListResponseDto> {
  const body = await request("GET", "/api/projects");
  if (!isProjectListResponse(body)) {
    throw new ApiError(500, "INTERNAL_ERROR", "Unexpected project list response");
  }
  return {
    projects: body.projects.map(toPublicProject),
  };
}

export async function getProject(id: string): Promise<PublicProjectDto> {
  const body = await request("GET", `/api/projects/${id}`);
  return requirePublicProject(body, "Unexpected project response");
}

export async function createProject(
  input: CreateProjectRequestDto,
): Promise<PublicProjectDto> {
  const body = await request("POST", "/api/projects", input);
  return requirePublicProject(body, "Unexpected project response");
}

export async function updateProject(
  id: string,
  input: UpdateProjectRequestDto,
): Promise<PublicProjectDto> {
  const body = await request("PATCH", `/api/projects/${id}`, input);
  return requirePublicProject(body, "Unexpected project response");
}

export async function archiveProject(id: string): Promise<PublicProjectDto> {
  const body = await request("POST", `/api/projects/${id}/archive`, {});
  return requirePublicProject(body, "Unexpected project response");
}

export async function unarchiveProject(id: string): Promise<PublicProjectDto> {
  const body = await request("POST", `/api/projects/${id}/unarchive`, {});
  return requirePublicProject(body, "Unexpected project response");
}

async function request(
  method: "GET" | "POST" | "PATCH",
  path: string,
  jsonBody?: object,
): Promise<unknown> {
  const url = `${getApiBaseUrl()}${path}`;
  let response: Response;
  try {
    response = await fetch(url, {
      method,
      credentials: "include",
      headers:
        jsonBody === undefined
          ? { Accept: "application/json" }
          : {
              Accept: "application/json",
              "Content-Type": "application/json",
            },
      body: jsonBody === undefined ? undefined : JSON.stringify(jsonBody),
    });
  } catch (err) {
    throw new ApiError(0, "INTERNAL_ERROR", toUserMessage(err));
  }

  const parsed = await parseJson(response);
  if (!response.ok) {
    if (isErrorEnvelope(parsed)) {
      throw new ApiError(
        response.status,
        parsed.error.code,
        parsed.error.message,
      );
    }
    throw new ApiError(
      response.status,
      "INTERNAL_ERROR",
      "Request failed",
    );
  }
  return parsed;
}

async function parseJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (text.trim() === "") {
    return undefined;
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new ApiError(response.status, "INTERNAL_ERROR", "Invalid JSON response");
  }
}

function requirePublicUser(value: unknown, message: string): PublicUserDto {
  if (!isPublicUser(value)) {
    throw new ApiError(500, "INTERNAL_ERROR", message);
  }
  return {
    id: value.id,
    email: value.email,
    displayName: value.displayName,
  };
}

function isErrorEnvelope(value: unknown): value is ErrorEnvelope {
  if (typeof value !== "object" || value === null || !("error" in value)) {
    return false;
  }
  const error = (value as { error: unknown }).error;
  return (
    typeof error === "object" &&
    error !== null &&
    typeof (error as { code?: unknown }).code === "string" &&
    typeof (error as { message?: unknown }).message === "string"
  );
}

function isPublicUser(value: unknown): value is PublicUserDto {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { id?: unknown }).id === "string" &&
    typeof (value as { email?: unknown }).email === "string" &&
    typeof (value as { displayName?: unknown }).displayName === "string"
  );
}

function isProbeResponse(value: unknown): value is ProbeResponseDto {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { id?: unknown }).id === "string" &&
    typeof (value as { recordedAt?: unknown }).recordedAt === "string"
  );
}

function isProbeListResponse(value: unknown): value is ProbeListResponseDto {
  if (typeof value !== "object" || value === null || !("probes" in value)) {
    return false;
  }
  const probes = (value as { probes: unknown }).probes;
  return Array.isArray(probes) && probes.every(isProbeResponse);
}

function isHealthResponse(value: unknown): value is HealthResponseDto {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { status?: unknown }).status === "ok"
  );
}

function requirePublicProject(value: unknown, message: string): PublicProjectDto {
  if (!isPublicProject(value)) {
    throw new ApiError(500, "INTERNAL_ERROR", message);
  }
  return toPublicProject(value);
}

function toPublicProject(value: PublicProjectDto): PublicProjectDto {
  return {
    id: value.id,
    ownerUserId: value.ownerUserId,
    name: value.name,
    description: value.description,
    createdAt: value.createdAt,
    archivedAt: value.archivedAt,
  };
}

function isPublicProject(value: unknown): value is PublicProjectDto {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const project = value as {
    id?: unknown;
    ownerUserId?: unknown;
    name?: unknown;
    description?: unknown;
    createdAt?: unknown;
    archivedAt?: unknown;
  };
  return (
    typeof project.id === "string" &&
    typeof project.ownerUserId === "string" &&
    typeof project.name === "string" &&
    (typeof project.description === "string" || project.description === null) &&
    typeof project.createdAt === "string" &&
    (typeof project.archivedAt === "string" || project.archivedAt === null)
  );
}

function isProjectListResponse(value: unknown): value is ProjectListResponseDto {
  if (typeof value !== "object" || value === null || !("projects" in value)) {
    return false;
  }
  const projects = (value as { projects: unknown }).projects;
  return Array.isArray(projects) && projects.every(isPublicProject);
}
