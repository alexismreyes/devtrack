import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  buildCommentsActivityTimeline,
  buildCommentsActivityWindow,
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

const checklistAddedActivity = {
  id: "activity-4",
  taskId: "task-1",
  kind: "CHECKLIST_ADDED" as const,
  actorUserId: "user-1",
  actorDisplayName: "Ada",
  createdAt: "2026-11-04T15:00:00.000Z",
  payload: {
    checklistId: "checklist-1",
    namePreview: "QA",
  },
};

const checklistRemovedActivity = {
  id: "activity-5",
  taskId: "task-1",
  kind: "CHECKLIST_REMOVED" as const,
  actorUserId: "user-1",
  actorDisplayName: "Ada",
  createdAt: "2026-11-04T16:00:00.000Z",
  payload: {
    checklistId: "checklist-1",
    namePreview: "QA",
  },
};

const checklistItemCompletedActivity = {
  id: "activity-6",
  taskId: "task-1",
  kind: "CHECKLIST_ITEM_COMPLETED" as const,
  actorUserId: "user-1",
  actorDisplayName: "Ada",
  createdAt: "2026-11-04T17:00:00.000Z",
  payload: {
    checklistId: "checklist-1",
    itemId: "item-1",
    textPreview: "Write tests",
  },
};

const checklistItemUncompletedActivity = {
  id: "activity-7",
  taskId: "task-1",
  kind: "CHECKLIST_ITEM_UNCOMPLETED" as const,
  actorUserId: "user-1",
  actorDisplayName: "Ada",
  createdAt: "2026-11-04T18:00:00.000Z",
  payload: {
    checklistId: "checklist-1",
    itemId: "item-1",
    textPreview: "Write tests",
  },
};

const attachmentAddedActivity = {
  id: "activity-8",
  taskId: "task-1",
  kind: "ATTACHMENT_ADDED" as const,
  actorUserId: "user-1",
  actorDisplayName: "Ada",
  createdAt: "2026-11-04T19:00:00.000Z",
  payload: {
    attachmentId: "att-1",
    filenamePreview: "cover.png",
  },
};

const attachmentRemovedActivity = {
  id: "activity-9",
  taskId: "task-1",
  kind: "ATTACHMENT_REMOVED" as const,
  actorUserId: "user-1",
  actorDisplayName: "Ada",
  createdAt: "2026-11-04T20:00:00.000Z",
  payload: {
    attachmentId: "att-1",
    filenamePreview: "cover.png",
  },
};

const coverChangedActivity = {
  id: "activity-10",
  taskId: "task-1",
  kind: "COVER_CHANGED" as const,
  actorUserId: "user-1",
  actorDisplayName: "Ada",
  createdAt: "2026-11-04T21:00:00.000Z",
  payload: {
    attachmentId: "att-1",
    filenamePreview: "cover.png",
  },
};

