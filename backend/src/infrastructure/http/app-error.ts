export const ERROR_CODES = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;

  constructor(code: ErrorCode, message: string, status: number) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
  }
}

export function validationError(message: string): AppError {
  return new AppError(ERROR_CODES.VALIDATION_ERROR, message, 400);
}

export function serviceUnavailable(message: string): AppError {
  return new AppError(ERROR_CODES.SERVICE_UNAVAILABLE, message, 503);
}

export function internalError(
  message = "An unexpected error occurred",
): AppError {
  return new AppError(ERROR_CODES.INTERNAL_ERROR, message, 500);
}

export type ErrorEnvelope = {
  error: {
    code: ErrorCode;
    message: string;
  };
};

export function errorEnvelope(code: ErrorCode, message: string): ErrorEnvelope {
  return { error: { code, message } };
}
