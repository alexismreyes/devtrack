import type {
  AddMemberRequestDto,
  CommentListResponseDto,
  CreateCommentRequestDto,
  CreateProjectRequestDto,
  CreateTaskRequestDto,
  DashboardProjectSummaryDto,
  DashboardSummaryResponseDto,
  ErrorEnvelope,
  HealthResponseDto,
  ListTasksQueryDto,
  LoginRequestDto,
  MemberListResponseDto,
  ProbeListResponseDto,
  ProbeResponseDto,
  ProjectListResponseDto,
  ProjectMemberRole,
  PublicCommentDto,
  PublicMemberDto,
  PublicProjectDto,
  PublicTaskDto,
  PublicUserDto,
  RegisterRequestDto,
  TaskListResponseDto,
  TaskPriority,
  TaskStatus,
  UpdateCommentRequestDto,
  UpdateMemberRequestDto,
  UpdateProfileRequestDto,
  UpdateProjectRequestDto,
  UpdateTaskRequestDto,
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

export function isConflict(err: unknown): boolean {
  return err instanceof ApiError && err.code === "CONFLICT";
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

export async function listTasks(
  projectId: string,
  query: ListTasksQueryDto = {},
): Promise<TaskListResponseDto> {
  const body = await request("GET", taskListPath(projectId, query));
  if (!isTaskListResponse(body)) {
    throw new ApiError(500, "INTERNAL_ERROR", "Unexpected task list response");
  }
  return {
    tasks: body.tasks.map(toPublicTask),
  };
}

export async function createTask(
  projectId: string,
  input: CreateTaskRequestDto,
): Promise<PublicTaskDto> {
  const body = await request("POST", `/api/projects/${projectId}/tasks`, input);
  return requirePublicTask(body, "Unexpected task response");
}

export async function getTask(id: string): Promise<PublicTaskDto> {
  const body = await request("GET", `/api/tasks/${id}`);
  return requirePublicTask(body, "Unexpected task response");
}

export async function updateTask(
  id: string,
  input: UpdateTaskRequestDto,
): Promise<PublicTaskDto> {
  const body = await request("PATCH", `/api/tasks/${id}`, input);
  return requirePublicTask(body, "Unexpected task response");
}

export async function softDeleteTask(id: string): Promise<void> {
  await request("DELETE", `/api/tasks/${id}`);
}

export async function listTaskComments(
  taskId: string,
): Promise<CommentListResponseDto> {
  const body = await request("GET", commentsCollectionPath(taskId));
  if (!isCommentListResponse(body)) {
    throw new ApiError(500, "INTERNAL_ERROR", "Unexpected comment list response");
  }
  return {
    comments: body.comments.map(toPublicComment),
  };
}

export async function createTaskComment(
  taskId: string,
  input: CreateCommentRequestDto,
): Promise<PublicCommentDto> {
  const body = await request("POST", commentsCollectionPath(taskId), input);
  return requirePublicComment(body, "Unexpected comment response");
}

export async function updateTaskComment(
  taskId: string,
  commentId: string,
  input: UpdateCommentRequestDto,
): Promise<PublicCommentDto> {
  const body = await request(
    "PATCH",
    commentItemPath(taskId, commentId),
    input,
  );
  return requirePublicComment(body, "Unexpected comment response");
}

export async function deleteTaskComment(
  taskId: string,
  commentId: string,
): Promise<void> {
  await request("DELETE", commentItemPath(taskId, commentId));
}

export async function getDashboard(): Promise<DashboardSummaryResponseDto> {
  const body = await request("GET", "/api/dashboard");
  if (!isDashboardSummaryResponse(body)) {
    throw new ApiError(500, "INTERNAL_ERROR", "Unexpected dashboard response");
  }
  return toDashboardSummary(body);
}

export async function listMembers(
  projectId: string,
): Promise<MemberListResponseDto> {
  const body = await request("GET", membersCollectionPath(projectId));
  if (!isMemberListResponse(body)) {
    throw new ApiError(500, "INTERNAL_ERROR", "Unexpected member list response");
  }
  return {
    members: body.members.map(toPublicMember),
  };
}

export async function addMember(
  projectId: string,
  input: AddMemberRequestDto,
): Promise<PublicMemberDto> {
  const body = await request("POST", membersCollectionPath(projectId), input);
  return requirePublicMember(body, "Unexpected member response");
}

export async function updateMember(
  projectId: string,
  userId: string,
  input: UpdateMemberRequestDto,
): Promise<PublicMemberDto> {
  const body = await request("PATCH", memberItemPath(projectId, userId), input);
  return requirePublicMember(body, "Unexpected member response");
}

export async function removeMember(
  projectId: string,
  userId: string,
): Promise<void> {
  await request("DELETE", memberItemPath(projectId, userId));
}

async function request(
  method: "GET" | "POST" | "PATCH" | "DELETE",
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

function taskListPath(projectId: string, query: ListTasksQueryDto): string {
  const params = new URLSearchParams();
  if (query.status !== undefined) {
    params.set("status", query.status);
  }
  if (query.priority !== undefined) {
    params.set("priority", query.priority);
  }
  const encoded = params.toString();
  const base = `/api/projects/${projectId}/tasks`;
  return encoded === "" ? base : `${base}?${encoded}`;
}

function requirePublicTask(value: unknown, message: string): PublicTaskDto {
  if (!isPublicTask(value)) {
    throw new ApiError(500, "INTERNAL_ERROR", message);
  }
  return toPublicTask(value);
}

function toPublicTask(value: PublicTaskDto): PublicTaskDto {
  return {
    id: value.id,
    projectId: value.projectId,
    title: value.title,
    description: value.description,
    status: value.status,
    priority: value.priority,
    dueDate: value.dueDate,
    createdAt: value.createdAt,
  };
}

function isTaskStatus(value: unknown): value is TaskStatus {
  return value === "TODO" || value === "IN_PROGRESS" || value === "DONE";
}

function isTaskPriority(value: unknown): value is TaskPriority {
  return value === "LOW" || value === "MEDIUM" || value === "HIGH";
}

function isPublicTask(value: unknown): value is PublicTaskDto {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const task = value as {
    id?: unknown;
    projectId?: unknown;
    title?: unknown;
    description?: unknown;
    status?: unknown;
    priority?: unknown;
    dueDate?: unknown;
    createdAt?: unknown;
  };
  return (
    typeof task.id === "string" &&
    typeof task.projectId === "string" &&
    typeof task.title === "string" &&
    (typeof task.description === "string" || task.description === null) &&
    isTaskStatus(task.status) &&
    isTaskPriority(task.priority) &&
    (typeof task.dueDate === "string" || task.dueDate === null) &&
    typeof task.createdAt === "string"
  );
}

function isTaskListResponse(value: unknown): value is TaskListResponseDto {
  if (typeof value !== "object" || value === null || !("tasks" in value)) {
    return false;
  }
  const tasks = (value as { tasks: unknown }).tasks;
  return Array.isArray(tasks) && tasks.every(isPublicTask);
}

function toDashboardSummary(
  value: DashboardSummaryResponseDto,
): DashboardSummaryResponseDto {
  return {
    projectCount: value.projectCount,
    taskCount: value.taskCount,
    pendingCount: value.pendingCount,
    completedCount: value.completedCount,
    overdueCount: value.overdueCount,
    projects: value.projects.map(toDashboardProjectSummary),
  };
}

function toDashboardProjectSummary(
  value: DashboardProjectSummaryDto,
): DashboardProjectSummaryDto {
  return {
    id: value.id,
    name: value.name,
    taskCount: value.taskCount,
    pendingCount: value.pendingCount,
    completedCount: value.completedCount,
    overdueCount: value.overdueCount,
  };
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isDashboardProjectSummary(
  value: unknown,
): value is DashboardProjectSummaryDto {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const project = value as {
    id?: unknown;
    name?: unknown;
    taskCount?: unknown;
    pendingCount?: unknown;
    completedCount?: unknown;
    overdueCount?: unknown;
  };
  return (
    typeof project.id === "string" &&
    typeof project.name === "string" &&
    isNonNegativeInteger(project.taskCount) &&
    isNonNegativeInteger(project.pendingCount) &&
    isNonNegativeInteger(project.completedCount) &&
    isNonNegativeInteger(project.overdueCount)
  );
}

function isDashboardSummaryResponse(
  value: unknown,
): value is DashboardSummaryResponseDto {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const summary = value as {
    projectCount?: unknown;
    taskCount?: unknown;
    pendingCount?: unknown;
    completedCount?: unknown;
    overdueCount?: unknown;
    projects?: unknown;
  };
  return (
    isNonNegativeInteger(summary.projectCount) &&
    isNonNegativeInteger(summary.taskCount) &&
    isNonNegativeInteger(summary.pendingCount) &&
    isNonNegativeInteger(summary.completedCount) &&
    isNonNegativeInteger(summary.overdueCount) &&
    Array.isArray(summary.projects) &&
    summary.projects.every(isDashboardProjectSummary)
  );
}

function membersCollectionPath(projectId: string): string {
  return `/api/projects/${projectId}/members`;
}

function memberItemPath(projectId: string, userId: string): string {
  return `${membersCollectionPath(projectId)}/${userId}`;
}

function requirePublicMember(value: unknown, message: string): PublicMemberDto {
  if (!isPublicMember(value)) {
    throw new ApiError(500, "INTERNAL_ERROR", message);
  }
  return toPublicMember(value);
}

function toPublicMember(value: PublicMemberDto): PublicMemberDto {
  return {
    id: value.id,
    userId: value.userId,
    email: value.email,
    displayName: value.displayName,
    role: value.role,
    createdAt: value.createdAt,
  };
}

function isProjectMemberRole(value: unknown): value is ProjectMemberRole {
  return value === "OWNER" || value === "EDITOR" || value === "VIEWER";
}

function isPublicMember(value: unknown): value is PublicMemberDto {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const member = value as {
    id?: unknown;
    userId?: unknown;
    email?: unknown;
    displayName?: unknown;
    role?: unknown;
    createdAt?: unknown;
  };
  return (
    typeof member.id === "string" &&
    typeof member.userId === "string" &&
    typeof member.email === "string" &&
    typeof member.displayName === "string" &&
    isProjectMemberRole(member.role) &&
    typeof member.createdAt === "string"
  );
}

function isMemberListResponse(value: unknown): value is MemberListResponseDto {
  if (typeof value !== "object" || value === null || !("members" in value)) {
    return false;
  }
  const members = (value as { members: unknown }).members;
  return Array.isArray(members) && members.every(isPublicMember);
}

function commentsCollectionPath(taskId: string): string {
  return `/api/tasks/${taskId}/comments`;
}

function commentItemPath(taskId: string, commentId: string): string {
  return `${commentsCollectionPath(taskId)}/${commentId}`;
}

function requirePublicComment(
  value: unknown,
  message: string,
): PublicCommentDto {
  if (!isPublicComment(value)) {
    throw new ApiError(500, "INTERNAL_ERROR", message);
  }
  return toPublicComment(value);
}

function toPublicComment(value: PublicCommentDto): PublicCommentDto {
  return {
    id: value.id,
    taskId: value.taskId,
    authorUserId: value.authorUserId,
    authorDisplayName: value.authorDisplayName,
    body: value.body,
    createdAt: value.createdAt,
  };
}

function isPublicComment(value: unknown): value is PublicCommentDto {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const comment = value as {
    id?: unknown;
    taskId?: unknown;
    authorUserId?: unknown;
    authorDisplayName?: unknown;
    body?: unknown;
    createdAt?: unknown;
  };
  return (
    typeof comment.id === "string" &&
    typeof comment.taskId === "string" &&
    typeof comment.authorUserId === "string" &&
    typeof comment.authorDisplayName === "string" &&
    typeof comment.body === "string" &&
    typeof comment.createdAt === "string"
  );
}

function isCommentListResponse(
  value: unknown,
): value is CommentListResponseDto {
  if (typeof value !== "object" || value === null || !("comments" in value)) {
    return false;
  }
  const comments = (value as { comments: unknown }).comments;
  return Array.isArray(comments) && comments.every(isPublicComment);
}
