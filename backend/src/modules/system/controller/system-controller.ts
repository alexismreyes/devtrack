import type { Request, Response } from "express";
import { serviceUnavailable } from "../../../infrastructure/http/app-error";
import {
  toProbeResponseDto,
  type HealthResponseDto,
  type ProbeListResponseDto,
  type ProbeResponseDto,
  type ReadyResponseDto,
} from "../dto/probe-dtos";
import type { SystemService } from "../service/system-service";

export class SystemController {
  constructor(private readonly service: SystemService) {}

  health(_req: Request, res: Response): void {
    const body: HealthResponseDto = { status: "ok" };
    res.status(200).json(body);
  }

  async ready(_req: Request, res: Response): Promise<void> {
    const reachable = await this.service.isReady();
    if (!reachable) {
      throw serviceUnavailable("Database is unavailable");
    }
    const body: ReadyResponseDto = { status: "ready" };
    res.status(200).json(body);
  }

  async createProbe(_req: Request, res: Response): Promise<void> {
    const probe = await this.service.recordProbe();
    const body: ProbeResponseDto = toProbeResponseDto(probe);
    res.status(201).json(body);
  }

  async listProbes(_req: Request, res: Response): Promise<void> {
    const probes = await this.service.listProbes();
    const body: ProbeListResponseDto = {
      probes: probes.map(toProbeResponseDto),
    };
    res.status(200).json(body);
  }
}
