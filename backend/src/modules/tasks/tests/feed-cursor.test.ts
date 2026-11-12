import { describe, expect, it } from "vitest";
import {
  decodeFeedCursor,
  encodeFeedCursor,
  takeNewestPage,
  takeOldestPage,
} from "../domain/feed-cursor";

describe("feed cursor", () => {
  it("round-trips createdAt and id", () => {
    const cursor = {
      createdAt: new Date("2026-11-09T12:00:00.000Z"),
      id: "11111111-1111-4111-8111-111111111111",
    };
    expect(decodeFeedCursor(encodeFeedCursor(cursor))).toEqual(cursor);
  });

  it("rejects malformed cursors", () => {
    expect(() => decodeFeedCursor("not-valid")).toThrow(/invalid feed cursor/i);
    expect(() =>
      decodeFeedCursor(
        Buffer.from(JSON.stringify({ createdAt: "nope", id: "x" }), "utf8").toString(
          "base64url",
        ),
      ),
    ).toThrow(/invalid feed cursor/i);
  });

  it("pages newest-first without duplicates", () => {
    const items = [
      {
        id: "11111111-1111-4111-8111-111111111111",
        createdAt: new Date("2026-11-01T00:00:00.000Z"),
      },
      {
        id: "22222222-2222-4222-8222-222222222222",
        createdAt: new Date("2026-11-02T00:00:00.000Z"),
      },
      {
        id: "33333333-3333-4333-8333-333333333333",
        createdAt: new Date("2026-11-03T00:00:00.000Z"),
      },
    ];

    const first = takeNewestPage(items, 2, null);
    expect(first.items.map((item) => item.id)).toEqual([
      "33333333-3333-4333-8333-333333333333",
      "22222222-2222-4222-8222-222222222222",
    ]);
    expect(first.nextCursor).not.toBeNull();

    const second = takeNewestPage(items, 2, first.nextCursor);
    expect(second.items.map((item) => item.id)).toEqual([
      "11111111-1111-4111-8111-111111111111",
    ]);
    expect(second.nextCursor).toBeNull();
  });

  it("pages oldest-first without duplicates", () => {
    const items = [
      {
        id: "11111111-1111-4111-8111-111111111111",
        createdAt: new Date("2026-11-01T00:00:00.000Z"),
      },
      {
        id: "22222222-2222-4222-8222-222222222222",
        createdAt: new Date("2026-11-02T00:00:00.000Z"),
      },
      {
        id: "33333333-3333-4333-8333-333333333333",
        createdAt: new Date("2026-11-03T00:00:00.000Z"),
      },
    ];

    const first = takeOldestPage(items, 2, null);
    expect(first.items.map((item) => item.id)).toEqual([
      "11111111-1111-4111-8111-111111111111",
      "22222222-2222-4222-8222-222222222222",
    ]);
    expect(first.nextCursor).not.toBeNull();

    const second = takeOldestPage(items, 2, first.nextCursor);
    expect(second.items.map((item) => item.id)).toEqual([
      "33333333-3333-4333-8333-333333333333",
    ]);
    expect(second.nextCursor).toBeNull();
  });
});
