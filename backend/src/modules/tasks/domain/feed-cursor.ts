export const DEFAULT_FEED_LIMIT = 5;
export const DEFAULT_CHECKLIST_ITEMS_LIMIT = 10;
export const MAX_FEED_LIMIT = 50;

export type FeedCursor = {
  createdAt: Date;
  id: string;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function encodeFeedCursor(cursor: FeedCursor): string {
  const payload = JSON.stringify({
    createdAt: cursor.createdAt.toISOString(),
    id: cursor.id,
  });
  return Buffer.from(payload, "utf8").toString("base64url");
}

export function decodeFeedCursor(token: string): FeedCursor {
  let parsed: unknown;
  try {
    const json = Buffer.from(token, "base64url").toString("utf8");
    parsed = JSON.parse(json) as unknown;
  } catch {
    throw new Error("Invalid feed cursor");
  }

  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("Invalid feed cursor");
  }

  const record = parsed as { createdAt?: unknown; id?: unknown };
  if (typeof record.createdAt !== "string" || typeof record.id !== "string") {
    throw new Error("Invalid feed cursor");
  }
  if (!UUID_PATTERN.test(record.id)) {
    throw new Error("Invalid feed cursor");
  }

  const createdAt = new Date(record.createdAt);
  if (Number.isNaN(createdAt.getTime())) {
    throw new Error("Invalid feed cursor");
  }

  return { createdAt, id: record.id };
}

export function isStrictlyOlderThanCursor(
  item: FeedCursor,
  cursor: FeedCursor,
): boolean {
  const itemTime = item.createdAt.getTime();
  const cursorTime = cursor.createdAt.getTime();
  if (itemTime < cursorTime) {
    return true;
  }
  if (itemTime > cursorTime) {
    return false;
  }
  return item.id < cursor.id;
}

export function compareNewestFirst(left: FeedCursor, right: FeedCursor): number {
  const byTime = right.createdAt.getTime() - left.createdAt.getTime();
  if (byTime !== 0) {
    return byTime;
  }
  return right.id.localeCompare(left.id);
}

export function takeNewestPage<T extends FeedCursor>(
  items: T[],
  limit: number,
  cursor: FeedCursor | null,
): { items: T[]; nextCursor: FeedCursor | null } {
  const sorted = [...items].sort(compareNewestFirst);
  const filtered =
    cursor === null
      ? sorted
      : sorted.filter((item) => isStrictlyOlderThanCursor(item, cursor));
  const page = filtered.slice(0, limit);
  const last = page[page.length - 1];
  const nextCursor =
    filtered.length > limit && last !== undefined
      ? { createdAt: last.createdAt, id: last.id }
      : null;
  return { items: page, nextCursor };
}

export function isStrictlyNewerThanCursor(
  item: FeedCursor,
  cursor: FeedCursor,
): boolean {
  const itemTime = item.createdAt.getTime();
  const cursorTime = cursor.createdAt.getTime();
  if (itemTime > cursorTime) {
    return true;
  }
  if (itemTime < cursorTime) {
    return false;
  }
  return item.id > cursor.id;
}

export function compareOldestFirst(left: FeedCursor, right: FeedCursor): number {
  const byTime = left.createdAt.getTime() - right.createdAt.getTime();
  if (byTime !== 0) {
    return byTime;
  }
  return left.id.localeCompare(right.id);
}

export function takeOldestPage<T extends FeedCursor>(
  items: T[],
  limit: number,
  cursor: FeedCursor | null,
): { items: T[]; nextCursor: FeedCursor | null } {
  const sorted = [...items].sort(compareOldestFirst);
  const filtered =
    cursor === null
      ? sorted
      : sorted.filter((item) => isStrictlyNewerThanCursor(item, cursor));
  const page = filtered.slice(0, limit);
  const last = page[page.length - 1];
  const nextCursor =
    filtered.length > limit && last !== undefined
      ? { createdAt: last.createdAt, id: last.id }
      : null;
  return { items: page, nextCursor };
}
