import type { FormEvent } from "react";
import type {
  PublicActivityDto,
  PublicCommentDto,
  TaskActivityFieldChange,
} from "../api/types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type CommentsLoadState =
  | { kind: "loading" }
  | { kind: "success" }
  | { kind: "empty" }
  | { kind: "error"; message: string }
  | { kind: "unauthenticated"; message: string }
  | { kind: "forbidden"; message: string }
  | { kind: "not_found"; message: string };

type ActivityLoadState =
  | { kind: "loading" }
  | { kind: "success" }
  | { kind: "empty" }
  | { kind: "error"; message: string }
  | { kind: "unauthenticated"; message: string }
  | { kind: "forbidden"; message: string }
  | { kind: "not_found"; message: string };

type CommentActionState =
  | { kind: "idle" }
  | { kind: "creating" }
  | { kind: "saving"; commentId: string }
  | { kind: "deleting"; commentId: string }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string }
  | { kind: "conflict"; message: string };

type TimelineItem =
  | {
      type: "comment";
      id: string;
      sortAt: string;
      comment: PublicCommentDto;
    }
  | {
      type: "activity";
      id: string;
      sortAt: string;
      event: PublicActivityDto;
    };

type CommentsActivityPanelProps = {
  canWrite: boolean;
  commentMutationsDisabled: boolean;
  comments: PublicCommentDto[];
  commentsLoadState: CommentsLoadState;
  activity: PublicActivityDto[];
  activityLoadState: ActivityLoadState;
  commentActionState: CommentActionState;
  newCommentBody: string;
  editingCommentId: string | null;
  editCommentBody: string;
  onNewCommentBodyChange: (value: string) => void;
  onEditCommentBodyChange: (value: string) => void;
  onCreateComment: (event: FormEvent<HTMLFormElement>) => void;
  onStartEditComment: (comment: PublicCommentDto) => void;
  onCancelEditComment: () => void;
  onSaveComment: (commentId: string) => void;
  onDeleteComment: (commentId: string) => void;
  canEditComment: (comment: PublicCommentDto) => boolean;
  canSoftDeleteComment: (comment: PublicCommentDto) => boolean;
};

function formatActivityFieldValue(value: string | null): string {
  return value === null ? "(empty)" : value;
}

function describeFieldChange(change: TaskActivityFieldChange): string {
  return `${change.field}: ${formatActivityFieldValue(change.oldValue)} → ${formatActivityFieldValue(change.newValue)}`;
}

function activityKindLabel(kind: PublicActivityDto["kind"]): string {
  switch (kind) {
    case "TASK_CREATED":
      return "Task created";
    case "TASK_FIELDS_CHANGED":
      return "Fields changed";
    case "TASK_SOFT_DELETED":
      return "Task deleted";
    case "COMMENT_ADDED":
      return "Comment added";
  }
}

function activityPayloadSummary(event: PublicActivityDto): string | null {
  switch (event.kind) {
    case "TASK_CREATED":
    case "TASK_SOFT_DELETED":
      return null;
    case "TASK_FIELDS_CHANGED": {
      if (!("changes" in event.payload)) {
        return null;
      }
      return event.payload.changes.map(describeFieldChange).join("; ");
    }
    case "COMMENT_ADDED": {
      if (!("bodyPreview" in event.payload)) {
        return null;
      }
      return event.payload.bodyPreview;
    }
  }
}

export function buildCommentsActivityTimeline(
  comments: PublicCommentDto[],
  activity: PublicActivityDto[],
): TimelineItem[] {
  const items: TimelineItem[] = [
    ...comments.map((comment) => ({
      type: "comment" as const,
      id: `comment-${comment.id}`,
      sortAt: comment.createdAt,
      comment,
    })),
    ...activity
      .filter((event) => event.kind !== "COMMENT_ADDED")
      .map((event) => ({
        type: "activity" as const,
        id: `activity-${event.id}`,
        sortAt: event.createdAt,
        event,
      })),
  ];

  items.sort((left, right) => {
    if (left.sortAt === right.sortAt) {
      return right.id.localeCompare(left.id);
    }
    return right.sortAt.localeCompare(left.sortAt);
  });

  return items;
}

