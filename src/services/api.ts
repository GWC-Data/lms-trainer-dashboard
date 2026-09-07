import axios, { AxiosError } from "axios";

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000,
});

// Storage keys
export const TOKEN_STORAGE_KEY = "teqcertify_token";
export const USER_STORAGE_KEY = "teqcertify_user";

// Request interceptor — attach Bearer token if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — handle 401 global unauthorized
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      const isLoginRequest = error.config?.url?.includes("/auth/login");
      if (!isLoginRequest) {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        localStorage.removeItem(USER_STORAGE_KEY);
        if (
          window.location.pathname !== "/login" &&
          !window.location.pathname.startsWith("/set-password")
        ) {
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  }
);

export interface BackendUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  jobBoardAccess?: string;
  roleId: string;
  role: string;
  permissions?: string[];
}

export interface LoginResponse {
  message: string;
  login: {
    accessToken: string;
    tokenExpiry: number;
    user: BackendUser;
  };
}

export interface VerifyTokenResponse {
  success: boolean;
  message?: string;
  email?: string;
  firstName?: string;
  role?: string;
}

export interface SetPasswordResponse {
  success: boolean;
  message: string;
}

/**
 * Real Login API: POST /auth/login
 */
export async function loginApi(email: string, password: string): Promise<LoginResponse> {
  const response = await api.post<LoginResponse>("/auth/login", {
    email: email.trim().toLowerCase(),
    password,
  });
  return response.data;
}

/**
 * Real Token Verification API: GET /set-password/verify?token=...&email=...
 */
export async function verifySetupTokenApi(token: string, email?: string): Promise<VerifyTokenResponse> {
  const response = await api.get<VerifyTokenResponse>("/set-password/verify", {
    params: { token, ...(email ? { email: email.trim().toLowerCase() } : {}) },
  });
  return response.data;
}

/**
 * Real Set Password API: POST /set-password
 */
export async function setPasswordApi(
  token: string,
  newPassword: string,
  email?: string
): Promise<SetPasswordResponse> {
  const response = await api.post<SetPasswordResponse>(
    `/set-password?token=${encodeURIComponent(token)}`,
    {
      newPassword,
      password: newPassword,
      token,
      ...(email ? { email: email.trim().toLowerCase() } : {}),
    }
  );
  return response.data;
}

export interface TrainerEmailResponse {
  success: boolean;
  message: string;
  token?: string;
}

export interface ForgotPasswordResponse {
  success: boolean;
  message: string;
  token?: string;
}

export interface ResetPasswordResponse {
  success: boolean;
  message: string;
}

/**
 * Real Trainer Email / First-time invite request: POST /auth/trainer-email
 */
export async function trainerEmailApi(email: string, token?: string): Promise<TrainerEmailResponse> {
  const response = await api.post<TrainerEmailResponse>("/auth/trainer-email", {
    email: email.trim().toLowerCase(),
    ...(token ? { token } : {}),
  });
  return response.data;
}

/**
 * Real Forgot Password request: POST /auth/forgot-password
 */
export async function forgotPasswordApi(email: string): Promise<ForgotPasswordResponse> {
  const response = await api.post<ForgotPasswordResponse>("/auth/forgot-password", {
    email: email.trim().toLowerCase(),
  });
  return response.data;
}

/**
 * Real Reset Token Verification: GET /auth/reset-password/verify?token=...
 */
export async function verifyResetTokenApi(token: string): Promise<VerifyTokenResponse> {
  const response = await api.get<VerifyTokenResponse>("/auth/reset-password/verify", {
    params: { token },
  });
  return response.data;
}

/**
 * Real Reset Password API: POST /auth/reset-password
 */
export async function resetPasswordApi(token: string, newPassword: string): Promise<ResetPasswordResponse> {
  const response = await api.post<ResetPasswordResponse>(
    `/auth/reset-password?token=${encodeURIComponent(token)}`,
    {
      newPassword,
      token,
    }
  );
  return response.data;
}

