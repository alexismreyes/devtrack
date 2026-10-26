import type { SystemProbe } from "../domain/system-probe";

export interface SystemRepository {
  createProbe(): Promise<SystemProbe>;
  listProbes(): Promise<SystemProbe[]>;
  isDatabaseReachable(): Promise<boolean>;
}
