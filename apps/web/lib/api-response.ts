import { NextResponse } from "next/server";

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
export function successResponse<T>(data: T, status = 200) {
  return NextResponse.json<ApiSuccessResponse<T>>(
    { success: true, data },
    { status }
  );
}

export function errorResponse(
  code: string,
  message: string,
  status = 400,
  details?: unknown
) {
  return NextResponse.json<ApiErrorResponse>(
    {
      success: false,
      error: { code, message, details },
    },
    { status }
  );
}

// Common error responses
export const errors = {
  unauthorized: () =>
    errorResponse("UNAUTHORIZED", "Authentication required", 401),

  forbidden: () =>
    errorResponse("FORBIDDEN", "You do not have permission to access this resource", 403),

  notFound: (resource = "Resource") =>
    errorResponse("NOT_FOUND", `${resource} not found`, 404),

  validationError: (details: unknown) =>
    errorResponse("VALIDATION_ERROR", "Invalid request data", 400, details),

  internalError: () =>
    errorResponse("INTERNAL_ERROR", "An unexpected error occurred", 500),

  paymentRequired: () =>
    errorResponse("PAYMENT_REQUIRED", "Payment is required to access this feature", 402),

  planUpgradeRequired: () =>
    errorResponse(
      "PLAN_UPGRADE_REQUIRED",
      "This feature requires a higher plan tier",
      403
    ),

  quotaExceeded: (type: string) =>
    errorResponse("QUOTA_EXCEEDED", `${type} quota exceeded for this billing period`, 429),

  conflict: (message: string) =>
    errorResponse("CONFLICT", message, 409),
};
