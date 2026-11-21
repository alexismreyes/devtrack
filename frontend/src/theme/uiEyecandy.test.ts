// @ts-nocheck — reads CSS via Node fs; project tsconfig does not include @types/node for runtime.
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { EYECANDY_SURFACE_CLASS, UI_PALETTE_IDS } from "./uiPalettes";

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

describe("023 UI eyecandy theme tokens (039 dark refresh)", () => {
  const cssPath = resolve(dirname(fileURLToPath(import.meta.url)), "../index.css");
  const css = readFileSync(cssPath, "utf8");

  it("defines CSS tokens and previews for twelve new dark palettes (AC-001)", () => {
    for (const id of NEW_DARK_IDS) {
      expect(UI_PALETTE_IDS).toContain(id);
      expect(css).toContain(`[data-palette="${id}"]`);
      expect(css).toContain(`.ui-palette-preview[data-preview-palette="${id}"]`);
      expect(css).toMatch(
        new RegExp(`\\[data-palette="${id}"\\][\\s\\S]*?--eyecandy-surface-image:`),
      );
      expect(css).toMatch(
        new RegExp(`\\[data-palette="${id}"\\][\\s\\S]*?--popover:`),
      );
    }
  });

  it("does not retain CSS blocks for removed dark palette ids (AC-002)", () => {
    for (const id of REMOVED_DARK_IDS) {
      expect(UI_PALETTE_IDS).not.toContain(id);
      expect(css).not.toContain(`[data-palette="${id}"]`);
      expect(css).not.toContain(`.ui-palette-preview[data-preview-palette="${id}"]`);
    }
  });

  it("defines eyecandy surface tokens and utility for every catalog palette (AC-002/004/005)", () => {
    expect(EYECANDY_SURFACE_CLASS).toBe("bg-eyecandy-surface");
    expect(css).toContain(".bg-eyecandy-surface");
    expect(css).toContain("--eyecandy-surface-image:");
    const eyecandyDefs = css.match(/^\s*--eyecandy-surface-image:/gm) ?? [];
    expect(eyecandyDefs.length).toBeGreaterThanOrEqual(UI_PALETTE_IDS.length);
  });
});
