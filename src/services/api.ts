import axios, { AxiosError } from "axios";
import { getOrCreateDeviceId } from "@/lib/deviceId";

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
export const REFRESH_TOKEN_STORAGE_KEY = "teqcertify_refresh_token";
export const USER_STORAGE_KEY = "teqcertify_user";

// Public auth endpoints that must never attach or depend on an Authorization Bearer token
export const PUBLIC_AUTH_PATHS = [
  "/auth/login",
  "/auth/forgot-password",
  "/forgot-password",
  "/auth/reset-password",
  "/reset-password",
  "/set-password",
  "/auth/refresh-token",
  "/auth/verify-otp",
  "/auth/resend-otp",
];

function clearAuthStorage() {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
  localStorage.removeItem(USER_STORAGE_KEY);
}

function redirectToLoginIfNeeded() {
  if (
    window.location.pathname !== "/login" &&
    !window.location.pathname.startsWith("/set-password") &&
    !window.location.pathname.startsWith("/forgot-password") &&
    !window.location.pathname.startsWith("/reset-password")
  ) {
    window.location.href = "/login";
  }
}

// Request interceptor — attach Bearer token if available, EXCEPT for public auth endpoints
api.interceptors.request.use(
  (config) => {
    const url = config.url || "";
    const isPublicAuth = PUBLIC_AUTH_PATHS.some((path) => url.includes(path));

    if (isPublicAuth) {
      // Ensure public auth requests never attach or depend on a stale JWT in localStorage
      if (config.headers && "Authorization" in config.headers) {
        delete config.headers.Authorization;
      }
    } else {
      const token = localStorage.getItem(TOKEN_STORAGE_KEY);
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Shared in-flight refresh promise so multiple 401s firing at once (e.g.
// several widgets fetching in parallel) trigger exactly one refresh call
// instead of a stampede of redundant ones.
let refreshInFlight: Promise<string | null> | null = null;

async function performTokenRefresh(): Promise<string | null> {
  const storedRefreshToken = localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
  if (!storedRefreshToken) return null;

  try {
    const response = await api.post<RefreshTokenResponse>("/auth/refresh-token", {
      refreshToken: storedRefreshToken,
    });
    const { accessToken, refreshToken } = response.data;
    localStorage.setItem(TOKEN_STORAGE_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, refreshToken);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("auth:token-refreshed", { detail: accessToken }));
    }
    return accessToken;
  } catch {
    return null;
  }
}

// Response interceptor — on 401, attempt one silent token refresh before
// falling back to a hard logout/redirect.
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as (typeof error.config & { _retry?: boolean }) | undefined;
    const url = originalRequest?.url || "";
    const isPublicAuth = PUBLIC_AUTH_PATHS.some((path) => url.includes(path));

    if (error.response?.status === 401 && !isPublicAuth && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;

      if (!refreshInFlight) {
        refreshInFlight = performTokenRefresh().finally(() => {
          refreshInFlight = null;
        });
      }
      const newAccessToken = await refreshInFlight;

      if (newAccessToken) {
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api.request(originalRequest);
      }

      clearAuthStorage();
      redirectToLoginIfNeeded();
    }
    return Promise.reject(error);
  }
);

// Coalesce in-flight concurrent GET requests with identical URL + params
// to eliminate duplicate network calls (e.g., from React StrictMode double-mounting or multiple widgets)
const inFlightGetRequests = new Map<string, Promise<any>>();

export function deduplicatedGet<T = any>(url: string, config?: any): Promise<T> {
  const paramsKey = config?.params ? JSON.stringify(config.params) : "";
  const key = `${url}?${paramsKey}`;

  if (inFlightGetRequests.has(key)) {
    return inFlightGetRequests.get(key)!;
  }

  const promise = api.get<T>(url, config)
    .then((response) => response.data)
    .finally(() => {
      inFlightGetRequests.delete(key);
    });

  inFlightGetRequests.set(key, promise);
  return promise;
}

export interface BackendUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  jobBoardAccess?: string;
  roleId?: string;
  role?: string;
  permissions?: string[];
}

// Two shapes: a device that already verified OTP today (calendar-day rule,
// not a rolling window) gets tokens back immediately with requiresOtp:
// false; any other device gets requiresOtp: true and must go through
// /auth/verify-otp.
export interface LoginOtpRequiredResponse {
  success: boolean;
  requiresOtp: true;
  message: string;
  verificationId: string;
}

export interface LoginPayload {
  accessToken: string;
  refreshToken: string;
  tokenExpiry: number;
  user: BackendUser;
}

export interface LoginAlreadyVerifiedTodayResponse {
  success: boolean;
  requiresOtp?: boolean;
  message: string;
  login?: {
    accessToken: string;
    refreshToken: string;
    tokenExpiry: number;
    user: BackendUser;
  };
  accessToken?: string;
  refreshToken?: string;
  tokenExpiry?: number;
  user?: BackendUser;
}

export type LoginResponse = LoginOtpRequiredResponse | LoginAlreadyVerifiedTodayResponse;

export interface VerifyOtpResponse {
  success: boolean;
  message: string;
  accessToken: string;
  refreshToken: string;
  tokenExpiry: number;
  user: BackendUser;
}