export function CommentsActivityPanel({
  canWrite,
  commentMutationsDisabled,
  comments,
  commentsLoadState,
  activity,
  activityLoadState,
  commentActionState,
  newCommentBody,
  editingCommentId,
  editCommentBody,
  onNewCommentBodyChange,
  onEditCommentBodyChange,
  onCreateComment,
  onStartEditComment,
  onCancelEditComment,
  onSaveComment,
  onDeleteComment,
  canEditComment,
  canSoftDeleteComment,
}: CommentsActivityPanelProps) {
  const timeline = buildCommentsActivityTimeline(comments, activity);
  const commentsReady =
    commentsLoadState.kind === "success" || commentsLoadState.kind === "empty";
  const activityReady =
    activityLoadState.kind === "success" || activityLoadState.kind === "empty";
  const showTimeline = commentsReady || activityReady;

  return (
    <section
      aria-labelledby="task-comments-activity-heading"
      className="grid gap-3 md:border-l md:border-border md:pl-4"
      data-testid="task-detail-side"
    >
      <h5
        id="task-comments-activity-heading"
        className="text-sm font-semibold tracking-tight"
      >
        Comments & activity
      </h5>

      {canWrite ? (
        <form
          onSubmit={(event) => onCreateComment(event)}
          className="grid gap-2"
        >
          <Label className="grid gap-2">
            New comment
            <Textarea
              name="new-comment"
              value={newCommentBody}
              onChange={(event) => onNewCommentBodyChange(event.target.value)}
              disabled={commentMutationsDisabled}
              placeholder="Write a comment…"
            />
          </Label>
          <Button type="submit" size="sm" disabled={commentMutationsDisabled}>
            {commentActionState.kind === "creating" ? "Adding…" : "Add comment"}
          </Button>
        </form>
      ) : null}

      {commentsLoadState.kind === "loading" ? (
        <p className="text-sm text-muted-foreground" role="status">
          Loading comments…
        </p>
      ) : null}
      {activityLoadState.kind === "loading" ? (
        <p className="text-sm text-muted-foreground" role="status">
          Loading activity…
        </p>
      ) : null}

      {commentsLoadState.kind === "unauthenticated" ? (
        <p className="text-sm text-muted-foreground" role="status">
          {commentsLoadState.message}
        </p>
      ) : null}
      {activityLoadState.kind === "unauthenticated" ? (
        <p className="text-sm text-muted-foreground" role="status">
          {activityLoadState.message}
        </p>
      ) : null}

      {commentsLoadState.kind === "forbidden" ||
      commentsLoadState.kind === "not_found" ||
      commentsLoadState.kind === "error" ? (
        <p className="text-sm text-destructive" role="alert">
          {commentsLoadState.message}
        </p>
      ) : null}
      {activityLoadState.kind === "forbidden" ||
      activityLoadState.kind === "not_found" ||
      activityLoadState.kind === "error" ? (
        <p className="text-sm text-destructive" role="alert">
          {activityLoadState.message}
        </p>
      ) : null}

      {showTimeline && timeline.length === 0 && commentsReady && activityReady ? (
        <p className="text-sm text-muted-foreground" role="status">
          No comments or activity yet.
        </p>
      ) : null}

      {showTimeline && timeline.length > 0 ? (
        <ul className="grid gap-0" aria-label="Comments and activity">
          {timeline.map((item) => {
            if (item.type === "activity") {
              const summary = activityPayloadSummary(item.event);
              return (
                <li
                  key={item.id}
                  className="grid gap-1 border-b border-border/70 py-4 last:border-b-0"
                >
                  <p className="text-xs text-muted-foreground">
                    {item.event.actorDisplayName}
                    {" · "}
                    <time dateTime={item.event.createdAt}>
                      {item.event.createdAt}
                    </time>
                  </p>
                  <p className="text-sm font-medium">
                    {activityKindLabel(item.event.kind)}
                  </p>
                  {summary === null ? null : (
                    <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                      {summary}
                    </p>
                  )}
                </li>
              );
            }

            const comment = item.comment;
            const isEditing = editingCommentId === comment.id;
            const isAuthor = canEditComment(comment);
            const canDelete = canSoftDeleteComment(comment);
            return (
              <li
                key={item.id}
                className="grid gap-2 border-b border-border/70 py-4 last:border-b-0"
              >
                <p className="text-xs text-muted-foreground">
                  {comment.authorDisplayName}
                  {" · "}
                  <time dateTime={comment.createdAt}>{comment.createdAt}</time>
                </p>
                {isEditing ? (
                  <div className="grid gap-2">
                    <Label className="grid gap-2">
                      Edit comment
                      <Textarea
                        name={`edit-comment-${comment.id}`}
                        value={editCommentBody}
                        onChange={(event) =>
                          onEditCommentBodyChange(event.target.value)
                        }
                        disabled={commentMutationsDisabled}
                      />
                    </Label>
                    <div className="flex flex-wrap items-center gap-3">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => onSaveComment(comment.id)}
                        disabled={commentMutationsDisabled}
                      >
                        {commentActionState.kind === "saving" &&
                        commentActionState.commentId === comment.id
                          ? "Saving…"
                          : "Save comment"}
                      </Button>
                      <Button
                        type="button"
                        variant="link"
                        className="h-auto px-0"
                        onClick={onCancelEditComment}
                        disabled={commentMutationsDisabled}
                      >
                        Cancel edit
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap text-sm">{comment.body}</p>
                )}
                {!isEditing && (isAuthor || canDelete) ? (
                  <div className="flex flex-wrap items-center gap-3">
                    {isAuthor ? (
                      <Button
                        type="button"
                        variant="link"
                        className="h-auto px-0"
                        onClick={() => onStartEditComment(comment)}
                        disabled={commentMutationsDisabled}
                      >
                        Edit comment
                      </Button>
                    ) : null}
                    {canDelete ? (
                      <Button
                        type="button"
                        variant="link"
                        className="h-auto px-0 text-destructive"
                        onClick={() => onDeleteComment(comment.id)}
                        disabled={commentMutationsDisabled}
                      >
                        {commentActionState.kind === "deleting" &&
                        commentActionState.commentId === comment.id
                          ? "Deleting…"
                          : "Delete comment"}
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}

      {commentActionState.kind === "creating" ? (
        <p className="text-sm text-muted-foreground" role="status">
          Adding comment…
        </p>
      ) : null}
      {commentActionState.kind === "saving" ? (
        <p className="text-sm text-muted-foreground" role="status">
          Saving comment…
        </p>
      ) : null}
      {commentActionState.kind === "deleting" ? (
        <p className="text-sm text-muted-foreground" role="status">
          Deleting comment…
        </p>
      ) : null}
      {commentActionState.kind === "success" ? (
        <p className="text-sm text-muted-foreground" role="status">
          {commentActionState.message}
        </p>
      ) : null}
      {commentActionState.kind === "conflict" ||
      commentActionState.kind === "error" ? (
        <p className="text-sm text-destructive" role="alert">
          {commentActionState.message}
        </p>
      ) : null}
    </section>
  );
}
