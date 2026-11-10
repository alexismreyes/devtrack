// @ts-nocheck — reads CSS via Node fs; project tsconfig does not include @types/node.
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

describe("popover theme tokens", () => {
  it("maps popover colors in @theme and defines opaque tokens per palette", () => {
    const cssPath = resolve(dirname(fileURLToPath(import.meta.url)), "index.css");
    const css = readFileSync(cssPath, "utf8");

    expect(css).toContain("--color-popover: var(--popover)");
    expect(css).toContain(
      "--color-popover-foreground: var(--popover-foreground)",
    );

    const paletteCount = (css.match(/\[data-palette="/g) ?? []).length;
    expect(paletteCount).toBeGreaterThanOrEqual(15);

    const popoverDefs = css.match(/^\s*--popover:/gm) ?? [];
    expect(popoverDefs.length).toBeGreaterThanOrEqual(15);
    expect(css.match(/^\s*--popover-foreground:/gm)?.length).toBe(
      popoverDefs.length,
    );
  });
});
