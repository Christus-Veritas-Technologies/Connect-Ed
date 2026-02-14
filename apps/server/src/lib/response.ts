import type { Context } from "hono";

// Standard API response types
export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

// Response helpers
export function successResponse<T>(c: Context, data: T, status: 200 | 201 = 200) {
  return c.json<ApiSuccessResponse<T>>({ success: true, data }, status);
}

export function errorResponse(
  c: Context,
  code: string,
  message: string,
  status: number = 400,
  details?: unknown
) {
  return c.json<ApiErrorResponse>(
    {
      success: false,
      error: { code, message, details },
    },
    status as any
  );
}

// Common error responses
export const errors = {
  unauthorized: (c: Context) =>
    errorResponse(c, "UNAUTHORIZED", "Authentication required", 401),

  forbidden: (c: Context) =>
    errorResponse(c, "FORBIDDEN", "You do not have permission to access this resource", 403),

  notFound: (c: Context, resource: string = "Resource") =>
    errorResponse(c, "NOT_FOUND", `${resource} not found`, 404),

  badRequest: (c: Context, message: string = "Bad request") =>
    errorResponse(c, "BAD_REQUEST", message, 400),

  validationError: (c: Context, details: unknown) =>
    errorResponse(c, "VALIDATION_ERROR", "Invalid request data", 400, details),

  internalError: (c: Context) =>
    errorResponse(c, "INTERNAL_ERROR", "An unexpected error occurred", 500),

  paymentRequired: (c: Context) =>
    errorResponse(c, "PAYMENT_REQUIRED", "Payment is required to access this feature", 402),

  planUpgradeRequired: (c: Context) =>
    errorResponse(c, "PLAN_UPGRADE_REQUIRED", "This feature requires a higher plan tier", 403),

  quotaExceeded: (c: Context, type: string) =>
    errorResponse(c, "QUOTA_EXCEEDED", `${type} quota exceeded for this billing period`, 429),

  conflict: (c: Context, message: string) =>
    errorResponse(c, "CONFLICT", message, 409),
};
