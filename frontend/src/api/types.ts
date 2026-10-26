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

export type PublicUserDto = {
  id: string;
  email: string;
  displayName: string;
};

export type RegisterRequestDto = {
  email: string;
  password: string;
  displayName: string;
};

export type LoginRequestDto = {
  email: string;
  password: string;
};

export type UpdateProfileRequestDto = {
  displayName: string;
};

export type ErrorEnvelope = {
  error: {
    code: string;
    message: string;
  };
};
