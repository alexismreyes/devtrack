import { afterEach, describe, expect, it } from "vitest";
import {
  applyUiPaletteToDocument,
  DEFAULT_UI_PALETTE,
  isUiPaletteId,
  readStoredUiPalette,
  UI_PALETTE_IDS,
  UI_PALETTE_STORAGE_KEY,
  UI_PALETTES,
  writeStoredUiPalette,
} from "./uiPalettes";

afterEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  delete document.documentElement.dataset.palette;
});

describe("Q-041 UI palette catalog", () => {
  it("documents Forest as default plus the decided solid and gradient ids", () => {
    expect(DEFAULT_UI_PALETTE).toBe("Forest");
    expect([...UI_PALETTE_IDS]).toEqual([
      "Forest",
      "Ocean",
      "Sunset",
      "Violet",
      "Midnight",
      "Obsidian",
      "Noir",
      "Dusk",
      "Aurora",
      "Ember",
      "Lagoon",
      "Twilight",
      "Citrus",
      "Magma",
      "Glacier",
    ]);
    expect(UI_PALETTES.map((item) => item.id)).toEqual([...UI_PALETTE_IDS]);
    expect(UI_PALETTES.filter((item) => item.kind === "solid").map((item) => item.id)).toEqual([
      "Forest",
      "Ocean",
      "Sunset",
      "Violet",
      "Midnight",
      "Obsidian",
      "Noir",
      "Dusk",
    ]);
    expect(UI_PALETTES.filter((item) => item.kind === "gradient").map((item) => item.id)).toEqual([
      "Aurora",
      "Ember",
      "Lagoon",
      "Twilight",
      "Citrus",
      "Magma",
      "Glacier",
    ]);
  });

  it("includes Q-177 dark palette ids Obsidian, Noir, and Dusk", () => {
    expect(UI_PALETTE_IDS).toEqual(
      expect.arrayContaining(["Obsidian", "Noir", "Dusk"]),
    );
    expect(isUiPaletteId("Obsidian")).toBe(true);
    expect(isUiPaletteId("Noir")).toBe(true);
    expect(isUiPaletteId("Dusk")).toBe(true);
  });

  it("treats missing or unknown stored ids as Forest without writing", () => {
    expect(readStoredUiPalette()).toBe("Forest");
    expect(window.localStorage.getItem(UI_PALETTE_STORAGE_KEY)).toBeNull();

    window.localStorage.setItem(UI_PALETTE_STORAGE_KEY, "neon");
    expect(isUiPaletteId("neon")).toBe(false);
    expect(readStoredUiPalette()).toBe("Forest");
    expect(window.localStorage.getItem(UI_PALETTE_STORAGE_KEY)).toBe("neon");
  });

  it("persists only the catalog id under the dedicated localStorage key", () => {
    writeStoredUiPalette("Ocean");
    expect(window.localStorage.getItem(UI_PALETTE_STORAGE_KEY)).toBe("Ocean");
    expect(readStoredUiPalette()).toBe("Ocean");
    expect(window.sessionStorage.length).toBe(0);
  });

  it("applies the palette id on the document root", () => {
    applyUiPaletteToDocument("Aurora");
    expect(document.documentElement.dataset.palette).toBe("Aurora");
  });
});
