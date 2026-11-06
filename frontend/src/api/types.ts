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

/** Catalog status key (seeded TODO/IN_PROGRESS/DONE or custom opaque key). */
export type TaskStatus = string;

export type TaskPriority = "LOW" | "MEDIUM" | "HIGH";

export type LabelColor =
  | "RED"
  | "ORANGE"
  | "YELLOW"
  | "GREEN"
  | "TEAL"
  | "BLUE"
  | "PURPLE"
  | "PINK"
  | "GRAY";

export type StatusColor = LabelColor;

export type TaskEmbeddedLabelDto = {
  id: string;
  name: string;
  color: LabelColor;
};

export type PublicLabelDto = {
  id: string;
  projectId: string;
  name: string;
  color: LabelColor;
  createdAt: string;
};

export type LabelListResponseDto = {
  labels: PublicLabelDto[];
};

export type CreateLabelRequestDto = {
  name: string;
  color: LabelColor;
};

export type UpdateLabelRequestDto = {
  name?: string;
  color?: LabelColor;
};

export type PublicProjectStatusDto = {
  id: string;
  projectId: string;
  key: string;
  name: string;
  color: StatusColor;
  isSystem: boolean;
  isCompleted: boolean;
  position: number;
  createdAt: string;
};

export type StatusListResponseDto = {
  statuses: PublicProjectStatusDto[];
};

export type CreateStatusRequestDto = {
  name: string;
  color: StatusColor;
  isCompleted?: boolean;
};

export type UpdateStatusRequestDto = {
  name?: string;
  color?: StatusColor;
  isCompleted?: boolean;
};

export type ReorderStatusesRequestDto = {
  statusIds: string[];
};

export type ReplaceTaskLabelsRequestDto = {
  labelIds: string[];
};

export type TaskLabelsResponseDto = {
  labels: PublicLabelDto[];
};

/** Cover summary only — never a full attachments array (Q-140). */
export type PublicCoverSummaryDto = {
  attachmentId: string;
  contentType: string;
};

export type PublicTaskDto = {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  createdAt: string;
  labels: TaskEmbeddedLabelDto[];
  cover: PublicCoverSummaryDto | null;
};

export type PublicAttachmentDto = {
  id: string;
  taskId: string;
  originalFilename: string;
  contentType: string;
  sizeBytes: number;
  createdAt: string;
  uploadedByUserId: string;
  isCover: boolean;
};

export type AttachmentListResponseDto = {
  attachments: PublicAttachmentDto[];
};

export type CoverResponseDto = {
  cover: PublicCoverSummaryDto | null;
};

export type SetCoverRequestDto = {
  attachmentId: string;
};

/** Q-133 allowlist — must match backend. */
export const ATTACHMENT_ALLOWED_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "text/plain",
] as const;

export type AttachmentContentType =
  (typeof ATTACHMENT_ALLOWED_CONTENT_TYPES)[number];

export const COVER_IMAGE_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

/** Q-133: 20 MiB per file. */
export const ATTACHMENT_MAX_SIZE_BYTES = 20 * 1024 * 1024;

export function isAllowedAttachmentContentType(
  value: string,
): value is AttachmentContentType {
  return (ATTACHMENT_ALLOWED_CONTENT_TYPES as readonly string[]).includes(
    value,
  );
}

export function isCoverImageContentType(value: string): boolean {
  return (COVER_IMAGE_CONTENT_TYPES as readonly string[]).includes(value);
}

export type TaskListResponseDto = {
  tasks: PublicTaskDto[];
};

export type CreateTaskRequestDto = {
  title: string;
  description?: string | null;
  dueDate?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
};

export type UpdateTaskRequestDto = {
  title?: string;
  description?: string | null;
  dueDate?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
};

export type ListTasksQueryDto = {
  status?: TaskStatus;
  priority?: TaskPriority;
  labelId?: string;
};

export type DashboardProjectSummaryDto = {
  id: string;
  name: string;
  taskCount: number;
  pendingCount: number;
  completedCount: number;
  overdueCount: number;
};

export type DashboardSummaryResponseDto = {
  projectCount: number;
  taskCount: number;
  pendingCount: number;
  completedCount: number;
  overdueCount: number;
  projects: DashboardProjectSummaryDto[];
};

export type ProjectMemberRole = "OWNER" | "EDITOR" | "VIEWER";

