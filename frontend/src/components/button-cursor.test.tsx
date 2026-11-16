import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "./ui/button";

describe("Button cursor baseline (019 AC-001)", () => {
  it("applies cursor-pointer on enabled buttons", () => {
    render(<Button type="button">Save</Button>);
    expect(screen.getByRole("button", { name: /^save$/i })).toHaveClass(
      "cursor-pointer",
    );
  });

  it("keeps disabled buttons non-interactive via pointer-events-none", () => {
    render(
      <Button type="button" disabled>
        Save
      </Button>,
    );
    const button = screen.getByRole("button", { name: /^save$/i });
    expect(button).toBeDisabled();
    expect(button).toHaveClass("disabled:pointer-events-none");
  });
});
