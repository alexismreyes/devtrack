export type ProbeResponseDto = {
  id: string;
  recordedAt: string;
};

export type ProbeListResponseDto = {
  probes: ProbeResponseDto[];
};

export type HealthResponseDto = {
  status: "ok";
};

export type ReadyResponseDto = {
  status: "ready";
};

export function toProbeResponseDto(probe: {
  id: string;
  recordedAt: Date;
}): ProbeResponseDto {
  return {
    id: probe.id,
    recordedAt: probe.recordedAt.toISOString(),
  };
}