export type PublicMemberDto = {
  id: string;
  userId: string;
  email: string;
  displayName: string;
  role: ProjectMemberRole;
  createdAt: string;
};

export type MemberListResponseDto = {
  members: PublicMemberDto[];
};

export type AddMemberRequestDto = {
  email: string;
  role: ProjectMemberRole;
};

export type UpdateMemberRequestDto = {
  role: ProjectMemberRole;
};

export type PublicCommentDto = {
  id: string;
  taskId: string;
  authorUserId: string;
  authorDisplayName: string;
  body: string;
  createdAt: string;
};

export type CommentListResponseDto = {
  comments: PublicCommentDto[];
};

export type CreateCommentRequestDto = {
  body: string;
};

export type UpdateCommentRequestDto = {
  body: string;
};

export type PublicChecklistItemDto = {
  id: string;
  checklistId: string;
  text: string;
  checked: boolean;
  createdAt: string;
};

export type PublicChecklistDto = {
  id: string;
  taskId: string;
  name: string;
  createdAt: string;
  items: PublicChecklistItemDto[];
};

export type ChecklistListResponseDto = {
  checklists: PublicChecklistDto[];
};

export type CreateChecklistRequestDto = {
  name: string;
};

export type UpdateChecklistRequestDto = {
  name: string;
};

export type CreateChecklistItemRequestDto = {
  text: string;
};

export type UpdateChecklistItemRequestDto = {
  text?: string;
  checked?: boolean;
};

export type TaskActivityKind =
  | "TASK_CREATED"
  | "TASK_FIELDS_CHANGED"
  | "TASK_SOFT_DELETED"
  | "COMMENT_ADDED"
  | "CHECKLIST_ADDED"
  | "CHECKLIST_REMOVED"
  | "CHECKLIST_ITEM_COMPLETED"
  | "CHECKLIST_ITEM_UNCOMPLETED"
  | "ATTACHMENT_ADDED"
  | "ATTACHMENT_REMOVED"
  | "COVER_CHANGED";

export type TaskActivityChangeField =
  | "title"
  | "description"
  | "status"
  | "priority"
  | "dueDate";

export type TaskActivityFieldChange = {
  field: TaskActivityChangeField;
  oldValue: string | null;
  newValue: string | null;
};

export type TaskCreatedActivityPayload = Record<string, never>;

export type TaskFieldsChangedActivityPayload = {
  changes: TaskActivityFieldChange[];
};

export type TaskSoftDeletedActivityPayload = Record<string, never>;

export type CommentAddedActivityPayload = {
  commentId: string;
  bodyPreview: string;
};

export type ChecklistAddedActivityPayload = {
  checklistId: string;
  namePreview: string;
};

export type ChecklistRemovedActivityPayload = {
  checklistId: string;
  namePreview: string;
};

export type ChecklistItemCompletedActivityPayload = {
  checklistId: string;
  itemId: string;
  textPreview: string;
};

export type ChecklistItemUncompletedActivityPayload = {
  checklistId: string;
  itemId: string;
  textPreview: string;
};

export type AttachmentAddedActivityPayload = {
  attachmentId: string;
  filenamePreview: string;
};

export type AttachmentRemovedActivityPayload = {
  attachmentId: string;
  filenamePreview: string;
};

export type CoverChangedActivityPayload = {
  attachmentId: string | null;
  filenamePreview: string | null;
};

export type TaskActivityPayload =
  | TaskCreatedActivityPayload
  | TaskFieldsChangedActivityPayload
  | TaskSoftDeletedActivityPayload
  | CommentAddedActivityPayload
  | ChecklistAddedActivityPayload
  | ChecklistRemovedActivityPayload
  | ChecklistItemCompletedActivityPayload
  | ChecklistItemUncompletedActivityPayload
  | AttachmentAddedActivityPayload
  | AttachmentRemovedActivityPayload
  | CoverChangedActivityPayload;

export type PublicActivityDto = {
  id: string;
  taskId: string;
  kind: TaskActivityKind;
  actorUserId: string;
  actorDisplayName: string;
  createdAt: string;
  payload: TaskActivityPayload;
};

export type ActivityListResponseDto = {
  activity: PublicActivityDto[];
};

export type ErrorEnvelope = {
  error: {
    code: string;
    message: string;
  };
};
