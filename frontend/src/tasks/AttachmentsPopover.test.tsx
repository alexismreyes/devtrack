import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AttachmentsPopover } from "./AttachmentsPopover";

describe("AttachmentsPopover pointer cursors (034 AC-001)", () => {
  it("applies cursor-pointer on the Attachment button and file picker", async () => {
    const user = userEvent.setup();

    render(
      <AttachmentsPopover
        taskId="task-1"
        canWrite={true}
        onUploaded={vi.fn()}
        onActivityMaybeChanged={vi.fn()}
        onUnauthenticated={vi.fn()}
      />,
    );

    const trigger = screen.getByRole("button", { name: /^attachment$/i });
    expect(trigger).toHaveClass("cursor-pointer");

    await user.click(trigger);
    const fileInput = await screen.findByTestId("task-attachment-upload");
    expect(fileInput).toHaveClass("cursor-pointer", "file:cursor-pointer");
  });
});
