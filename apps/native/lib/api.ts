import axios, { type AxiosError, type AxiosRequestConfig, type AxiosResponse } from 'axios';
import { API_URL } from './constants';
import { getAccessToken, setAccessToken, clearAccessToken } from './secure-store';

// ── Response types (matching server) ──

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

export class ApiError extends Error {
  code: string;
  status: number;
  details?: unknown;

  constructor(code: string, message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

// ── Axios instance ──

const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

// Request interceptor — attach token
apiClient.interceptors.request.use(async (config) => {
  const token = await getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor — handle 401 refresh
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function subscribeTokenRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

function onRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

// Global callback set by AuthProvider so we can trigger logout from the API layer
let onForceLogout: (() => void) | null = null;
export function setForceLogoutCallback(cb: () => void) {
  onForceLogout = cb;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorResponse>) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };
    const requestUrl = originalRequest.url || '';

    const publicEndpoints = ['/auth/login', '/auth/signup', '/auth/forgot-password'];
    const isPublic = publicEndpoints.some((ep) => requestUrl.includes(ep));

    if (error.response?.status === 401 && !originalRequest._retry && !isPublic) {
      if (isRefreshing) {
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
          '/auth/refresh'
        );

        if (response.data.success) {
          const newToken = response.data.data.accessToken;
          await setAccessToken(newToken);
          onRefreshed(newToken);

          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return apiClient(originalRequest);
        }
      } catch {
        await clearAccessToken();
        onForceLogout?.();
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }

    // Transform to ApiError
    if (error.response?.data?.error) {
      const { code, message, details } = error.response.data.error;
      throw new ApiError(code, message, error.response.status, details);
    }

    throw new ApiError(
      'NETWORK_ERROR',
      error.message || 'Network error occurred',
      error.response?.status || 0
    );
  }
);

// ── Helper ──

function extractData<T>(response: AxiosResponse<ApiSuccessResponse<T>>): T {
  if (response.data.success) return response.data.data;
  throw new ApiError('INVALID_RESPONSE', 'Invalid response format', 500);
}

// ── Public API ──

export const api = {
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await apiClient.get<ApiSuccessResponse<T>>(url, config);
    return extractData(response);
  },
  async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await apiClient.post<ApiSuccessResponse<T>>(url, data, config);
    return extractData(response);
  },
  async put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await apiClient.put<ApiSuccessResponse<T>>(url, data, config);
    return extractData(response);
  },
  async patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await apiClient.patch<ApiSuccessResponse<T>>(url, data, config);
    return extractData(response);
  },
  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await apiClient.delete<ApiSuccessResponse<T>>(url, config);
    return extractData(response);
  },
};

export { apiClient };
