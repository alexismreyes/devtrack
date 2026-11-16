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

const NEW_DARK_IDS = [
  "MidnightAurora",
  "ObsidianGold",
  "CyberpunkDreams",
  "DeepOcean",
  "CherryBlossom",
  "ToxicEmerald",
  "CosmicLavender",
  "NeoGlass",
  "Dribbble",
  "OledBlack",
  "LuxuryDark",
  "CyberAesthetic",
] as const;

const REMOVED_DARK_IDS = [
  "Midnight",
  "Obsidian",
  "Noir",
  "Dusk",
  "VioletNight",
  "CyanEdge",
  "Graphite",
] as const;

describe("Q-041 UI palette catalog (039 dark refresh)", () => {
  it("documents Forest as default plus lights, twelve new darks, and gradients (AC-001/AC-003)", () => {
    expect(DEFAULT_UI_PALETTE).toBe("Forest");
    expect([...UI_PALETTE_IDS]).toEqual([
      "Forest",
      "Ocean",
      "Sunset",
      "Violet",
      ...NEW_DARK_IDS,
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
      ...NEW_DARK_IDS,
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

  it("adds twelve guide dark ids with FR-002 labels (AC-001)", () => {
    expect(UI_PALETTE_IDS).toEqual(expect.arrayContaining([...NEW_DARK_IDS]));
    expect(UI_PALETTES.find((item) => item.id === "MidnightAurora")).toEqual({
      id: "MidnightAurora",
      label: "Midnight Aurora",
      kind: "solid",
    });
    expect(UI_PALETTES.find((item) => item.id === "ObsidianGold")).toEqual({
      id: "ObsidianGold",
      label: "Obsidian & Gold",
      kind: "solid",
    });
    expect(UI_PALETTES.find((item) => item.id === "NeoGlass")).toEqual({
      id: "NeoGlass",
      label: "Neo-Glass",
      kind: "solid",
    });
    expect(UI_PALETTES.find((item) => item.id === "Dribbble")).toEqual({
      id: "Dribbble",
      label: "Dribbble Aesthetic",
      kind: "solid",
    });
    expect(UI_PALETTES.find((item) => item.id === "OledBlack")).toEqual({
      id: "OledBlack",
      label: "OLED Black",
      kind: "solid",
    });
  });

  it("removes the seven retired dark palette ids (AC-002)", () => {
    for (const id of REMOVED_DARK_IDS) {
      expect(UI_PALETTE_IDS).not.toContain(id);
      expect(isUiPaletteId(id)).toBe(false);
    }
  });

  it("treats missing, unknown, or removed stored ids as Forest without writing (AC-004)", () => {
    expect(readStoredUiPalette()).toBe("Forest");
    expect(window.localStorage.getItem(UI_PALETTE_STORAGE_KEY)).toBeNull();

    window.localStorage.setItem(UI_PALETTE_STORAGE_KEY, "neon");
    expect(isUiPaletteId("neon")).toBe(false);
    expect(readStoredUiPalette()).toBe("Forest");
    expect(window.localStorage.getItem(UI_PALETTE_STORAGE_KEY)).toBe("neon");

    window.localStorage.setItem(UI_PALETTE_STORAGE_KEY, "Obsidian");
    expect(readStoredUiPalette()).toBe("Forest");
    window.localStorage.setItem(UI_PALETTE_STORAGE_KEY, "VioletNight");
    expect(readStoredUiPalette()).toBe("Forest");
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
