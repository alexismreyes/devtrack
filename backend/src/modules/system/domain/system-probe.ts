import { randomUUID } from "node:crypto";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class SystemProbe {
  readonly id: string;
  readonly recordedAt: Date;

  private constructor(id: string, recordedAt: Date) {
    if (!UUID_PATTERN.test(id)) {
      throw new Error("System probe id must be a UUID");
    }
    if (Number.isNaN(recordedAt.getTime())) {
      throw new Error("System probe recorded time must be a valid date");
    }

    this.id = id;
    this.recordedAt = new Date(recordedAt.getTime());
    Object.freeze(this);
  }

  static record(now: Date = new Date()): SystemProbe {
    return new SystemProbe(randomUUID(), now);
  }

  static rehydrate(id: string, recordedAt: Date): SystemProbe {
    return new SystemProbe(id, recordedAt);
  }
}
