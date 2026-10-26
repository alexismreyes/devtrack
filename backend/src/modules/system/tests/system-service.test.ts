import { describe, expect, it } from "vitest";
import { DatabaseUnavailableError } from "../domain/errors";
import { SystemProbe } from "../domain/system-probe";
import type { SystemRepository } from "../repository/system-repository";
import { SystemService } from "../service/system-service";

class FakeSystemRepository implements SystemRepository {
  probes: SystemProbe[] = [];
  reachable = true;

  async createProbe(): Promise<SystemProbe> {
    if (!this.reachable) {
      throw new DatabaseUnavailableError();
    }
    const probe = SystemProbe.record();
    this.probes.unshift(probe);
    return probe;
  }

  async listProbes(): Promise<SystemProbe[]> {
    if (!this.reachable) {
      throw new DatabaseUnavailableError();
    }
    return [...this.probes];
  }

  async isDatabaseReachable(): Promise<boolean> {
    return this.reachable;
  }
}

describe("SystemService", () => {
  it("records a probe through the repository", async () => {
    const repository = new FakeSystemRepository();
    const service = new SystemService(repository);

    const probe = await service.recordProbe();

    expect(repository.probes).toHaveLength(1);
    expect(repository.probes[0]?.id).toBe(probe.id);
  });

  it("lists probes newest first as stored by the repository", async () => {
    const repository = new FakeSystemRepository();
    const service = new SystemService(repository);
    const first = await service.recordProbe();
    const second = await service.recordProbe();

    const listed = await service.listProbes();

    expect(listed.map((probe) => probe.id)).toEqual([second.id, first.id]);
  });

  it("reports readiness from the repository", async () => {
    const repository = new FakeSystemRepository();
    const service = new SystemService(repository);

    await expect(service.isReady()).resolves.toBe(true);

    repository.reachable = false;
    await expect(service.isReady()).resolves.toBe(false);
  });

  it("surfaces database unavailability from create and list", async () => {
    const repository = new FakeSystemRepository();
    repository.reachable = false;
    const service = new SystemService(repository);

    await expect(service.recordProbe()).rejects.toBeInstanceOf(
      DatabaseUnavailableError,
    );
    await expect(service.listProbes()).rejects.toBeInstanceOf(
      DatabaseUnavailableError,
    );
  });
});
