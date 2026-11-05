import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  buildCommentsActivityTimeline,
  CommentsActivityPanel,
} from "./CommentsActivityPanel";

const olderComment = {
  id: "comment-1",
  taskId: "task-1",
  authorUserId: "user-1",
  authorDisplayName: "Ada",
  body: "First note",
  createdAt: "2026-11-04T10:00:00.000Z",
};

const newerComment = {
  id: "comment-2",
  taskId: "task-1",
  authorUserId: "user-2",
  authorDisplayName: "Bob",
  body: "Later note",
  createdAt: "2026-11-04T14:00:00.000Z",
};

const createdActivity = {
  id: "activity-1",
  taskId: "task-1",
  kind: "TASK_CREATED" as const,
  actorUserId: "user-1",
  actorDisplayName: "Ada",
  createdAt: "2026-11-04T09:00:00.000Z",
  payload: {},
};

const fieldsChangedActivity = {
  id: "activity-2",
  taskId: "task-1",
  kind: "TASK_FIELDS_CHANGED" as const,
  actorUserId: "user-1",
  actorDisplayName: "Ada",
  createdAt: "2026-11-04T13:00:00.000Z",
  payload: {
    changes: [
      { field: "title" as const, oldValue: "Write tests", newValue: "Ship it" },
    ],
  },
};

const commentAddedActivity = {
  id: "activity-3",
  taskId: "task-1",
  kind: "COMMENT_ADDED" as const,
  actorUserId: "user-2",
  actorDisplayName: "Bob",
  createdAt: "2026-11-04T14:00:00.000Z",
  payload: {
    commentId: "comment-2",
    bodyPreview: "Later note",
  },
};

describe("buildCommentsActivityTimeline", () => {
  it("interleaves newest-first and omits COMMENT_ADDED", () => {
    const timeline = buildCommentsActivityTimeline(
      [olderComment, newerComment],
      [commentAddedActivity, fieldsChangedActivity, createdActivity],
    );

    expect(timeline.map((item) => item.id)).toEqual([
      "comment-comment-2",
      "activity-activity-2",
      "comment-comment-1",
      "activity-activity-1",
    ]);
    expect(
      timeline.some(
        (item) =>
          item.type === "activity" && item.event.kind === "COMMENT_ADDED",
      ),
    ).toBe(false);
  });
});

describe("CommentsActivityPanel", () => {
  it("renders a spaced shared timeline with compact text-link comment actions", () => {
    render(
      <CommentsActivityPanel
        canWrite={true}
        commentMutationsDisabled={false}
        comments={[olderComment, newerComment]}
        commentsLoadState={{ kind: "success" }}
        activity={[commentAddedActivity, fieldsChangedActivity, createdActivity]}
        activityLoadState={{ kind: "success" }}
        commentActionState={{ kind: "idle" }}
        newCommentBody=""
        editingCommentId={null}
        editCommentBody=""
        onNewCommentBodyChange={vi.fn()}
        onEditCommentBodyChange={vi.fn()}
        onCreateComment={vi.fn()}
        onStartEditComment={vi.fn()}
        onCancelEditComment={vi.fn()}
        onSaveComment={vi.fn()}
        onDeleteComment={vi.fn()}
        canEditComment={(comment) => comment.authorUserId === "user-1"}
        canSoftDeleteComment={(comment) => comment.authorUserId === "user-1"}
      />,
    );

    const list = screen.getByRole("list", { name: /comments and activity/i });
    expect(list).toHaveClass("gap-0");
    const items = within(list).getAllByRole("listitem");
    expect(items.length).toBe(4);
    expect(items[0]).toHaveClass("border-b");
    expect(items[0]).toHaveClass("py-4");
    expect(within(list).queryByText(/comment added/i)).not.toBeInTheDocument();
    expect(within(list).getByText(/fields changed/i)).toBeInTheDocument();

    const ownItem = within(list).getByText("First note").closest("li");
    expect(ownItem).not.toBeNull();
    const edit = within(ownItem as HTMLElement).getByRole("button", {
      name: /edit comment/i,
    });
    const del = within(ownItem as HTMLElement).getByRole("button", {
      name: /delete comment/i,
    });
    expect(edit).toHaveClass("underline-offset-4");
    expect(edit.className).not.toMatch(/\bborder\b/);
    expect(del).toHaveClass("text-destructive");
    expect(screen.queryByText(/checklist/i)).not.toBeInTheDocument();
  });
});
