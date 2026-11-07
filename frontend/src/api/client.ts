import type {
  ActivityListResponseDto,
  AddMemberRequestDto,
  AttachmentAddedActivityPayload,
  AttachmentListResponseDto,
  AttachmentRemovedActivityPayload,
  ChecklistAddedActivityPayload,
  ChecklistItemCompletedActivityPayload,
  ChecklistItemUncompletedActivityPayload,
  ChecklistListResponseDto,
  ChecklistRemovedActivityPayload,
  CommentAddedActivityPayload,
  CommentListResponseDto,
  CoverChangedActivityPayload,
  CoverResponseDto,
  CreateChecklistItemRequestDto,
  CreateChecklistRequestDto,
  CreateCommentRequestDto,
  CreateLabelRequestDto,
  CreateProjectRequestDto,
  CreateStatusRequestDto,
  CreateTaskRequestDto,
  DashboardProjectSummaryDto,
  DashboardSummaryResponseDto,
  ErrorEnvelope,
  HealthResponseDto,
  LabelColor,
  LabelListResponseDto,
  ListTasksQueryDto,
  LoginRequestDto,
  MemberListResponseDto,
  ProbeListResponseDto,
  ProbeResponseDto,
  ProjectListResponseDto,
  ProjectMemberRole,
  PublicActivityDto,
  PublicAttachmentDto,
  PublicChecklistDto,
  PublicChecklistItemDto,
  PublicCommentDto,
  PublicCoverSummaryDto,
  PublicLabelDto,
  PublicMemberDto,
  PublicProjectDto,
  PublicProjectStatusDto,
  PublicTaskDto,
  PublicUserDto,
  RegisterRequestDto,
  ReorderStatusesRequestDto,
  ReplaceTaskLabelsRequestDto,
  SetCoverRequestDto,
  StatusListResponseDto,
  TaskActivityChangeField,
  TaskActivityFieldChange,
  TaskActivityKind,
  TaskActivityPayload,
  TaskEmbeddedLabelDto,
  TaskFieldsChangedActivityPayload,
  TaskLabelsResponseDto,
  TaskListResponseDto,
  TaskPriority,
  TaskStatus,
  UpdateChecklistItemRequestDto,
  UpdateChecklistRequestDto,
  UpdateCommentRequestDto,
  UpdateLabelRequestDto,
  UpdateMemberRequestDto,
  UpdateProfileRequestDto,
  UpdateProjectRequestDto,
  UpdateStatusRequestDto,
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

export async function listLabels(
  projectId: string,
): Promise<LabelListResponseDto> {
  const body = await request("GET", labelsCollectionPath(projectId));
  if (!isLabelListResponse(body)) {
    throw new ApiError(500, "INTERNAL_ERROR", "Unexpected label list response");
  }
  return {
    labels: body.labels.map(toPublicLabel),
  };
}

export async function createLabel(
  projectId: string,
  input: CreateLabelRequestDto,
): Promise<PublicLabelDto> {
  const body = await request("POST", labelsCollectionPath(projectId), input);
  return requirePublicLabel(body, "Unexpected label response");
}

export async function updateLabel(
  projectId: string,
  labelId: string,
  input: UpdateLabelRequestDto,
): Promise<PublicLabelDto> {
  const body = await request(
    "PATCH",
    labelItemPath(projectId, labelId),
    input,
  );
  return requirePublicLabel(body, "Unexpected label response");
}

export async function deleteLabel(
  projectId: string,
  labelId: string,
): Promise<void> {
  await request("DELETE", labelItemPath(projectId, labelId));
}

export async function replaceTaskLabels(
  taskId: string,
  input: ReplaceTaskLabelsRequestDto,
): Promise<TaskLabelsResponseDto> {
  const body = await request("PUT", taskLabelsPath(taskId), input);
  if (!isTaskLabelsResponse(body)) {
    throw new ApiError(
      500,
      "INTERNAL_ERROR",
      "Unexpected task labels response",
    );
  }
  return {
    labels: body.labels.map(toPublicLabel),
  };
}

export async function listStatuses(
  projectId: string,
): Promise<StatusListResponseDto> {
  const body = await request("GET", statusesCollectionPath(projectId));
  if (!isStatusListResponse(body)) {
    throw new ApiError(
      500,
      "INTERNAL_ERROR",
      "Unexpected status list response",
    );
  }
  return {
    statuses: body.statuses.map(toPublicProjectStatus),
  };
}

export async function createStatus(
  projectId: string,
  input: CreateStatusRequestDto,
): Promise<PublicProjectStatusDto> {
  const body = await request("POST", statusesCollectionPath(projectId), input);
  return requirePublicProjectStatus(body, "Unexpected status response");
}

export async function updateStatus(
  projectId: string,
  statusId: string,
  input: UpdateStatusRequestDto,
): Promise<PublicProjectStatusDto> {
  const body = await request(
    "PATCH",
    statusItemPath(projectId, statusId),
    input,
  );
  return requirePublicProjectStatus(body, "Unexpected status response");
}

export async function deleteStatus(
  projectId: string,
  statusId: string,
): Promise<void> {
  await request("DELETE", statusItemPath(projectId, statusId));
}

export async function reorderStatuses(
  projectId: string,
  input: ReorderStatusesRequestDto,
): Promise<StatusListResponseDto> {
  const body = await request(
    "PUT",
    statusesReorderPath(projectId),
    input,
  );
  if (!isStatusListResponse(body)) {
    throw new ApiError(
      500,
      "INTERNAL_ERROR",
      "Unexpected status reorder response",
    );
  }
  return {
    statuses: body.statuses.map(toPublicProjectStatus),
  };
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

export async function listTaskActivity(
  taskId: string,
): Promise<ActivityListResponseDto> {
  const body = await request("GET", activityCollectionPath(taskId));
  if (!isActivityListResponse(body)) {
    throw new ApiError(
      500,
      "INTERNAL_ERROR",
      "Unexpected activity list response",
    );
  }
  return {
    activity: body.activity.map(toPublicActivity),
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

export async function listTaskChecklists(
  taskId: string,
): Promise<ChecklistListResponseDto> {
  const body = await request("GET", checklistsCollectionPath(taskId));
  if (!isChecklistListResponse(body)) {
    throw new ApiError(
      500,
      "INTERNAL_ERROR",
      "Unexpected checklist list response",
    );
  }
  return {
    checklists: body.checklists.map(toPublicChecklist),
  };
}

export async function createTaskChecklist(
  taskId: string,
  input: CreateChecklistRequestDto,
): Promise<PublicChecklistDto> {
  const body = await request("POST", checklistsCollectionPath(taskId), input);
  return requirePublicChecklist(body, "Unexpected checklist response");
}

export async function updateTaskChecklist(
  taskId: string,
  checklistId: string,
  input: UpdateChecklistRequestDto,
): Promise<PublicChecklistDto> {
  const body = await request(
    "PATCH",
    checklistItemPath(taskId, checklistId),
    input,
  );
  return requirePublicChecklist(body, "Unexpected checklist response");
}

export async function deleteTaskChecklist(
  taskId: string,
  checklistId: string,
): Promise<void> {
  await request("DELETE", checklistItemPath(taskId, checklistId));
}

export async function createTaskChecklistItem(
  taskId: string,
  checklistId: string,
  input: CreateChecklistItemRequestDto,
): Promise<PublicChecklistItemDto> {
  const body = await request(
    "POST",
    checklistItemsCollectionPath(taskId, checklistId),
    input,
  );
  return requirePublicChecklistItem(body, "Unexpected checklist item response");
}

export async function updateTaskChecklistItem(
  taskId: string,
  checklistId: string,
  itemId: string,
  input: UpdateChecklistItemRequestDto,
): Promise<PublicChecklistItemDto> {
  const body = await request(
    "PATCH",
    checklistItemItemPath(taskId, checklistId, itemId),
    input,
  );
  return requirePublicChecklistItem(body, "Unexpected checklist item response");
}

export async function deleteTaskChecklistItem(
  taskId: string,
  checklistId: string,
  itemId: string,
): Promise<void> {
  await request(
    "DELETE",
    checklistItemItemPath(taskId, checklistId, itemId),
  );
}

export async function listTaskAttachments(
  taskId: string,
): Promise<AttachmentListResponseDto> {
  const body = await request("GET", attachmentsCollectionPath(taskId));
  if (!isAttachmentListResponse(body)) {
    throw new ApiError(
      500,
      "INTERNAL_ERROR",
      "Unexpected attachment list response",
    );
  }
  return {
    attachments: body.attachments.map(toPublicAttachment),
  };
}

export async function uploadTaskAttachment(
  taskId: string,
  file: File,
): Promise<PublicAttachmentDto> {
  const form = new FormData();
  form.append("file", file);
  const body = await requestMultipart(
    "POST",
    attachmentsCollectionPath(taskId),
    form,
  );
  return requirePublicAttachment(body, "Unexpected attachment response");
}

export async function deleteTaskAttachment(
  taskId: string,
  attachmentId: string,
): Promise<void> {
  await request("DELETE", attachmentItemPath(taskId, attachmentId));
}

export function attachmentContentUrl(
  taskId: string,
  attachmentId: string,
): string {
  return `${getApiBaseUrl()}${attachmentContentPath(taskId, attachmentId)}`;
}

export async function fetchAttachmentContent(
  taskId: string,
  attachmentId: string,
): Promise<{ blob: Blob; contentType: string }> {
  const url = attachmentContentUrl(taskId, attachmentId);
  let response: Response;
  try {
    response = await fetch(url, {
      method: "GET",
      credentials: "include",
      headers: { Accept: "*/*" },
    });
  } catch (err) {
    throw new ApiError(0, "INTERNAL_ERROR", toUserMessage(err));
  }

  if (!response.ok) {
    const parsed = await parseJson(response);
    if (isErrorEnvelope(parsed)) {
      throw new ApiError(
        response.status,
        parsed.error.code,
        parsed.error.message,
      );
    }
    throw new ApiError(response.status, "INTERNAL_ERROR", "Request failed");
  }

  const contentTypeHeader = response.headers.get("Content-Type");
  const contentType =
    contentTypeHeader === null || contentTypeHeader.trim() === ""
      ? "application/octet-stream"
      : contentTypeHeader.split(";")[0]!.trim();
  const blob = await response.blob();
  return { blob, contentType };
}

export async function setTaskCover(
  taskId: string,
  input: SetCoverRequestDto,
): Promise<CoverResponseDto> {
  const body = await request("PUT", taskCoverPath(taskId), input);
  if (!isCoverResponse(body)) {
    throw new ApiError(500, "INTERNAL_ERROR", "Unexpected cover response");
  }
  return {
    cover: body.cover === null ? null : toPublicCoverSummary(body.cover),
  };
}

export async function clearTaskCover(taskId: string): Promise<CoverResponseDto> {
  const body = await request("DELETE", taskCoverPath(taskId));
  if (!isCoverResponse(body)) {
    throw new ApiError(500, "INTERNAL_ERROR", "Unexpected cover response");
  }
  return {
    cover: body.cover === null ? null : toPublicCoverSummary(body.cover),
  };
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
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
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

async function requestMultipart(
  method: "POST",
  path: string,
  form: FormData,
): Promise<unknown> {
  const url = `${getApiBaseUrl()}${path}`;
  let response: Response;
  try {
    response = await fetch(url, {
      method,
      credentials: "include",
      headers: { Accept: "application/json" },
      body: form,
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
    throw new ApiError(response.status, "INTERNAL_ERROR", "Request failed");
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
  if (query.labelId !== undefined) {
    params.set("labelId", query.labelId);
  }
  const encoded = params.toString();
  const base = `/api/projects/${projectId}/tasks`;
  return encoded === "" ? base : `${base}?${encoded}`;
}

function labelsCollectionPath(projectId: string): string {
  return `/api/projects/${projectId}/labels`;
}

function labelItemPath(projectId: string, labelId: string): string {
  return `${labelsCollectionPath(projectId)}/${labelId}`;
}

function taskLabelsPath(taskId: string): string {
  return `/api/tasks/${taskId}/labels`;
}

function statusesCollectionPath(projectId: string): string {
  return `/api/projects/${projectId}/statuses`;
}

function statusItemPath(projectId: string, statusId: string): string {
  return `${statusesCollectionPath(projectId)}/${statusId}`;
}

function statusesReorderPath(projectId: string): string {
  return `${statusesCollectionPath(projectId)}/reorder`;
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
    labels: value.labels.map(toTaskEmbeddedLabel),
    cover:
      value.cover === null ? null : toPublicCoverSummary(value.cover),
  };
}

function toPublicCoverSummary(
  value: PublicCoverSummaryDto,
): PublicCoverSummaryDto {
  return {
    attachmentId: value.attachmentId,
    contentType: value.contentType,
  };
}

function isPublicCoverSummary(
  value: unknown,
): value is PublicCoverSummaryDto {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const cover = value as {
    attachmentId?: unknown;
    contentType?: unknown;
  };
  return (
    typeof cover.attachmentId === "string" &&
    typeof cover.contentType === "string"
  );
}

function isTaskStatus(value: unknown): value is TaskStatus {
  return typeof value === "string" && value.length > 0;
}

function isTaskPriority(value: unknown): value is TaskPriority {
  return value === "LOW" || value === "MEDIUM" || value === "HIGH";
}

function isLabelColor(value: unknown): value is LabelColor {
  return (
    value === "RED" ||
    value === "ORANGE" ||
    value === "YELLOW" ||
    value === "GREEN" ||
    value === "TEAL" ||
    value === "BLUE" ||
    value === "PURPLE" ||
    value === "PINK" ||
    value === "GRAY"
  );
}

function toTaskEmbeddedLabel(
  value: TaskEmbeddedLabelDto,
): TaskEmbeddedLabelDto {
  return {
    id: value.id,
    name: value.name,
    color: value.color,
  };
}

function isTaskEmbeddedLabel(value: unknown): value is TaskEmbeddedLabelDto {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const label = value as {
    id?: unknown;
    name?: unknown;
    color?: unknown;
  };
  return (
    typeof label.id === "string" &&
    typeof label.name === "string" &&
    isLabelColor(label.color)
  );
}

function requirePublicLabel(value: unknown, message: string): PublicLabelDto {
  if (!isPublicLabel(value)) {
    throw new ApiError(500, "INTERNAL_ERROR", message);
  }
  return toPublicLabel(value);
}

function toPublicLabel(value: PublicLabelDto): PublicLabelDto {
  return {
    id: value.id,
    projectId: value.projectId,
    name: value.name,
    color: value.color,
    createdAt: value.createdAt,
  };
}

function isPublicLabel(value: unknown): value is PublicLabelDto {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const label = value as {
    id?: unknown;
    projectId?: unknown;
    name?: unknown;
    color?: unknown;
    createdAt?: unknown;
  };
  return (
    typeof label.id === "string" &&
    typeof label.projectId === "string" &&
    typeof label.name === "string" &&
    isLabelColor(label.color) &&
    typeof label.createdAt === "string"
  );
}

function isLabelListResponse(value: unknown): value is LabelListResponseDto {
  if (typeof value !== "object" || value === null || !("labels" in value)) {
    return false;
  }
  const labels = (value as { labels: unknown }).labels;
  return Array.isArray(labels) && labels.every(isPublicLabel);
}

function isTaskLabelsResponse(value: unknown): value is TaskLabelsResponseDto {
  return isLabelListResponse(value);
}

function requirePublicProjectStatus(
  value: unknown,
  message: string,
): PublicProjectStatusDto {
  if (!isPublicProjectStatus(value)) {
    throw new ApiError(500, "INTERNAL_ERROR", message);
  }
  return toPublicProjectStatus(value);
}

function toPublicProjectStatus(
  value: PublicProjectStatusDto,
): PublicProjectStatusDto {
  return {
    id: value.id,
    projectId: value.projectId,
    key: value.key,
    name: value.name,
    color: value.color,
    isSystem: value.isSystem,
    isCompleted: value.isCompleted,
    position: value.position,
    createdAt: value.createdAt,
  };
}

function isPublicProjectStatus(
  value: unknown,
): value is PublicProjectStatusDto {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const status = value as {
    id?: unknown;
    projectId?: unknown;
    key?: unknown;
    name?: unknown;
    color?: unknown;
    isSystem?: unknown;
    isCompleted?: unknown;
    position?: unknown;
    createdAt?: unknown;
  };
  return (
    typeof status.id === "string" &&
    typeof status.projectId === "string" &&
    typeof status.key === "string" &&
    status.key.length > 0 &&
    typeof status.name === "string" &&
    isLabelColor(status.color) &&
    typeof status.isSystem === "boolean" &&
    typeof status.isCompleted === "boolean" &&
    typeof status.position === "number" &&
    Number.isInteger(status.position) &&
    typeof status.createdAt === "string"
  );
}

function isStatusListResponse(value: unknown): value is StatusListResponseDto {
  if (typeof value !== "object" || value === null || !("statuses" in value)) {
    return false;
  }
  const statuses = (value as { statuses: unknown }).statuses;
  return Array.isArray(statuses) && statuses.every(isPublicProjectStatus);
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
    labels?: unknown;
    cover?: unknown;
  };
  return (
    typeof task.id === "string" &&
    typeof task.projectId === "string" &&
    typeof task.title === "string" &&
    (typeof task.description === "string" || task.description === null) &&
    isTaskStatus(task.status) &&
    isTaskPriority(task.priority) &&
    (typeof task.dueDate === "string" || task.dueDate === null) &&
    typeof task.createdAt === "string" &&
    Array.isArray(task.labels) &&
    task.labels.every(isTaskEmbeddedLabel) &&
    (task.cover === null || isPublicCoverSummary(task.cover))
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

function activityCollectionPath(taskId: string): string {
  return `/api/tasks/${taskId}/activity`;
}

function checklistsCollectionPath(taskId: string): string {
  return `/api/tasks/${taskId}/checklists`;
}

function checklistItemPath(taskId: string, checklistId: string): string {
  return `${checklistsCollectionPath(taskId)}/${checklistId}`;
}

function checklistItemsCollectionPath(
  taskId: string,
  checklistId: string,
): string {
  return `${checklistItemPath(taskId, checklistId)}/items`;
}

function checklistItemItemPath(
  taskId: string,
  checklistId: string,
  itemId: string,
): string {
  return `${checklistItemsCollectionPath(taskId, checklistId)}/${itemId}`;
}

const TASK_ACTIVITY_KINDS: readonly TaskActivityKind[] = [
  "TASK_CREATED",
  "TASK_FIELDS_CHANGED",
  "TASK_SOFT_DELETED",
  "COMMENT_ADDED",
  "CHECKLIST_ADDED",
  "CHECKLIST_REMOVED",
  "CHECKLIST_ITEM_COMPLETED",
  "CHECKLIST_ITEM_UNCOMPLETED",
  "ATTACHMENT_ADDED",
  "ATTACHMENT_REMOVED",
  "COVER_CHANGED",
];

function attachmentsCollectionPath(taskId: string): string {
  return `/api/tasks/${taskId}/attachments`;
}

function attachmentItemPath(taskId: string, attachmentId: string): string {
  return `${attachmentsCollectionPath(taskId)}/${attachmentId}`;
}

function attachmentContentPath(taskId: string, attachmentId: string): string {
  return `${attachmentItemPath(taskId, attachmentId)}/content`;
}

function taskCoverPath(taskId: string): string {
  return `/api/tasks/${taskId}/cover`;
}

function requirePublicAttachment(
  value: unknown,
  message: string,
): PublicAttachmentDto {
  if (!isPublicAttachment(value)) {
    throw new ApiError(500, "INTERNAL_ERROR", message);
  }
  return toPublicAttachment(value);
}

function toPublicAttachment(value: PublicAttachmentDto): PublicAttachmentDto {
  return {
    id: value.id,
    taskId: value.taskId,
    originalFilename: value.originalFilename,
    contentType: value.contentType,
    sizeBytes: value.sizeBytes,
    createdAt: value.createdAt,
    uploadedByUserId: value.uploadedByUserId,
    isCover: value.isCover,
  };
}

function isPublicAttachment(value: unknown): value is PublicAttachmentDto {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const attachment = value as {
    id?: unknown;
    taskId?: unknown;
    originalFilename?: unknown;
    contentType?: unknown;
    sizeBytes?: unknown;
    createdAt?: unknown;
    uploadedByUserId?: unknown;
    isCover?: unknown;
  };
  return (
    typeof attachment.id === "string" &&
    typeof attachment.taskId === "string" &&
    typeof attachment.originalFilename === "string" &&
    typeof attachment.contentType === "string" &&
    typeof attachment.sizeBytes === "number" &&
    Number.isInteger(attachment.sizeBytes) &&
    attachment.sizeBytes >= 0 &&
    typeof attachment.createdAt === "string" &&
    typeof attachment.uploadedByUserId === "string" &&
    typeof attachment.isCover === "boolean"
  );
}

function isAttachmentListResponse(
  value: unknown,
): value is AttachmentListResponseDto {
  if (typeof value !== "object" || value === null || !("attachments" in value)) {
    return false;
  }
  const attachments = (value as { attachments: unknown }).attachments;
  return Array.isArray(attachments) && attachments.every(isPublicAttachment);
}

function isCoverResponse(value: unknown): value is CoverResponseDto {
  if (typeof value !== "object" || value === null || !("cover" in value)) {
    return false;
  }
  const cover = (value as { cover: unknown }).cover;
  return cover === null || isPublicCoverSummary(cover);
}

const TASK_ACTIVITY_CHANGE_FIELDS: readonly TaskActivityChangeField[] = [
  "title",
  "description",
  "status",
  "priority",
  "dueDate",
];

function toPublicActivity(value: PublicActivityDto): PublicActivityDto {
  return {
    id: value.id,
    taskId: value.taskId,
    kind: value.kind,
    actorUserId: value.actorUserId,
    actorDisplayName: value.actorDisplayName,
    createdAt: value.createdAt,
    payload: toPublicActivityPayload(value.kind, value.payload),
  };
}

function toPublicActivityPayload(
  kind: TaskActivityKind,
  payload: TaskActivityPayload,
): TaskActivityPayload {
  switch (kind) {
    case "TASK_CREATED":
    case "TASK_SOFT_DELETED":
      return {};
    case "TASK_FIELDS_CHANGED": {
      const changes = (payload as TaskFieldsChangedActivityPayload).changes.map(
        (change) => ({
          field: change.field,
          oldValue: change.oldValue,
          newValue: change.newValue,
        }),
      );
      return { changes };
    }
    case "COMMENT_ADDED": {
      const commentPayload = payload as CommentAddedActivityPayload;
      return {
        commentId: commentPayload.commentId,
        bodyPreview: commentPayload.bodyPreview,
      };
    }
    case "CHECKLIST_ADDED":
    case "CHECKLIST_REMOVED": {
      const checklistPayload = payload as
        | ChecklistAddedActivityPayload
        | ChecklistRemovedActivityPayload;
      return {
        checklistId: checklistPayload.checklistId,
        namePreview: checklistPayload.namePreview,
      };
    }
    case "CHECKLIST_ITEM_COMPLETED":
    case "CHECKLIST_ITEM_UNCOMPLETED": {
      const itemPayload = payload as
        | ChecklistItemCompletedActivityPayload
        | ChecklistItemUncompletedActivityPayload;
      return {
        checklistId: itemPayload.checklistId,
        itemId: itemPayload.itemId,
        textPreview: itemPayload.textPreview,
      };
    }
    case "ATTACHMENT_ADDED":
    case "ATTACHMENT_REMOVED": {
      const attachmentPayload = payload as
        | AttachmentAddedActivityPayload
        | AttachmentRemovedActivityPayload;
      return {
        attachmentId: attachmentPayload.attachmentId,
        filenamePreview: attachmentPayload.filenamePreview,
      };
    }
    case "COVER_CHANGED": {
      const coverPayload = payload as CoverChangedActivityPayload;
      return {
        attachmentId: coverPayload.attachmentId,
        filenamePreview: coverPayload.filenamePreview,
      };
    }
  }
}

function isTaskActivityKind(value: unknown): value is TaskActivityKind {
  return (
    typeof value === "string" &&
    (TASK_ACTIVITY_KINDS as readonly string[]).includes(value)
  );
}

function isTaskActivityChangeField(
  value: unknown,
): value is TaskActivityChangeField {
  return (
    typeof value === "string" &&
    (TASK_ACTIVITY_CHANGE_FIELDS as readonly string[]).includes(value)
  );
}

function isTaskActivityFieldChange(
  value: unknown,
): value is TaskActivityFieldChange {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const change = value as {
    field?: unknown;
    oldValue?: unknown;
    newValue?: unknown;
  };
  return (
    isTaskActivityChangeField(change.field) &&
    (typeof change.oldValue === "string" || change.oldValue === null) &&
    (typeof change.newValue === "string" || change.newValue === null)
  );
}

function isActivityPayloadForKind(
  kind: TaskActivityKind,
  payload: unknown,
): payload is TaskActivityPayload {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return false;
  }
  const record = payload as Record<string, unknown>;
  switch (kind) {
    case "TASK_CREATED":
    case "TASK_SOFT_DELETED":
      return true;
    case "TASK_FIELDS_CHANGED":
      return (
        Array.isArray(record.changes) &&
        record.changes.every(isTaskActivityFieldChange)
      );
    case "COMMENT_ADDED":
      return (
        typeof record.commentId === "string" &&
        typeof record.bodyPreview === "string"
      );
    case "CHECKLIST_ADDED":
    case "CHECKLIST_REMOVED":
      return (
        typeof record.checklistId === "string" &&
        typeof record.namePreview === "string"
      );
    case "CHECKLIST_ITEM_COMPLETED":
    case "CHECKLIST_ITEM_UNCOMPLETED":
      return (
        typeof record.checklistId === "string" &&
        typeof record.itemId === "string" &&
        typeof record.textPreview === "string"
      );
    case "ATTACHMENT_ADDED":
    case "ATTACHMENT_REMOVED":
      return (
        typeof record.attachmentId === "string" &&
        typeof record.filenamePreview === "string"
      );
    case "COVER_CHANGED":
      return (
        (record.attachmentId === null ||
          typeof record.attachmentId === "string") &&
        (record.filenamePreview === null ||
          typeof record.filenamePreview === "string") &&
        (record.attachmentId === null) === (record.filenamePreview === null)
      );
  }
}

function requirePublicChecklist(
  value: unknown,
  message: string,
): PublicChecklistDto {
  if (!isPublicChecklist(value)) {
    throw new ApiError(500, "INTERNAL_ERROR", message);
  }
  return toPublicChecklist(value);
}

function requirePublicChecklistItem(
  value: unknown,
  message: string,
): PublicChecklistItemDto {
  if (!isPublicChecklistItem(value)) {
    throw new ApiError(500, "INTERNAL_ERROR", message);
  }
  return toPublicChecklistItem(value);
}

function toPublicChecklist(value: PublicChecklistDto): PublicChecklistDto {
  return {
    id: value.id,
    taskId: value.taskId,
    name: value.name,
    createdAt: value.createdAt,
    items: value.items.map(toPublicChecklistItem),
  };
}

function toPublicChecklistItem(
  value: PublicChecklistItemDto,
): PublicChecklistItemDto {
  return {
    id: value.id,
    checklistId: value.checklistId,
    text: value.text,
    checked: value.checked,
    createdAt: value.createdAt,
  };
}

function isPublicChecklistItem(value: unknown): value is PublicChecklistItemDto {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const item = value as {
    id?: unknown;
    checklistId?: unknown;
    text?: unknown;
    checked?: unknown;
    createdAt?: unknown;
  };
  return (
    typeof item.id === "string" &&
    typeof item.checklistId === "string" &&
    typeof item.text === "string" &&
    typeof item.checked === "boolean" &&
    typeof item.createdAt === "string"
  );
}

function isPublicChecklist(value: unknown): value is PublicChecklistDto {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const checklist = value as {
    id?: unknown;
    taskId?: unknown;
    name?: unknown;
    createdAt?: unknown;
    items?: unknown;
  };
  return (
    typeof checklist.id === "string" &&
    typeof checklist.taskId === "string" &&
    typeof checklist.name === "string" &&
    typeof checklist.createdAt === "string" &&
    Array.isArray(checklist.items) &&
    checklist.items.every(isPublicChecklistItem)
  );
}

function isChecklistListResponse(
  value: unknown,
): value is ChecklistListResponseDto {
  if (typeof value !== "object" || value === null || !("checklists" in value)) {
    return false;
  }
  const checklists = (value as { checklists: unknown }).checklists;
  return Array.isArray(checklists) && checklists.every(isPublicChecklist);
}

function isPublicActivity(value: unknown): value is PublicActivityDto {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const event = value as {
    id?: unknown;
    taskId?: unknown;
    kind?: unknown;
    actorUserId?: unknown;
    actorDisplayName?: unknown;
    createdAt?: unknown;
    payload?: unknown;
  };
  if (
    typeof event.id !== "string" ||
    typeof event.taskId !== "string" ||
    !isTaskActivityKind(event.kind) ||
    typeof event.actorUserId !== "string" ||
    typeof event.actorDisplayName !== "string" ||
    typeof event.createdAt !== "string"
  ) {
    return false;
  }
  return isActivityPayloadForKind(event.kind, event.payload);
}

function isActivityListResponse(
  value: unknown,
): value is ActivityListResponseDto {
  if (typeof value !== "object" || value === null || !("activity" in value)) {
    return false;
  }
  const activity = (value as { activity: unknown }).activity;
  return Array.isArray(activity) && activity.every(isPublicActivity);
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
