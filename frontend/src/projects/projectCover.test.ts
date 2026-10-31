import { describe, expect, it } from "vitest";
import { projectCoverFromName, projectInitials } from "./projectCover";

describe("projectCover", () => {
  it("derives initials from the first letter of the first two tokens", () => {
    expect(projectInitials("Alpha Board")).toBe("AB");
  });

  it("uses the first two characters of a single token", () => {
    expect(projectInitials("Alpha")).toBe("AL");
  });

  it("uses one character when the name has only one", () => {
    expect(projectInitials("A")).toBe("A");
  });

  it("falls back for an empty name", () => {
    expect(projectInitials("   ")).toBe("?");
  });

  it("returns a cover with initials and palette classes without a hex value", () => {
    const cover = projectCoverFromName("Alpha Board");
    expect(cover.initials).toBe("AB");
    expect(cover.backgroundClass.length).toBeGreaterThan(0);
    expect(cover.foregroundClass.length).toBeGreaterThan(0);
    expect(cover.backgroundClass).not.toMatch(/^#/);
    expect(cover.foregroundClass).not.toMatch(/^#/);
  });

  it("is deterministic for the same name", () => {
    expect(projectCoverFromName("Alpha")).toEqual(projectCoverFromName("Alpha"));
  });
});
