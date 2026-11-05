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

export type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE";

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

export type ReplaceTaskLabelsRequestDto = {
  labelIds: string[];
};

export type TaskLabelsResponseDto = {
  labels: PublicLabelDto[];
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
};

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
  | "CHECKLIST_ITEM_UNCOMPLETED";

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

export type TaskActivityPayload =
  | TaskCreatedActivityPayload
  | TaskFieldsChangedActivityPayload
  | TaskSoftDeletedActivityPayload
  | CommentAddedActivityPayload
  | ChecklistAddedActivityPayload
  | ChecklistRemovedActivityPayload
  | ChecklistItemCompletedActivityPayload
  | ChecklistItemUncompletedActivityPayload;

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
