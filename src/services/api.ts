import axios, { AxiosError } from "axios";
import { getOrCreateDeviceId } from "@/lib/deviceId";
import { extractUserFromToken } from "@/lib/jwt";
import { store } from "@/store/store";
import { restoreSessionThunk } from "@/store/authSlice";
import { cleanDisplayString } from "@/lib/utils";

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
  timeout: 15000,
});

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

// Request interceptor — attach the Bearer token from the Redux auth store,
// EXCEPT for public auth endpoints. The access token lives only in memory
// now (never localStorage); the refresh token lives solely in the httpOnly
// cookie the browser attaches automatically via withCredentials.
api.interceptors.request.use(
  (config) => {
    const url = config.url || "";
    const isPublicAuth = PUBLIC_AUTH_PATHS.some((path) => url.includes(path));

    if (isPublicAuth) {
      if (config.headers && "Authorization" in config.headers) {
        delete config.headers.Authorization;
      }
    } else {
      const token = store.getState().auth.accessToken;
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);


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

export type SessionRestoreResult =
  | { status: "authenticated"; accessToken: string; user: BackendUser }
  | { status: "unauthenticated" }
  | { status: "unknown" };

// Shared in-flight promise so concurrent callers (several components
// mounting at once, or the bootstrap restore racing a 401-triggered one)
// collapse into a single network call — the backend rotates the refresh
// token cookie on every call, so firing it twice in parallel would have the
// second request racing the first's just-rotated cookie.
let restoreInFlight: Promise<SessionRestoreResult> | null = null;

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

      const authState = store.getState().auth;

      // During initial bootstrap or when no access token exists, do NOT trigger another refresh
      if (authState.isBootstrapping || !authState.accessToken) {
        if (restoreInFlight) {
          try {
            const restored = await restoreInFlight;
            if (restored.status === "authenticated") {
              originalRequest.headers = originalRequest.headers || {};
              originalRequest.headers.Authorization = `Bearer ${restored.accessToken}`;
              return api.request(originalRequest);
            }
          } catch {
            // Restore failed
          }
        }
        return Promise.reject(error);
      }

      // Re-use in-flight restore promise if already active; otherwise dispatch one
      let restored: SessionRestoreResult;
      if (restoreInFlight) {
        restored = await restoreInFlight;
      } else {
        restored = await store.dispatch(restoreSessionThunk()).unwrap();
      }

      if (restored.status === "authenticated") {
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${restored.accessToken}`;
        return api.request(originalRequest);
      }

      // Only a definitive "no" redirects to login — a transient failure to
      // restore (network blip, 5xx) leaves the user on the current page;
      // the original 401 just propagates as an error for that one request.
      if (restored.status === "unauthenticated") {
        redirectToLoginIfNeeded();
      }
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
  user?: BackendUser;
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
  const accessToken = payload.accessToken || data.accessToken;
  const rawUser = payload.user || data.user;
  const user = rawUser && accessToken ? extractUserFromToken(rawUser, accessToken) : rawUser;
  return {
    ...data,
    accessToken,
    refreshToken: payload.refreshToken || data.refreshToken,
    tokenExpiry: payload.tokenExpiry || data.tokenExpiry,
    user,
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
  if (response.data?.accessToken && response.data?.user) {
    response.data.user = extractUserFromToken(response.data.user, response.data.accessToken);
  }
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
 * Attempts to restore a session purely from the httpOnly refresh-token
 * cookie (sent automatically via withCredentials) — no client-readable
 * token is ever passed.
 */
export async function restoreSessionApi(): Promise<SessionRestoreResult> {
  if (!restoreInFlight) {
    restoreInFlight = (async (): Promise<SessionRestoreResult> => {
      try {
        const response = await api.post<RefreshTokenResponse>("/auth/refresh-token");
        const { accessToken } = response.data;
        let { user } = response.data;
        if (accessToken && user) {
          user = extractUserFromToken(user, accessToken);
        }
        if (!user) {
          console.warn("[auth] refresh-token succeeded but response had no user — treating as logged out", response.data);
          return { status: "unauthenticated" };
        }
        return { status: "authenticated", accessToken, user };
      } catch (err) {
        // Surfaced so a "logged out after ~1hr" report can be diagnosed from
        // the browser console instead of guessing.
        if (err instanceof AxiosError) {
          console.warn(
            `[auth] session restore failed: ${err.response?.status ?? "network error"} ${err.response?.data?.errorCode ?? err.code ?? ""}`,
            err.response?.data ?? err.message
          );
          // A response actually came back and explicitly said the refresh
          // token is invalid/expired/revoked (or malformed) — that's the
          // only case that should log the user out. Anything else (no
          // response at all, or a 5xx) is a transient failure to determine
          // session validity, not proof the session is gone.
          if (err.response?.status === 401) {
            return { status: "unauthenticated" };
          }
          return { status: "unknown" };
        }
        console.warn("[auth] session restore failed with a non-Axios error", err);
        return { status: "unknown" };
      } finally {
        restoreInFlight = null;
      }
    })();
  }
  return restoreInFlight;
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
  atRiskTrainees?: number;
  pendingEvaluations?: number;
  averageAttendance?: number;
  myAttendance?: TrainerAttendanceSummary;
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
  batchName: string;
  batch?: string;
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
  const res = await deduplicatedGet<TrainerDashboardResponse>("/api/trainer/dashboard");
  if (res?.data) {
    if (Array.isArray(res.data.courses)) {
      res.data.courses = res.data.courses.map((c) => ({
        ...c,
        name: cleanDisplayString(c.name),
      }));
    }
    if (Array.isArray(res.data.upcomingSchedule)) {
      res.data.upcomingSchedule = res.data.upcomingSchedule.map((s) => ({
        ...s,
        batchName: cleanDisplayString(s.batchName || s.batch || "Batch"),
      }));
    }
    if (Array.isArray(res.data.traineesNeedingSupport)) {
      res.data.traineesNeedingSupport = res.data.traineesNeedingSupport.map((t) => ({
        ...t,
        batchName: cleanDisplayString(t.batchName),
        courseName: cleanDisplayString(t.courseName),
      }));
    }
  }
  return res;
}

/**
 * Forgot Password API: POST /auth/forgot-password
 */
export async function forgotPasswordApi(email: string): Promise<{ success: boolean; message: string }> {
  const response = await api.post<{ success: boolean; message: string }>("/auth/forgot-password", {
    email,
    appType: "trainer",
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
  courseName?: string;
  name?: string;
  courseId?: string;
}

export interface BatchFilterItem {
  id: string;
  batchName?: string;
  name?: string;
  batchId?: string;
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
  data: TrainerCourseItem[];
  courses?: TrainerCourseItem[];
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
      const rawData = res?.data || { courses: [], batches: [] };
      const normalizedCourses: CourseFilterItem[] = (rawData.courses || []).map((c: any) => ({
        id: c.id,
        courseName: cleanDisplayString(c.courseName || c.name),
        name: cleanDisplayString(c.name || c.courseName),
        courseId: c.id,
      }));
      const normalizedBatches: BatchFilterItem[] = (rawData.batches || []).map((b: any) => ({
        id: b.id,
        batchName: cleanDisplayString(b.batchName || b.name),
        name: cleanDisplayString(b.name || b.batchName),
        batchId: b.id,
        courseId: b.courseId || null,
        courseName: b.courseName ? cleanDisplayString(b.courseName) : null,
        startDate: b.startDate || null,
      }));
      const data: TrainerFiltersData = { courses: normalizedCourses, batches: normalizedBatches };
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
  courseId?: string;
  batchId?: string;
}): Promise<TrainerCoursesResponse> {
  const res = await deduplicatedGet<TrainerCoursesResponse>("/api/trainer/courses", {
    params: params ?? undefined
  });
  const rawList = res?.data || (res as any)?.courses || [];
  const list = rawList.map((c: any) => ({
    ...c,
    name: cleanDisplayString(c.name || c.courseName),
    courseName: cleanDisplayString(c.courseName || c.name),
  }));
  return {
    ...res,
    data: list,
    courses: list
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
  pagination?: PaginationMetadata;
  total?: number;
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
 * Real Modules API: GET /modules?courseId=...&batchId=...&search=...&page=...&limit=...
 * Bearer JWT authenticated. Scoped to trainer's authorized courses.
 */
export async function getModulesApi(
  params?:
    | {
        courseId?: string;
        batchId?: string;
        search?: string;
        page?: number;
        limit?: number;
      }
    | string
): Promise<ModulesResponse> {
  const queryParams: Record<string, string | number> = {};
  if (typeof params === "string") {
    if (params) queryParams.courseId = params;
  } else if (params) {
    if (params.page && params.page > 0) queryParams.page = params.page;
    if (params.limit && params.limit > 0) queryParams.limit = params.limit;
    if (params.courseId && params.courseId !== "all" && params.courseId !== "none") queryParams.courseId = params.courseId;
    if (params.batchId && params.batchId !== "all") queryParams.batchId = params.batchId;
    if (params.search && params.search.trim()) queryParams.search = params.search.trim();
  }

  const response = await api.get<ModulesResponse>("/modules", {
    params: Object.keys(queryParams).length > 0 ? queryParams : undefined
  });
  if (response.data && Array.isArray(response.data.modules)) {
    response.data.modules = response.data.modules.map((m: any) => ({
      ...m,
      courseName: cleanDisplayString(m.courseName),
      moduleName: cleanDisplayString(m.moduleName || m.title),
      title: cleanDisplayString(m.title || m.moduleName),
    }));
  }
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
  const rawList = response?.data || response?.batch?.data || [];
  return rawList.map((b: any) => ({
    ...b,
    batchName: cleanDisplayString(b.batchName || b.name),
    name: cleanDisplayString(b.name || b.batchName),
    course: b.course
      ? {
          ...b.course,
          courseName: cleanDisplayString(b.course.courseName || b.course.name),
        }
      : null,
  }));
}

export async function getTrainerBatchesPaginatedApi(params?: {
  courseId?: string;
  mode?: string;
  page?: number;
  limit?: number;
  search?: string;
}): Promise<TrainerBatchesResponse> {
  const res = await deduplicatedGet<TrainerBatchesResponse>("/api/trainer/batches", {
    params: params ?? undefined
  });
  if (res?.data && Array.isArray(res.data)) {
    res.data = res.data.map((b: any) => ({
      ...b,
      batchName: cleanDisplayString(b.batchName || b.name),
      name: cleanDisplayString(b.name || b.batchName),
      course: b.course
        ? {
            ...b.course,
            courseName: cleanDisplayString(b.course.courseName || b.course.name),
          }
        : null,
    }));
  }
  return res;
}



// ─── Lessons for Module ───────────────────────────────────────────────────────


// ─── Documents ────────────────────────────────────────────────────────────────

export interface BackendDocumentItem {
  id: string;
  title: string;
  fileUrl: string;
  fileType?: string;
  fileSize?: number;
  courseId?: string;
  batchId?: string;
  moduleId?: string;
  lessonId?: string;
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
  pagination?: PaginationMetadata;
  total?: number;
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
  page?: number;
  limit?: number;
}): Promise<DocumentsResponse> {
  const queryParams: Record<string, string | number> = {};
  if (params) {
    if (params.page && params.page > 0) queryParams.page = params.page;
    if (params.limit && params.limit > 0) queryParams.limit = params.limit;
    if (params.courseId && params.courseId !== "all" && params.courseId !== "none") queryParams.courseId = params.courseId;
    if (params.batchId && params.batchId !== "all") queryParams.batchId = params.batchId;
    if (params.moduleId && params.moduleId !== "all") queryParams.moduleId = params.moduleId;
    if (params.lessonId && params.lessonId !== "all") queryParams.lessonId = params.lessonId;
    if (params.search && params.search.trim()) queryParams.search = params.search.trim();
  }
  const response = await api.get<DocumentsResponse>("/api/documents", {
    params: Object.keys(queryParams).length > 0 ? queryParams : undefined
  });
  if (response.data && Array.isArray(response.data.documents)) {
    response.data.documents = response.data.documents.map((d: any) => ({
      ...d,
      courseName: cleanDisplayString(d.courseName),
      batchName: cleanDisplayString(d.batchName),
      moduleName: cleanDisplayString(d.moduleName),
      lessonTitle: cleanDisplayString(d.lessonTitle),
    }));
  }
  return response.data;
}

/**
 * Real Document Upload API: POST /documents/upload (or /api/documents/upload)
 * Multipart form data containing: file, title, courseId, batchId, moduleId, lessonId
 */
export async function uploadDocumentApi(formData: FormData): Promise<UploadDocumentResponse> {
  const response = await api.post<UploadDocumentResponse>("/api/documents/upload", formData, {
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
    `/api/documents/${id}`,
    { title }
  );
  return response.data;
}

/**
 * Real Delete Document API: DELETE /documents/:id
 */
export async function deleteDocumentApi(id: string): Promise<{ success: boolean; message: string }> {
  const response = await api.delete<{ success: boolean; message: string }>(`/api/documents/${id}`);
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

export interface TrainerQuizFilterParams {
  page?: number;
  limit?: number;
  search?: string;
  batchId?: string;
  courseId?: string;
  moduleId?: string;
  status?: string;
}

export interface QuizzesResponse {
  success: boolean;
  statusCode?: number;
  message?: string;
  data?: BackendQuizItem[];
  quizzes: BackendQuizItem[];
  pagination?: PaginationMetadata;
}

export interface TrainerQuizzesResult {
  quizzes: BackendQuizItem[];
  pagination?: PaginationMetadata;
  total: number;
}

export interface CreateQuizResponse {
  success: boolean;
  statusCode?: number;
  message: string;
  quiz?: BackendQuizItem;
}

/**
 * Real Trainer Quizzes API: GET /api/trainer/quizzes
 * Scoped to trainer's authorized quizzes with dynamic combinable filters, search, and pagination.
 */
export async function getTrainerQuizzesApi(
  params?: TrainerQuizFilterParams
): Promise<TrainerQuizzesResult> {
  const cleanParams: Record<string, string | number> = {};
  if (params) {
    if (params.page && params.page > 0) cleanParams.page = params.page;
    if (params.limit && params.limit > 0) cleanParams.limit = params.limit;
    if (params.batchId && params.batchId !== 'all') cleanParams.batchId = params.batchId;
    if (params.courseId && params.courseId !== 'all' && params.courseId !== 'none') cleanParams.courseId = params.courseId;
    if (params.moduleId && params.moduleId !== 'all') cleanParams.moduleId = params.moduleId;
    if (params.status && params.status !== 'all') cleanParams.status = params.status;
    if (params.search && params.search.trim()) cleanParams.search = params.search.trim();
  }

  const response = await api.get<QuizzesResponse>("/api/trainer/quizzes", {
    params: Object.keys(cleanParams).length > 0 ? cleanParams : undefined
  });

  const rawQuizzes = response.data?.data || response.data?.quizzes || [];
  const quizzes = rawQuizzes.map((q: any) => ({
    ...q,
    courseName: cleanDisplayString(q.courseName),
    batchName: cleanDisplayString(q.batchName),
    moduleName: cleanDisplayString(q.moduleName),
  }));
  const pagination = response.data?.pagination;
  const total = pagination?.total ?? quizzes.length;

  return { quizzes, pagination, total };
}


/**
 * Real Create Quiz API: POST /quizzes/upload
 * Multipart form data containing: file, title, batchId, courseId, moduleId, numberOfQuestions, status
 */
export async function createQuizApi(formData: FormData): Promise<CreateQuizResponse> {
  const response = await api.post<CreateQuizResponse>("/api/quizzes/upload", formData, {
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
  const response = await api.delete<{ success: boolean; message: string }>(`/api/quizzes/${id}`);
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
  const response = await api.put<{ success: boolean; message: string }>(`/api/quizzes/${id}`, payload);
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
  const response = await api.get<QuizResultsResponse>(`/api/quizzes/${encodeURIComponent(cleanId)}/results`);
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
  const response = await api.get<QuizzesResponse>("/api/trainee/quizzes", {
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
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentType?: string;
  attachmentSize?: number;
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
  pagination?: PaginationMetadata;
  total?: number;
}

export interface CreateAssignmentPayload {
  title: string;
  courseId: string;
  batchId: string;
  dueDate: string;
  file?: File | null;
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
  search?: string;
  page?: number;
  limit?: number;
}): Promise<AssignmentsResponse> {
  const queryParams: Record<string, string | number> = {};
  if (params) {
    if (params.page && params.page > 0) queryParams.page = params.page;
    if (params.limit && params.limit > 0) queryParams.limit = params.limit;
    if (params.courseId && params.courseId !== "all" && params.courseId !== "none" && params.courseId !== "ALL") queryParams.courseId = params.courseId;
    if (params.batchId && params.batchId !== "all" && params.batchId !== "ALL") queryParams.batchId = params.batchId;
    if (params.search && params.search.trim()) queryParams.search = params.search.trim();
  }
  const data = await deduplicatedGet<AssignmentsResponse>("/api/assignments", {
    params: Object.keys(queryParams).length > 0 ? queryParams : undefined
  });
  if (data && Array.isArray(data.assignments)) {
    data.assignments = data.assignments.map((a: any) => ({
      ...a,
      courseName: cleanDisplayString(a.courseName),
      batchName: cleanDisplayString(a.batchName),
    }));
  }
  return data || { success: true, assignments: [] };
}


/**
 * Real Create Assignment API: POST /assignments (or /api/assignments)
 */
export async function createAssignmentApi(payload: CreateAssignmentPayload | FormData): Promise<CreateAssignmentResponse> {
  const isFormData = typeof FormData !== "undefined" && payload instanceof FormData;
  const response = await api.post<CreateAssignmentResponse>(
    "/api/assignments",
    payload,
    isFormData ? { headers: { "Content-Type": "multipart/form-data" } } : undefined
  );
  return response.data;
}


/**
 * Real Assignment Submissions API: GET /assignments/:assignmentId/submissions
 */
export async function getAssignmentSubmissionsApi(assignmentId: string): Promise<AssignmentSubmissionItem[]> {
  const data = await deduplicatedGet<SubmissionsResponse>(`/api/assignments/${assignmentId}/submissions`);
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
    `/api/assignments/${assignmentId}/submissions/${submissionId}/score`,
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
    const bId = t.batchId || t.batch?.id || t.batch?.batchId || '';
    const bName = cleanDisplayString(t.batchName || t.batch?.name || t.batch?.batchName || '');
    const cId = t.courseId || t.course?.id || t.course?.courseId || '';
    const cName = cleanDisplayString(t.courseName || t.course?.name || t.course?.courseName || '');
    const progressPct = Number(t.progressPct ?? t.moduleCompletion?.percentage ?? t.lessonCompletion?.percentage ?? 0);
    const totalModules = Number(t.totalModules ?? t.moduleCompletion?.total ?? 0);
    const completedModules = Number(
      t.completedModules ??
      t.moduleCompletion?.completed ??
      (totalModules > 0 ? Math.round((progressPct / 100) * totalModules) : 0)
    );
    const moduleCompletionPct = totalModules > 0
      ? (typeof t.moduleCompletion?.percentage === "number"
          ? t.moduleCompletion.percentage
          : Math.round((completedModules / totalModules) * 100))
      : 0;

    return {
      id: t.id || t.traineeId || '',
      name: cleanDisplayString(fullName),
      email: t.email || '',
      batchId: bId,
      batchName: bName,
      courseId: cId,
      courseName: cName,
      mode: (t.mode || t.batch?.mode || t.courseType || 'online').toLowerCase(),
      progressPct,
      completedModules,
      totalModules,
      moduleCompletion: {
        completed: completedModules,
        total: totalModules,
        percentage: moduleCompletionPct
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
      atRiskReason: t.atRiskReason ?? null
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
  const res = await deduplicatedGet<{ success: boolean; data?: TraineeDetailData }>(`/api/trainer/trainees/${traineeId}`, {
    params: batchId ? { batchId } : undefined
  });
  if (res?.data) {
    const rawCourseName = res.data.course?.name || (res.data as any)?.courseName || (res.data as any)?.course?.courseName || '';
    const rawBatchName = res.data.batch?.name || (res.data as any)?.batchName || (res.data as any)?.batch?.batchName || '';
    res.data.course = {
      id: res.data.course?.id || (res.data as any)?.courseId || '',
      name: cleanDisplayString(rawCourseName) || 'Course',
    };
    res.data.batch = {
      id: res.data.batch?.id || (res.data as any)?.batchId || '',
      name: cleanDisplayString(rawBatchName) || 'Batch',
    };
    res.data.courseName = cleanDisplayString(rawCourseName);
    res.data.batchName = cleanDisplayString(rawBatchName);
  }
  return res;
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
  if (Array.isArray(response)) {
    return response.map((s: any) => ({
      ...s,
      batchName: cleanDisplayString(s.batchName || s.batch || "Batch"),
      courseName: cleanDisplayString(s.courseName || s.course || ""),
    }));
  }
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
  batchId?: string;
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
  search?: string;
  page?: number;
  limit?: number;
}): Promise<TrainerAttendanceItem[]> {
  const queryParams: Record<string, string | number> = {};
  if (params?.batchId && params.batchId !== "all") queryParams.batchId = params.batchId;
  if (params?.courseId && params.courseId !== "all" && params.courseId !== "none") queryParams.courseId = params.courseId;
  if (params?.date && params.date !== "all") queryParams.date = params.date;
  if (params?.search && params.search.trim()) queryParams.search = params.search.trim();
  if (params?.page) queryParams.page = params.page;
  if (params?.limit) queryParams.limit = params.limit;
  const res = await deduplicatedGet<any>("/api/trainer/attendance", {
    params: Object.keys(queryParams).length > 0 ? queryParams : undefined
  });
  const rawData = res?.data || [];
  return rawData.map((item: any) => ({
    ...item,
    traineeName: cleanDisplayString(item.traineeName || "Trainee"),
    batchName: cleanDisplayString(item.batchName || "Batch"),
    courseName: cleanDisplayString(item.courseName || "General Course"),
  }));
}

export * from "./batchEventApi";


