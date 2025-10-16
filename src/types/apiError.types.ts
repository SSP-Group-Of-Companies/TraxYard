// src/types/apiError.types.ts
export enum EEApiErrorType {
  SESSION_REQUIRED = "SESSION_REQUIRED", // Missing/expired/revoked or otherwise invalid onboarding session
  VALIDATION_ERROR = "VALIDATION_ERROR", // Mongoose or business-rule validation failure
  NOT_FOUND = "NOT_FOUND", // Resource not found
  UNAUTHORIZED = "UNAUTHORIZED", // Authn failed (admin, etc.)
  FORBIDDEN = "FORBIDDEN", // Authz failed
  CONFLICT = "CONFLICT", // Duplicate / conflicting state
  RATE_LIMITED = "RATE_LIMITED", // Too many requests
  INTERNAL = "INTERNAL", // Unexpected server error
}
