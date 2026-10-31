import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { expectNoSessionTokenStorage } from "../test/storage";
import { UiPaletteProvider } from "./UiPaletteProvider";
import { UiPaletteSelector } from "./UiPaletteSelector";
import { UI_PALETTE_IDS, UI_PALETTE_STORAGE_KEY } from "./uiPalettes";

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
    expect(screen.getByRole("combobox", { name: /color palette/i })).toHaveValue("Forest");
    expectNoSessionTokenStorage();
  });

  it("falls back to Forest for an unknown stored id", () => {
    window.localStorage.setItem(UI_PALETTE_STORAGE_KEY, "not-a-palette");
    renderSelector();
    expect(document.documentElement.dataset.palette).toBe("Forest");
    expect(screen.getByRole("combobox", { name: /color palette/i })).toHaveValue("Forest");
  });

  it("applies a valid stored palette without a guest-only rewrite", () => {
    window.localStorage.setItem(UI_PALETTE_STORAGE_KEY, "Glacier");
    renderSelector();
    expect(document.documentElement.dataset.palette).toBe("Glacier");
    expect(window.localStorage.getItem(UI_PALETTE_STORAGE_KEY)).toBe("Glacier");
  });

  it("writes the selected catalog id and lists the full Q-041 catalog", async () => {
    const user = userEvent.setup();
    renderSelector();
    const selector = screen.getByRole("combobox", { name: /color palette/i });
    expect(selector).toHaveAccessibleName(/color palette/i);
    for (const id of UI_PALETTE_IDS) {
      expect(screen.getByRole("option", { name: id })).toBeInTheDocument();
    }
    await user.selectOptions(selector, "Ocean");
    expect(document.documentElement.dataset.palette).toBe("Ocean");
    expect(window.localStorage.getItem(UI_PALETTE_STORAGE_KEY)).toBe("Ocean");
    expect(window.sessionStorage.length).toBe(0);
    expectNoSessionTokenStorage();
  });
});
