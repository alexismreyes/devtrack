import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { LABEL_COLORS } from "./labelColors";
import { LabelColorSwatchPicker } from "./LabelColorSwatchPicker";

describe("LabelColorSwatchPicker", () => {
  it("renders nine token swatches with a checkmark on the selected color", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();

    render(
      <LabelColorSwatchPicker value="GRAY" onChange={onChange} aria-label="Label color" />,
    );

    const group = screen.getByRole("radiogroup", { name: /label color/i });
    const radios = withinRadios(group);
    expect(radios).toHaveLength(LABEL_COLORS.length);
    expect(LABEL_COLORS).toHaveLength(9);
    expect(
      screen.getByRole("radio", { name: /GRAY, selected/i }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: /^TEAL$/i }));
    expect(onChange).toHaveBeenCalledWith("TEAL");
  });

  it("disables swatches when disabled", () => {
    render(
      <LabelColorSwatchPicker
        value="BLUE"
        onChange={vi.fn()}
        disabled
        aria-label="Label color"
      />,
    );

    for (const color of LABEL_COLORS) {
      expect(screen.getByRole("radio", { name: new RegExp(color) })).toBeDisabled();
    }
  });

  it("applies cursor-pointer on enabled color swatches (034 AC-004)", () => {
    render(
      <LabelColorSwatchPicker value="GRAY" onChange={vi.fn()} aria-label="Label color" />,
    );

    for (const color of LABEL_COLORS) {
      expect(screen.getByRole("radio", { name: new RegExp(color) })).toHaveClass(
        "cursor-pointer",
      );
    }
  });
});

function withinRadios(group: HTMLElement): HTMLElement[] {
  return Array.from(group.querySelectorAll('[role="radio"]')) as HTMLElement[];
}
