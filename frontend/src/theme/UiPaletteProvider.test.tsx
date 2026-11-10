import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { expectNoSessionTokenStorage } from "../test/storage";
import { UiPaletteProvider } from "./UiPaletteProvider";
import { UiPaletteSelector } from "./UiPaletteSelector";
import { UI_PALETTES, UI_PALETTE_STORAGE_KEY } from "./uiPalettes";

afterEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  delete document.documentElement.dataset.palette;
});

function renderSelector(): void {
  render(
    <UiPaletteProvider>
      <UiPaletteSelector />
    </UiPaletteProvider>,
  );
}

describe("UiPaletteProvider", () => {
  it("defaults to Forest when storage is empty", () => {
    renderSelector();
    expect(document.documentElement.dataset.palette).toBe("Forest");
    expect(screen.getByRole("button", { name: /color palette/i })).toHaveTextContent(
      "Forest",
    );
    expect(screen.queryByRole("combobox", { name: /color palette/i })).not.toBeInTheDocument();
    expectNoSessionTokenStorage();
  });

  it("falls back to Forest for an unknown stored id", () => {
    window.localStorage.setItem(UI_PALETTE_STORAGE_KEY, "not-a-palette");
    renderSelector();
    expect(document.documentElement.dataset.palette).toBe("Forest");
    expect(screen.getByRole("button", { name: /color palette/i })).toHaveTextContent(
      "Forest",
    );
  });

  it("applies a valid stored palette without a guest-only rewrite", () => {
    window.localStorage.setItem(UI_PALETTE_STORAGE_KEY, "Glacier");
    renderSelector();
    expect(document.documentElement.dataset.palette).toBe("Glacier");
    expect(window.localStorage.getItem(UI_PALETTE_STORAGE_KEY)).toBe("Glacier");
  });

  it("writes the selected catalog id via circular previews and lists the full Q-041 catalog", async () => {
    const user = userEvent.setup();
    renderSelector();
    const trigger = screen.getByRole("button", { name: /color palette/i });
    expect(trigger).toHaveAccessibleName(/color palette/i);
    await user.click(trigger);
    const picker = screen.getByTestId("ui-palette-picker");
    for (const item of UI_PALETTES) {
      const option = within(picker).getByRole("radio", {
        name: new RegExp(`^${item.label}(, selected)?$`),
      });
      expect(option).toBeInTheDocument();
      expect(
        option.querySelector(`.ui-palette-preview[data-preview-palette="${item.id}"]`),
      ).not.toBeNull();
    }
    await user.click(within(picker).getByRole("radio", { name: /^Ocean$/i }));
    expect(document.documentElement.dataset.palette).toBe("Ocean");
    expect(window.localStorage.getItem(UI_PALETTE_STORAGE_KEY)).toBe("Ocean");
    expect(window.sessionStorage.length).toBe(0);
    expectNoSessionTokenStorage();
  });

  it("persists Q-177 dark palette Obsidian under devtrack.uiPalette (AC-003)", async () => {
    const user = userEvent.setup();
    renderSelector();
    await user.click(screen.getByRole("button", { name: /color palette/i }));
    await user.click(
      within(screen.getByTestId("ui-palette-picker")).getByRole("radio", {
        name: /^Obsidian$/i,
      }),
    );
    expect(document.documentElement.dataset.palette).toBe("Obsidian");
    expect(window.localStorage.getItem(UI_PALETTE_STORAGE_KEY)).toBe("Obsidian");
  });

  it("persists 033 Violet Night under catalog id VioletNight (AC-001/AC-004)", async () => {
    const user = userEvent.setup();
    renderSelector();
    await user.click(screen.getByRole("button", { name: /color palette/i }));
    await user.click(
      within(screen.getByTestId("ui-palette-picker")).getByRole("radio", {
        name: /^Violet Night$/i,
      }),
    );
    expect(document.documentElement.dataset.palette).toBe("VioletNight");
    expect(window.localStorage.getItem(UI_PALETTE_STORAGE_KEY)).toBe("VioletNight");
    expect(screen.getByRole("button", { name: /color palette/i })).toHaveTextContent(
      "Violet Night",
    );
  });
});
