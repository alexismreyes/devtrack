import { describe, expect, it } from "vitest";
import { SystemProbe } from "../domain/system-probe";

describe("SystemProbe domain", () => {
  it("assigns a UUID identity and recorded time when recorded by the system", () => {
    const before = Date.now();
    const probe = SystemProbe.record();
    const after = Date.now();

    expect(probe.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(probe.recordedAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(probe.recordedAt.getTime()).toBeLessThanOrEqual(after);
  });

  it("assigns distinct identities for each recorded probe", () => {
    const first = SystemProbe.record();
    const second = SystemProbe.record();
    expect(first.id).not.toBe(second.id);
  });

  it("uses the provided clock for recorded time", () => {
    const now = new Date("2026-10-26T16:00:00.000Z");
    const probe = SystemProbe.record(now);
    expect(probe.recordedAt.toISOString()).toBe("2026-10-26T16:00:00.000Z");
  });

  it("rehydrates persisted identity and time without changing them", () => {
    const id = "11111111-1111-4111-8111-111111111111";
    const recordedAt = new Date("2026-01-02T03:04:05.000Z");
    const probe = SystemProbe.rehydrate(id, recordedAt);

    expect(probe.id).toBe(id);
    expect(probe.recordedAt.toISOString()).toBe("2026-01-02T03:04:05.000Z");
  });

  it("does not expose mutators and is frozen after creation", () => {
    const probe = SystemProbe.record();
    expect(Object.isFrozen(probe)).toBe(true);
    expect(() => {
      (probe as { id: string }).id = "22222222-2222-4222-8222-222222222222";
    }).toThrow();
  });
});
