import axios, { type AxiosError, type AxiosRequestConfig, type AxiosResponse } from "axios";

// API Response Types
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

// API Error class for better error handling
export class ApiError extends Error {
  code: string;
  status: number;
  details?: unknown;

  constructor(code: string, message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

// Token storage
let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
  if (typeof window !== "undefined") {
    if (token) {
      localStorage.setItem("accessToken", token);
    } else {
      localStorage.removeItem("accessToken");
    }
  }
}

export function getAccessToken(): string | null {
  if (accessToken) return accessToken;
  if (typeof window !== "undefined") {
    accessToken = localStorage.getItem("accessToken");
  }
  return accessToken;
}

export function clearAccessToken() {
  accessToken = null;
  if (typeof window !== "undefined") {
    localStorage.removeItem("accessToken");
  }
}

// Create axios instance
const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001",
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // Include cookies for refresh token
});

// Request interceptor - add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle token refresh
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function subscribeTokenRefresh(callback: (token: string) => void) {
  refreshSubscribers.push(callback);
}

function onRefreshed(token: string) {
  refreshSubscribers.forEach((callback) => callback(token));
  refreshSubscribers = [];
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorResponse>) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    // If 401 and not a retry, attempt token refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Wait for token refresh
        return new Promise((resolve) => {
          subscribeTokenRefresh((token: string) => {
            originalRequest.headers = originalRequest.headers || {};
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(apiClient(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const response = await apiClient.post<ApiSuccessResponse<{ accessToken: string }>>(
          "/auth/refresh"
        );

        if (response.data.success) {
          const newToken = response.data.data.accessToken;
          setAccessToken(newToken);
          onRefreshed(newToken);
          
          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, clear tokens and redirect to login
        clearAccessToken();
        if (typeof window !== "undefined") {
          window.location.href = "/auth/login";
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Transform error to ApiError
    if (error.response?.data?.error) {
      const { code, message, details } = error.response.data.error;
      throw new ApiError(code, message, error.response.status, details);
    }

    throw new ApiError(
      "NETWORK_ERROR",
      error.message || "Network error occurred",
      error.response?.status || 0
    );
  }
);

// Helper function to extract data from response
function extractData<T>(response: AxiosResponse<ApiSuccessResponse<T>>): T {
  if (response.data.success) {
    return response.data.data;
  }
  throw new ApiError("INVALID_RESPONSE", "Invalid response format", 500);
}

// API methods
export const api = {
  /**
   * GET request
   */
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await apiClient.get<ApiSuccessResponse<T>>(url, config);
    return extractData(response);
  },

  /**
   * POST request
   */
  async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await apiClient.post<ApiSuccessResponse<T>>(url, data, config);
    return extractData(response);
  },

  /**
   * PUT request
   */
  async put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await apiClient.put<ApiSuccessResponse<T>>(url, data, config);
    return extractData(response);
  },

  /**
   * PATCH request
   */
  async patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await apiClient.patch<ApiSuccessResponse<T>>(url, data, config);
    return extractData(response);
  },

  /**
   * DELETE request
   */
  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await apiClient.delete<ApiSuccessResponse<T>>(url, config);
    return extractData(response);
  },
};

// Export axios instance for advanced use cases
export { apiClient };
