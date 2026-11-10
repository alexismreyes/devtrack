// @ts-nocheck — reads CSS via Node fs; project tsconfig does not include @types/node for runtime.
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { EYECANDY_SURFACE_CLASS, UI_PALETTE_IDS } from "./uiPalettes";

describe("023 UI eyecandy theme tokens", () => {
  const cssPath = resolve(dirname(fileURLToPath(import.meta.url)), "../index.css");
  const css = readFileSync(cssPath, "utf8");

  it("defines CSS tokens and previews for Obsidian, Noir, and Dusk (AC-003)", () => {
    for (const id of ["Obsidian", "Noir", "Dusk"] as const) {
      expect(UI_PALETTE_IDS).toContain(id);
      expect(css).toContain(`[data-palette="${id}"]`);
      expect(css).toContain(`.ui-palette-preview[data-preview-palette="${id}"]`);
    }
  });

  it("defines CSS tokens and previews for VioletNight, CyanEdge, and Graphite (033 AC-003)", () => {
    for (const id of ["VioletNight", "CyanEdge", "Graphite"] as const) {
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

  it("defines eyecandy surface tokens and utility for every catalog palette (AC-002/004/005)", () => {
    expect(EYECANDY_SURFACE_CLASS).toBe("bg-eyecandy-surface");
    expect(css).toContain(".bg-eyecandy-surface");
    expect(css).toContain("--eyecandy-surface-image:");
    const eyecandyDefs = css.match(/^\s*--eyecandy-surface-image:/gm) ?? [];
    expect(eyecandyDefs.length).toBeGreaterThanOrEqual(UI_PALETTE_IDS.length);
  });
});