export interface ResendOtpResponse {
  success: boolean;
  message: string;
}

export interface RefreshTokenResponse {
  message: string;
  accessToken: string;
  refreshToken: string;
  tokenExpiry: number;
}

export interface DeviceSession {
  sessionId: string;
  deviceName: string;
  ipAddress: string;
  createdAt: string;
  lastActiveAt: string;
  expiresAt: string;
  isCurrentSession: boolean;
}

export interface DevicesResponse {
  devices: DeviceSession[];
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
  const response = await api.post<any>("/auth/login", {
    email: email.trim().toLowerCase(),
    password,
    deviceId: getOrCreateDeviceId(),
  });
  const data = response.data;
  const payload = data?.login || data;
  return {
    ...data,
    accessToken: payload.accessToken || data.accessToken,
    refreshToken: payload.refreshToken || data.refreshToken,
    tokenExpiry: payload.tokenExpiry || data.tokenExpiry,
    user: payload.user || data.user,
  };
}

/**
 * Real Verify OTP API: POST /auth/verify-otp
 * Completes login — this is where tokens are actually issued.
 */
export async function verifyOtpApi(verificationId: string, otp: string): Promise<VerifyOtpResponse> {
  const response = await api.post<VerifyOtpResponse>("/auth/verify-otp", {
    verificationId,
    otp,
  });
  return response.data;
}

/**
 * Real Resend OTP API: POST /auth/resend-otp
 */
export async function resendOtpApi(verificationId: string): Promise<ResendOtpResponse> {
  const response = await api.post<ResendOtpResponse>("/auth/resend-otp", {
    verificationId,
  });
  return response.data;
}

/**
 * Attempts to refresh the access token using the stored refresh token,
 * sharing the same in-flight/dedupe logic the response interceptor uses so
 * a proactive background refresh and a reactive 401-triggered one never
 * race each other into firing twice. Returns the new access token, or null
 * if refreshing failed (revoked/expired refresh token, or none stored).
 */