const coverClearedActivity = {
  id: "activity-11",
  taskId: "task-1",
  kind: "COVER_CHANGED" as const,
  actorUserId: "user-1",
  actorDisplayName: "Ada",
  createdAt: "2026-11-04T22:00:00.000Z",
  payload: {
    attachmentId: null,
    filenamePreview: null,
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

  it("keeps the four checklist activity kinds in the timeline (Q-124)", () => {
    const timeline = buildCommentsActivityTimeline(
      [],
      [
        checklistItemUncompletedActivity,
        checklistItemCompletedActivity,
        checklistRemovedActivity,
        checklistAddedActivity,
        commentAddedActivity,
      ],
    );

    expect(
      timeline.map((item) =>
        item.type === "activity" ? item.event.kind : item.type,
      ),
    ).toEqual([
      "CHECKLIST_ITEM_UNCOMPLETED",
      "CHECKLIST_ITEM_COMPLETED",
      "CHECKLIST_REMOVED",
      "CHECKLIST_ADDED",
    ]);
    expect(
      timeline.some(
        (item) =>
          item.type === "activity" && item.event.kind === "COMMENT_ADDED",
      ),
    ).toBe(false);
  });

  it("keeps ATTACHMENT_ADDED / ATTACHMENT_REMOVED / COVER_CHANGED (Q-135)", () => {
    const timeline = buildCommentsActivityTimeline(
      [],
      [
        coverClearedActivity,
        coverChangedActivity,
        attachmentRemovedActivity,
        attachmentAddedActivity,
        commentAddedActivity,
      ],
    );

    expect(
      timeline.map((item) =>
        item.type === "activity" ? item.event.kind : item.type,
      ),
    ).toEqual([
      "COVER_CHANGED",
      "COVER_CHANGED",
      "ATTACHMENT_REMOVED",
      "ATTACHMENT_ADDED",
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
  });

  it("renders checklist activity kinds with name and text previews (AC-008/Q-124)", () => {
    render(
      <CommentsActivityPanel
        canWrite={true}
        commentMutationsDisabled={false}
        comments={[]}
        commentsLoadState={{ kind: "empty" }}
        activity={[
          checklistItemUncompletedActivity,
          checklistItemCompletedActivity,
          checklistRemovedActivity,
          checklistAddedActivity,
          commentAddedActivity,
        ]}
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
        canEditComment={() => false}
        canSoftDeleteComment={() => false}
      />,
    );

    const list = screen.getByRole("list", { name: /comments and activity/i });
    expect(within(list).getByText(/checklist added/i)).toBeInTheDocument();
    expect(within(list).getByText(/checklist removed/i)).toBeInTheDocument();
    expect(
      within(list).getByText(/checklist item completed/i),
    ).toBeInTheDocument();
    expect(
      within(list).getByText(/checklist item uncompleted/i),
    ).toBeInTheDocument();
    expect(within(list).getAllByText("QA")).toHaveLength(2);
    expect(within(list).getAllByText("Write tests")).toHaveLength(2);
    expect(within(list).queryByText(/comment added/i)).not.toBeInTheDocument();
  });

  it("renders attachment and cover activity kinds and still omits COMMENT_ADDED", () => {
    const timeline = buildCommentsActivityTimeline(
      [],
      [
        coverClearedActivity,
        coverChangedActivity,
        attachmentRemovedActivity,
        attachmentAddedActivity,
        commentAddedActivity,
      ],
    );
    expect(
      timeline.map((item) =>
        item.type === "activity" ? item.event.kind : item.type,
      ),
    ).toEqual([
      "COVER_CHANGED",
      "COVER_CHANGED",
      "ATTACHMENT_REMOVED",
      "ATTACHMENT_ADDED",
    ]);

    render(
      <CommentsActivityPanel
        canWrite={true}
        commentMutationsDisabled={false}
        comments={[]}
        commentsLoadState={{ kind: "empty" }}
        activity={[
          coverClearedActivity,
          coverChangedActivity,
          attachmentRemovedActivity,
          attachmentAddedActivity,
          commentAddedActivity,
        ]}
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
        canEditComment={() => false}
        canSoftDeleteComment={() => false}
      />,
    );

    const list = screen.getByRole("list", { name: /comments and activity/i });
    expect(within(list).getByText(/attachment added/i)).toBeInTheDocument();
    expect(within(list).getByText(/attachment removed/i)).toBeInTheDocument();
    expect(within(list).getAllByText(/cover changed/i)).toHaveLength(2);
    expect(within(list).getAllByText("cover.png")).toHaveLength(3);
    expect(within(list).getByText(/cover cleared/i)).toBeInTheDocument();
    expect(within(list).queryByText(/comment added/i)).not.toBeInTheDocument();
  });

  it("caps the visible window at 5 interleaved items (AC-001)", () => {
    const manyComments = Array.from({ length: 4 }, (_, index) => ({
      ...newerComment,
      id: `comment-extra-${index}`,
      body: `Extra ${index}`,
      createdAt: `2026-11-05T0${index}:00:00.000Z`,
    }));
    const manyActivity = [
      fieldsChangedActivity,
      createdActivity,
      checklistAddedActivity,
      attachmentAddedActivity,
    ];

    expect(
      buildCommentsActivityWindow(
        [newerComment, olderComment, ...manyComments],
        manyActivity,
      ),
    ).toHaveLength(5);

    render(
      <CommentsActivityPanel
        canWrite={false}
        commentMutationsDisabled={true}
        comments={[newerComment, olderComment, ...manyComments]}
        commentsLoadState={{ kind: "success" }}
        activity={manyActivity}
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
        canEditComment={() => false}
        canSoftDeleteComment={() => false}
      />,
    );

    const list = screen.getByRole("list", { name: /comments and activity/i });
    expect(within(list).getAllByRole("listitem")).toHaveLength(5);
  });

  it("shows Prev/Next and invokes them; disables at ends (AC-003/AC-004)", async () => {
    const user = userEvent.setup();
    const onPrevFeedWindow = vi.fn();
    const onNextFeedWindow = vi.fn();
    const { rerender } = render(
      <CommentsActivityPanel
        canWrite={false}
        commentMutationsDisabled={true}
        comments={[newerComment]}
        commentsLoadState={{ kind: "success" }}
        activity={[createdActivity, commentAddedActivity]}
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
        canEditComment={() => false}
        canSoftDeleteComment={() => false}
        canGoPrev={false}
        canGoNext={true}
        feedNavState={{ kind: "idle" }}
        onPrevFeedWindow={onPrevFeedWindow}
        onNextFeedWindow={onNextFeedWindow}
      />,
    );

    expect(screen.queryByText(/comment added/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /load more/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^previous$/i })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: /^next$/i }));
    expect(onNextFeedWindow).toHaveBeenCalledOnce();

    rerender(
      <CommentsActivityPanel
        canWrite={false}
        commentMutationsDisabled={true}
        comments={[olderComment]}
        commentsLoadState={{ kind: "success" }}
        activity={[createdActivity]}
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
        canEditComment={() => false}
        canSoftDeleteComment={() => false}
        canGoPrev={true}
        canGoNext={false}
        feedNavState={{ kind: "idle" }}
        onPrevFeedWindow={onPrevFeedWindow}
        onNextFeedWindow={onNextFeedWindow}
      />,
    );

    expect(screen.getByRole("button", { name: /^next$/i })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: /^previous$/i }));
    expect(onPrevFeedWindow).toHaveBeenCalledOnce();
  });
});
