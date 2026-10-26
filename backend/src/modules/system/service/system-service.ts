import type { SystemProbe } from "../domain/system-probe";
import type { SystemRepository } from "../repository/system-repository";

export class SystemService {
  constructor(private readonly repository: SystemRepository) {}

  recordProbe(): Promise<SystemProbe> {
    return this.repository.createProbe();
  }

  listProbes(): Promise<SystemProbe[]> {
    return this.repository.listProbes();
  }

  isReady(): Promise<boolean> {
    return this.repository.isDatabaseReachable();
  }
}