export async function refreshTokenApi(): Promise<string | null> {
  if (!refreshInFlight) {
    refreshInFlight = performTokenRefresh().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

/**
 * Real Logout API: POST /auth/logout
 * Revokes only the current device's session — other logged-in devices are unaffected.
 */
export async function logoutApi(): Promise<void> {
  await api.post("/auth/logout");
}

/**
 * Real Logged-in Devices API: GET /auth/devices
 */
export async function getDevicesApi(): Promise<DevicesResponse> {
  const response = await api.get<DevicesResponse>("/auth/devices");
  return response.data;
}

/**
 * Real Revoke Device API: DELETE /auth/devices/:sessionId
 */
export async function revokeDeviceApi(sessionId: string): Promise<{ message: string }> {
  const response = await api.delete<{ message: string }>(`/auth/devices/${sessionId}`);
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

export interface ForgotPasswordResponse {
  success: boolean;
  message: string;
  token?: string;
}

export interface ResetPasswordResponse {
  success: boolean;
  message: string;
}

export interface TrainerAttendanceSummary {
  totalSessions: number;
  present: number;
  absent: number;
  late?: number;
  percentage: number | null;
}

export interface DashboardSummary {
  assignedCourses: number;
  activeBatches: number;
  totalTrainees: number;
  upcomingClasses: number;
  onlineBatches?: number;
  offlineBatches?: number;
  atRiskTrainees?: number;
  pendingEvaluations?: number;
  averageAttendance?: number;
  myAttendance?: TrainerAttendanceSummary;
  trainerAttendance?: TrainerAttendanceSummary;
}

export interface DashboardCourse {
  id: string;
  name: string;
  level: string;
  deliveryMode: string;
  trainees: number;
  domains: number;
  hours: string;
  batches: number;
  avgProgress: number;
  nextSession: string | null;
}

export interface DashboardScheduleItem {
  id: string;
  batch: string;
  batchCode?: string;
  date: string;
  time: string;
  title: string;
  status: string;
  description: string;
  isToday: boolean;
  isPast: boolean;
}

export interface DashboardTraineeSupport {
  id: string;
  name: string;
  batchId: string;
  batchName: string;
  batchMode: string;
  courseName: string;
  atRisk: boolean;
  reason: string;
}

export interface TrainerDashboardData {
  summary: DashboardSummary;
  courses: DashboardCourse[];
  upcomingSchedule: DashboardScheduleItem[];
  traineesNeedingSupport: DashboardTraineeSupport[];
}

export interface TrainerDashboardResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: TrainerDashboardData;
}

/**
 * Real Trainer Dashboard API: GET /api/trainer/dashboard
 * Scoped strictly to authenticated trainer. Returns KPIs and previews only.
 */
export async function getTrainerDashboardApi(): Promise<TrainerDashboardResponse> {
  return deduplicatedGet<TrainerDashboardResponse>("/api/trainer/dashboard");
}

/**
 * Forgot Password API: POST /auth/forgot-password
 */
export async function forgotPasswordApi(email: string): Promise<{ success: boolean; message: string }> {
  const response = await api.post<{ success: boolean; message: string }>("/auth/forgot-password", { email });
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

export interface TrainerCourseBatch {
  id: string;
  courseId: string;
  name: string;
  code: string;
  label: string;
  mode: 'online' | 'offline';
  traineeCount: number;
  progress: number;
  location: string | null;
  nextSession: string;
}

export interface TrainerCourseItem {
  id: string;
  name: string;
  courseName?: string;
  courseCode?: string;
  description?: string;
  level: string;
  image: string;
  domains: number;
  hours: string;
  deliveryModes: ('online' | 'offline')[];
  totalTrainees: number;
  progress?: number;
  batches: TrainerCourseBatch[];
}

export interface PaginationMetadata {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface CourseFilterItem {
  id: string;
  name: string;
  courseId?: string;
  courseName?: string;
}

export interface BatchFilterItem {
  id: string;
  name: string;
  batchId?: string;
  batchName?: string;
  courseId?: string | null;
  courseName?: string | null;
  startDate?: string | null;
}

export interface TrainerFiltersData {
  courses: CourseFilterItem[];
  batches: BatchFilterItem[];
}

export type TrainerFilterCourseItem = CourseFilterItem;
export type TrainerFilterBatchItem = BatchFilterItem;

export interface TrainerFiltersResponse {
  success: boolean;
  statusCode?: number;
  data: TrainerFiltersData;
}

export interface FilterResponse<T> {
  success: boolean;
  statusCode?: number;
  data: T[];
}

export interface TrainerCoursesResponse {
  success: boolean;
  statusCode?: number;
  message?: string;
  data?: TrainerCourseItem[];
  courses: TrainerCourseItem[];
  pagination?: PaginationMetadata;
}

// In-memory cache for trainer filters to ensure only 1 request per session across all pages
let cachedTrainerFilters: TrainerFiltersData | null = null;
let trainerFiltersInFlight: Promise<TrainerFiltersData> | null = null;

/**
 * Combined Trainer Filter API: GET /api/trainer/filters
 * Returns courses and batches together in a single request.
 * Cached in memory so changing routes/filters never triggers repeated API requests.
 */
export async function getTrainerFiltersApi(forceRefresh = false): Promise<TrainerFiltersData> {
  if (!forceRefresh && cachedTrainerFilters) {
    return cachedTrainerFilters;
  }
  if (!forceRefresh && trainerFiltersInFlight) {
    return trainerFiltersInFlight;
  }

  trainerFiltersInFlight = deduplicatedGet<TrainerFiltersResponse>("/api/trainer/filters")
    .then((res) => {
      const data = res?.data || { courses: [], batches: [] };
      cachedTrainerFilters = data;
      trainerFiltersInFlight = null;
      return data;
    })
    .catch((err) => {
      trainerFiltersInFlight = null;
      throw err;
    });

  return trainerFiltersInFlight;
}

export function clearTrainerFiltersCache(): void {
  cachedTrainerFilters = null;
  trainerFiltersInFlight = null;
}

/**
 * Lightweight Course Filter API: GET /api/trainer/filters/courses
 * Reuses the combined filter API to avoid redundant network calls.
 */
export async function getTrainerCourseFiltersApi(): Promise<CourseFilterItem[]> {
  const data = await getTrainerFiltersApi();
  return data.courses;
}

/**
 * Lightweight Batch Filter API: GET /api/trainer/filters/batches?courseId=...
 * Reuses the combined filter API with local courseId filtering to eliminate redundant network requests.
 */
export async function getTrainerBatchFiltersApi(courseId?: string): Promise<BatchFilterItem[]> {
  const data = await getTrainerFiltersApi();
  if (courseId && courseId !== "all" && courseId !== "ALL") {
    return data.batches.filter((b) => b.courseId === courseId);
  }
  return data.batches;
}

/**
 * Real Trainer Courses API: GET /api/trainer/courses
 * Bearer JWT authenticated. Returns courses scoped strictly to the trainer with pagination.
 */
export async function getTrainerCoursesApi(params?: {
  page?: number;
  limit?: number;
  search?: string;
}): Promise<TrainerCoursesResponse> {
  const res = await deduplicatedGet<TrainerCoursesResponse>("/api/trainer/courses", {
    params: params ?? undefined
  });
  return {
    ...res,
    courses: res?.courses || (res as any)?.data || []
  };
}

export interface BackendModuleItem {
  id: string;
  courseId: string;
  courseName: string;
  moduleName: string;
  title: string;
  orderIndex: number;
  lessonsCount: number;
  deliveryMode: string;
  createdAt: string;
  updatedAt: string;
}

export interface ModulesResponse {
  success: boolean;
  message?: string;
  modules: BackendModuleItem[];
}

export interface CreateModulePayload {
  title: string;
  courseId?: string;
  batchId?: string;
}

export interface CreateModuleResponse {
  success: boolean;
  message: string;
  moduleId?: string;
  module?: BackendModuleItem;
}

/**
 * Real Modules API: GET /modules?courseId=...
 * Bearer JWT authenticated. Scoped to trainer's authorized courses.
 */
export async function getModulesApi(courseId?: string): Promise<ModulesResponse> {
  const response = await api.get<ModulesResponse>("/modules", {
    params: courseId ? { courseId } : undefined
  });
  return response.data;
}

/**
 * Real Create Module API: POST /modules
 * Bearer JWT authenticated. Backend verifies trainer authorization for courseId.
 */
export async function createModuleApi(payload: CreateModulePayload): Promise<CreateModuleResponse> {
  const response = await api.post<CreateModuleResponse>("/modules", {
    title: payload.title.trim(),
    moduleName: payload.title.trim(),
    courseId: payload.courseId,
    batchId: payload.batchId
  });
  return response.data;
}


// ─── Lessons ───────────────────────────────────────────────────────────────────

export interface BackendLessonItem {
  id: string;
  lessonTitle: string;
  courseId: string;
  moduleId: string;
  contentType: string; // 'video' | 'document' | 'quiz' | 'assignment'
  trainerId?: string | null;
  orderIndex?: number;
  duration?: string | null;
  contentUrl?: string | null;
  description?: string | null;
  courseName?: string | null;
  moduleName?: string | null;
  trainerName?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface LessonsResponse {
  success: boolean;
  message?: string;
  lessons: BackendLessonItem[];
}

export interface CreateLessonPayload {
  title: string;
  courseId: string;
  moduleId: string;
  type: string; // 'video' | 'document' | 'quiz' | 'assignment'
  duration?: string;
}

export interface CreateLessonResponse {
  success: boolean;
  message: string;
  lessonId?: string;
  lesson?: BackendLessonItem;
}

/** Lightweight module item shape returned when fetching modules for a course dropdown */
export interface BackendModuleSimpleItem {
  id: string;
  courseId: string;
  moduleName: string;
  title?: string;
  lessonsCount?: number;
}

export interface ModulesForCourseResponse {
  success: boolean;
  message?: string;
  modules: BackendModuleSimpleItem[];
}

/**
 * Real Trainer Lessons API: GET /api/trainer/lessons
 * Bearer JWT authenticated. Returns lessons scoped strictly to the authenticated trainer.
 * Optional courseId and moduleId filters are supported.
 */
export async function getLessonsApi(params?: {
  courseId?: string;
  moduleId?: string;
}): Promise<LessonsResponse> {
  const response = await api.get<LessonsResponse>("/api/trainer/lessons", {
    params: params ?? undefined,
  });
  return response.data;
}

/**
 * Real Create Lesson API: POST /lessons
 * Bearer JWT authenticated. Backend verifies trainer authorization for courseId.
 * trainerId is derived from the JWT — never sent from frontend.
 */
export async function createLessonApi(
  payload: CreateLessonPayload
): Promise<CreateLessonResponse> {
  const body: Record<string, any> = {
    lessonTitle: payload.title.trim(),
    title: payload.title.trim(),
    courseId: payload.courseId,
    moduleId: payload.moduleId,
    contentType: payload.type,
    type: payload.type,
  };

  // Only include duration when non-empty string for video content
  if (payload.type === "video" && payload.duration && payload.duration.trim()) {
    body.duration = payload.duration.trim();
  }

  const response = await api.post<CreateLessonResponse>("/lessons", body);
  return response.data;
}

/**
 * Fetch modules for a specific courseId (used in AddLessonModal dropdowns).
 * Scoped to trainer's authorized courses via the existing GET /modules endpoint.
 */
export async function getModulesForCourseApi(
  courseId: string
): Promise<ModulesForCourseResponse> {
  const response = await api.get<ModulesForCourseResponse>("/modules", {
    params: { courseId },
  });
  return response.data;
}

// ─── Batches ───────────────────────────────────────────────────────────────────

export interface BackendBatchItem {
  id: string;
  batchName: string;
  name?: string;
  deliveryMode?: "online" | "offline" | string;
  startDate?: string | null;
  endDate?: string | null;
  courseId?: string | null;
  course?: {
    id: string;
    courseName: string;
    courseCode?: string | null;
    courseDesc?: string | null;
    deliveryMode?: string | null;
    courseImg?: string | null;
    courseLink?: string | null;
  } | null;
  traineeCount?: number;
  trainees?: any[];
}

export interface BatchesResponse {
  message?: string;
  batch?: {
    data: BackendBatchItem[];
    pagination?: any;
  };
  data?: BackendBatchItem[];
}

export interface TrainerBatchesResponse {
  success: boolean;
  statusCode?: number;
  message?: string;
  data: BackendBatchItem[];
  pagination?: PaginationMetadata;
}

/**
 * Real Batch API: GET /api/trainer/batches
 * Scoped to trainer's authorized batches/courses via JWT.
 */
export async function getTrainerBatchesApi(
  courseId?: string,
  params?: { page?: number; limit?: number; search?: string }
): Promise<BackendBatchItem[]> {
  const queryParams = {
    ...(params || {}),
    ...(courseId ? { courseId } : {})
  };
  const response = await deduplicatedGet<any>("/api/trainer/batches", {
    params: Object.keys(queryParams).length > 0 ? queryParams : undefined
  });
  const list = response?.data || response?.batch?.data || [];
  return list;
}

export async function getTrainerBatchesPaginatedApi(params?: {
  courseId?: string;
  page?: number;
  limit?: number;
  search?: string;
}): Promise<TrainerBatchesResponse> {
  return deduplicatedGet<TrainerBatchesResponse>("/api/trainer/batches", {
    params: params ?? undefined
  });
}



// ─── Lessons for Module ───────────────────────────────────────────────────────

/**
 * Real Lessons for Module API: GET /lessons?moduleId=...&courseId=...
 */
export async function getLessonsForModuleApi(
  moduleId: string,
  courseId?: string
): Promise<BackendLessonItem[]> {
  const response = await api.get<LessonsResponse>("/lessons", {
    params: { moduleId, ...(courseId ? { courseId } : {}) }
  });
  return response.data?.lessons || [];
}

// ─── Documents ────────────────────────────────────────────────────────────────

export interface BackendDocumentItem {
  id: string;
  title: string;
  fileUrl: string;
  fileType?: string;
  fileSize?: number;
  courseId: string;
  batchId?: string;
  moduleId: string;
  lessonId: string;
  uploadedBy?: string;
  uploadedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  courseName?: string;
  batchName?: string;
  moduleName?: string;
  lessonTitle?: string;
  size?: string;
}

export interface DocumentsResponse {
  success: boolean;
  message?: string;
  documents: BackendDocumentItem[];
}

export interface UploadDocumentResponse {
  success: boolean;
  message: string;
  document?: BackendDocumentItem;
  statusCode?: number;
}

/**
 * Real Documents API: GET /documents (or /api/documents)
 */
export async function getDocumentsApi(params?: {
  courseId?: string;
  moduleId?: string;
  lessonId?: string;
  batchId?: string;
  search?: string;
}): Promise<DocumentsResponse> {
  const response = await api.get<DocumentsResponse>("/documents", {
    params: params ?? undefined
  });
  return response.data;
}

/**
 * Real Document Upload API: POST /documents/upload (or /api/documents/upload)
 * Multipart form data containing: file, title, courseId, batchId, moduleId, lessonId
 */
export async function uploadDocumentApi(formData: FormData): Promise<UploadDocumentResponse> {
  const response = await api.post<UploadDocumentResponse>("/documents/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data"
    }
  });
  return response.data;
}

/**
 * Real Update Document API: PUT /documents/:id
 */
export async function updateDocumentApi(
  id: string,
  title: string
): Promise<{ success: boolean; message: string; document?: BackendDocumentItem }> {
  const response = await api.put<{ success: boolean; message: string; document?: BackendDocumentItem }>(
    `/documents/${id}`,
    { title }
  );
  return response.data;
}

/**
 * Real Delete Document API: DELETE /documents/:id
 */
export async function deleteDocumentApi(id: string): Promise<{ success: boolean; message: string }> {
  const response = await api.delete<{ success: boolean; message: string }>(`/documents/${id}`);
  return response.data;
}

// ─── Quizzes ──────────────────────────────────────────────────────────────────

export interface BackendQuizItem {
  id: string;
  courseId: string;
  batchId?: string;
  moduleId?: string;
  trainerId?: string;
  title: string;
  type?: string;
  totalQuestions: number;
  passingScorePct?: number;
  maxAttempts?: number;
  durationMinutes?: number;
  status: string;
  fileUrl?: string;
  showResult?: boolean;
  createdAt?: string;
  updatedAt?: string;
  courseName?: string;
  batchName?: string;
  moduleName?: string;
  trainerName?: string;
  submissions?: number;
  avgScore?: number;
  totalTrainees?: number;
}

export interface QuizzesResponse {
  success: boolean;
  message?: string;
  quizzes: BackendQuizItem[];
}

export interface CreateQuizResponse {
  success: boolean;
  statusCode?: number;
  message: string;
  quiz?: BackendQuizItem;
}

/**
 * Real Quizzes API: GET /quizzes
 * Scoped to trainer's authorized quizzes or optional filters.
 */
export async function getQuizzesApi(params?: {
  courseId?: string;
  batchId?: string;
  moduleId?: string;
  status?: string;
}): Promise<BackendQuizItem[]> {
  const response = await api.get<QuizzesResponse>("/quizzes", {
    params: params ?? undefined
  });
  return response.data?.quizzes || [];
}

/**
 * Real Create Quiz API: POST /quizzes/upload
 * Multipart form data containing: file, title, batchId, courseId, moduleId, numberOfQuestions, status
 */
export async function createQuizApi(formData: FormData): Promise<CreateQuizResponse> {
  const response = await api.post<CreateQuizResponse>("/quizzes/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data"
    }
  });
  return response.data;
}

/**
 * Real Delete Quiz API: DELETE /quizzes/:id
 */
export async function deleteQuizApi(id: string): Promise<{ success: boolean; message: string }> {
  const response = await api.delete<{ success: boolean; message: string }>(`/quizzes/${id}`);
  return response.data;
}

export interface UpdateQuizPayload {
  title?: string;
  status?: "draft" | "published";
  totalQuestions?: number;
  passingScorePct?: number;
  maxAttempts?: number;
  durationMinutes?: number;
}

/**
 * Real Update Quiz API: PUT /quizzes/:id
 */
export async function updateQuizApi(
  id: string,
  payload: UpdateQuizPayload
): Promise<{ success: boolean; message: string }> {
  const response = await api.put<{ success: boolean; message: string }>(`/quizzes/${id}`, payload);
  return response.data;
}

export interface TraineeQuizResultItem {
  traineeId: string;
  traineeName: string;
  traineeEmail: string;
  status: "Submitted" | "Pending";
  score: number | null;
  scorePercentage: number | null;
  rawScore?: number | null;
  totalQuestions?: number;
  completedAt: string | null;
  passed: boolean | null;
  attemptNumber?: number | null;
}

export interface QuizResultsResponse {
  success: boolean;
  assessmentId: string;
  quiz: {
    id: string;
    title: string;
    courseName: string;
    batchName: string;
    moduleName: string;
    passingScorePct: number;
    totalQuestions: number;
    status: string;
    fileUrl: string | null;
  };
  summary: {
    totalTrainees: number;
    submitted: number;
    pending: number;
    averageScore: number | null;
  };
  trainees: TraineeQuizResultItem[];
}

/**
 * Real Quiz Results API:
 * Preferred: GET /quizzes/:quizId/results
 * Fallback: GET /assessment-results?assessmentId=:quizId
 * Authenticated via JWT. Scoped to trainer/admin.
 */
export async function getQuizResultsApi(quizId: string): Promise<QuizResultsResponse> {
  const cleanId = quizId.trim();
  const response = await api.get<QuizResultsResponse>(`/quizzes/${encodeURIComponent(cleanId)}/results`);
  return response.data;
}


/**
 * Real Trainee Quizzes API: GET /trainee/quizzes
 * Scoped strictly to the trainee's enrolled batches in BatchTrainee.
 */
export async function getTraineeQuizzesApi(params?: {
  courseId?: string;
  batchId?: string;
  moduleId?: string;
}): Promise<BackendQuizItem[]> {
  const response = await api.get<QuizzesResponse>("/trainee/quizzes", {
    params: params ?? undefined
  });
  return response.data?.quizzes || [];
}

// ─── Assignments ─────────────────────────────────────────────────────────────

export interface AssignmentItem {
  id: string;
  title: string;
  courseId: string;
  courseName?: string;
  batchId: string;
  batchName?: string;
  trainerId: string;
  trainerName?: string;
  dueDate: string;
  submissions?: number;
  submissionCount?: number;
  pendingReview?: number;
  totalTrainees?: number;
  createdAt?: string;
  updatedAt?: string;
  submission?: {
    id: string;
    status: string;
    obtainedMarks?: number;
    obtainedPercentage?: number;
    feedback?: string;
    courseAssignmentAnswerFile?: string;
    submissionText?: string;
    submittedAt?: string;
  } | null;
  submissionStatus?: string;
}

export interface AssignmentSubmissionItem {
  id: string;
  assignmentId: string;
  traineeId: string;
  traineeName: string;
  email?: string;
  courseAssignmentAnswerFile?: string;
  submissionText?: string;
  status: string;
  obtainedMarks?: number;
  obtainedPercentage?: number;
  feedback?: string;
  submittedAt?: string;
  updatedAt?: string;
}

export interface AssignmentsResponse {
  success: boolean;
  message?: string;
  assignments: AssignmentItem[];
}

export interface CreateAssignmentPayload {
  title: string;
  courseId: string;
  batchId: string;
  dueDate: string;
}

export interface CreateAssignmentResponse {
  success: boolean;
  statusCode?: number;
  message: string;
  assignment?: AssignmentItem;
}

export interface SubmissionsResponse {
  success: boolean;
  message?: string;
  assignment?: {
    id: string;
    title: string;
    courseId: string;
    courseName?: string;
    batchId: string;
    batchName?: string;
  };
  submissions: AssignmentSubmissionItem[];
}

export interface ScoreSubmissionPayload {
  obtainedMarks: number;
  totalMarks?: number;
  feedback?: string;
}

export interface ScoreSubmissionResponse {
  success: boolean;
  message: string;
  scoredSubmission?: {
    id: string;
    assignmentId: string;
    obtainedMarks: number;
    obtainedPercentage: number;
    feedback: string;
    status: string;
  };
}

/**
 * Real Assignments API: GET /assignments (or /api/assignments)
 * Returns assignments scoped to the authenticated trainer's authorized scope.
 */
export async function getAssignmentsApi(params?: {
  courseId?: string;
  batchId?: string;
}): Promise<AssignmentItem[]> {
  const data = await deduplicatedGet<AssignmentsResponse>("/assignments", {
    params: params ?? undefined
  });
  return data?.assignments || [];
}

/**
 * Real Single Assignment API: GET /assignments/:id
 */
export async function getAssignmentByIdApi(id: string): Promise<AssignmentItem | null> {
  const data = await deduplicatedGet<{ success: boolean; assignment: AssignmentItem }>(`/assignments/${id}`);
  return data?.assignment || null;
}

/**
 * Real Create Assignment API: POST /assignments (or /api/assignments)
 */
export async function createAssignmentApi(payload: CreateAssignmentPayload): Promise<CreateAssignmentResponse> {
  const response = await api.post<CreateAssignmentResponse>("/assignments", payload);
  return response.data;
}

/**
 * Real Delete Assignment API: DELETE /assignments/:id
 */
export async function deleteAssignmentApi(id: string): Promise<{ success: boolean; message: string }> {
  const response = await api.delete<{ success: boolean; message: string }>(`/assignments/${id}`);
  return response.data;
}

/**
 * Real Assignment Submissions API: GET /assignments/:assignmentId/submissions
 */
export async function getAssignmentSubmissionsApi(assignmentId: string): Promise<AssignmentSubmissionItem[]> {
  const data = await deduplicatedGet<SubmissionsResponse>(`/assignments/${assignmentId}/submissions`);
  return data?.submissions || [];
}

/**
 * Real Score Submission API: PUT /assignments/:assignmentId/submissions/:submissionId/score
 */
export async function scoreAssignmentSubmissionApi(
  assignmentId: string,
  submissionId: string,
  payload: ScoreSubmissionPayload
): Promise<ScoreSubmissionResponse> {
  const response = await api.put<ScoreSubmissionResponse>(
    `/assignments/${assignmentId}/submissions/${submissionId}/score`,
    payload
  );
  return response.data;
}

/**
 * Real Trainee Assignments API: GET /api/trainee/assignments
 * Scoped strictly to the trainee's enrolled batches.
 */
export async function getTraineeAssignmentsApi(): Promise<AssignmentItem[]> {
  const response = await api.get<AssignmentsResponse>("/api/trainee/assignments");
  return response.data?.assignments || [];
}

/**
 * Real Trainee Submit Assignment API: POST /api/assignments/:assignmentId/submit
 */
export async function submitAssignmentApi(
  assignmentId: string,
  formData: FormData
): Promise<{ success: boolean; message: string; submission?: any }> {
  const response = await api.post(`/api/assignments/${assignmentId}/submit`, formData, {
    headers: {
      "Content-Type": "multipart/form-data"
    }
  });
  return response.data;
}

// ─── Trainees API ────────────────────────────────────────────────────────────

export interface TraineeListItem {
  id: string;
  name: string;
  email: string;
  batchId: string;
  batchName: string;
  courseId: string;
  courseName: string;
  mode: string;
  progressPct: number;
  completedModules: number;
  totalModules: number;
  moduleCompletion?: {
    completed: number;
    total: number;
    percentage: number;
  };
  completedLessons?: number;
  totalLessons?: number;
  quizCompleted: number;
  quizAvgScore: number;
  attendancePct: number;
  attendanceSessions: {
    present: number;
    total: number;
  };
  isAtRisk: boolean;
  atRiskReason: string | null;
}

export interface TraineesApiResponse {
  success: boolean;
  message?: string;
  pagination?: PaginationMetadata;
  trainees?: TraineeListItem[];
  data: {
    trainees: TraineeListItem[];
    pagination?: PaginationMetadata;
  };
}

export async function getTraineesApi(params?: {
  courseId?: string;
  batchId?: string;
  search?: string;
  mode?: string;
  atRisk?: boolean;
  riskOnly?: boolean;
  page?: number;
  limit?: number;
}): Promise<TraineesApiResponse> {
  const queryParams: any = { ...(params || {}) };
  if (queryParams.riskOnly === undefined && queryParams.atRisk !== undefined) {
    queryParams.riskOnly = queryParams.atRisk;
  }
  const resData = await deduplicatedGet<any>("/api/trainer/trainees", {
    params: Object.keys(queryParams).length > 0 ? queryParams : undefined
  });
  const rawList = resData?.data?.trainees || resData?.data || resData?.trainees || [];
  const normalizedList: TraineeListItem[] = rawList.map((t: any) => {
    const fullName = t.name || t.fullName || (t.firstName || t.lastName ? `${t.firstName || ''} ${t.lastName || ''}`.trim() : 'Trainee');
    const bId = t.batchId || t.batch?.batchId || '';
    const bName = t.batchName || t.batch?.batchName || '';
    const cId = t.courseId || t.course?.courseId || '';
    const cName = t.courseName || t.course?.courseName || '';
    const progressPct = Number(t.progressPct ?? t.moduleCompletion?.percentage ?? t.lessonCompletion?.percentage ?? 0);
    const totalModules = Number(t.totalModules ?? t.moduleCompletion?.total ?? 0);
    const completedModules = Number(
      t.completedModules ??
      t.moduleCompletion?.completed ??
      (totalModules > 0 ? Math.round((progressPct / 100) * totalModules) : 0)
    );

    return {
      id: t.id || t.traineeId || '',
      name: fullName,
      email: t.email || '',
      batchId: bId,
      batchName: bName,
      courseId: cId,
      courseName: cName,
      mode: t.mode || t.batch?.mode || 'online',
      progressPct,
      completedModules,
      totalModules,
      moduleCompletion: t.moduleCompletion || {
        completed: completedModules,
        total: totalModules,
        percentage: progressPct
      },
      completedLessons: Number(t.completedLessons ?? t.lessonCompletion?.completed ?? completedModules),
      totalLessons: Number(t.totalLessons ?? t.lessonCompletion?.total ?? totalModules),
      quizCompleted: Number(t.quizCompleted ?? t.quiz?.completed ?? 0),
      quizAvgScore: Number(t.quizAvgScore ?? t.quiz?.averageScore ?? 0),
      attendancePct: Number(t.attendancePct ?? t.attendance?.percentage ?? 0),
      attendanceSessions: t.attendanceSessions || {
        present: Number(t.attendance?.present ?? 0),
        total: Number(t.attendance?.total ?? 0),
      },
      isAtRisk: Boolean(t.isAtRisk ?? t.status === 'AT_RISK'),
      atRiskReason: t.atRiskReason ?? null,
      ...t
    };
  });

  return {
    ...resData,
    pagination: resData?.pagination,
    data: {
      ...resData?.data,
      trainees: normalizedList,
      pagination: resData?.pagination
    }
  };
}

export interface TraineeDetailData {
  trainee: {
    id: string;
    name: string;
    email: string;
    status: string;
  };
  batch: {
    id: string;
    name: string;
  };
  course: {
    id: string;
    name: string;
  };
  progress: {
    completed: number;
    total: number;
    percentage: number;
  };
  quiz: {
    score: number;
  };
  attendance: {
    percentage: number;
  };
  risk: {
    isAtRisk: boolean;
    reason: string | null;
  };
  id?: string;
  name?: string;
  email?: string;
  status?: string;
  batchId?: string;
  batchName?: string;
  courseId?: string;
  courseName?: string;
  progressPct?: number;
  completedModules?: number;
  totalModules?: number;
  attendancePct?: number;
  quizScore?: number;
  isAtRisk?: boolean;
  riskReason?: string | null;
}

export async function getTraineeDetailsApi(traineeId: string, batchId?: string): Promise<{ success: boolean; data?: TraineeDetailData }> {
  return deduplicatedGet<{ success: boolean; data?: TraineeDetailData }>(`/api/trainer/trainees/${traineeId}`, {
    params: batchId ? { batchId } : undefined
  });
}

/**
 * Real Trainer Schedule API: GET /api/trainer/schedule
 * Unpaginated date-range based fetching.
 */
export async function getTrainerScheduleApi(params?: {
  startDate?: string;
  endDate?: string;
  batchId?: string;
  courseId?: string;
}): Promise<any> {
  const response = await deduplicatedGet<any>("/api/trainer/schedule", {
    params: params ?? undefined
  });
  return response;
}

// ─── Attendance API ──────────────────────────────────────────────────────────

export interface BulkAttendanceRecord {
  userId: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  remark?: string;
}

export interface BulkAttendancePayload {
  batchId: string;
  courseId?: string;
  sessionDate?: string;
  records: BulkAttendanceRecord[];
}

export async function bulkSaveAttendanceApi(payload: BulkAttendancePayload): Promise<{ success: boolean; message: string }> {
  const response = await api.post<{ success: boolean; message: string }>("/attendance/bulk", payload);
  return response.data;
}

export interface MarkAttendancePayload {
  userId: string;
  batchId: string;
  courseId?: string;
  moduleId?: string;
  attendanceStatus: 'present' | 'absent' | 'late';
  sessionDate?: string;
}

/**
 * Real per-trainee Attendance API: POST /attendance/manual
 * Upserts a single trainee's attendance status for the given session date —
 * triggered immediately when a trainer picks Present/Absent/Late for that row,
 * instead of waiting for a separate bulk "Finalize" save.
 */
export async function markAttendanceApi(payload: MarkAttendancePayload): Promise<{
  message: string;
  attendanceId?: string;
  status?: string;
  sessionDate?: string;
}> {
  const response = await api.post("/attendance/manual", payload);
  return response.data;
}


export interface TrainerAttendanceItem {
  id?: string | null;
  traineeId: string;
  traineeName: string;
  email?: string | null;
  batchId: string;
  batchName: string;
  courseName: string;
  date: string;
  status: "present" | "absent" | "late" | null;
  percentage?: number | null;
}

export async function getTrainerAttendanceApi(params?: {
  batchId?: string;
  courseId?: string;
  date?: string;
  page?: number;
  limit?: number;
}): Promise<TrainerAttendanceItem[]> {
  const queryParams: Record<string, string | number> = {};
  if (params?.batchId && params.batchId !== "all") queryParams.batchId = params.batchId;
  if (params?.courseId && params.courseId !== "all" && params.courseId !== "none") queryParams.courseId = params.courseId;
  if (params?.date && params.date !== "all") queryParams.date = params.date;
  if (params?.page) queryParams.page = params.page;
  if (params?.limit) queryParams.limit = params.limit;
  const res = await deduplicatedGet<any>("/api/trainer/attendance", {
    params: Object.keys(queryParams).length > 0 ? queryParams : undefined
  });
  return res?.data || [];
}

export * from "./batchEventApi";


