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

// Public auth endpoints that must never attach or depend on an Authorization Bearer token
export const PUBLIC_AUTH_PATHS = [
  "/auth/login",
  "/auth/forgot-password",
  "/forgot-password",
  "/auth/reset-password",
  "/reset-password",
  "/auth/trainer-email",
  "/set-password",
];

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

// Response interceptor — handle 401 global unauthorized
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      const url = error.config?.url || "";
      const isPublicAuth = PUBLIC_AUTH_PATHS.some((path) => url.includes(path));
      if (!isPublicAuth) {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        localStorage.removeItem(USER_STORAGE_KEY);
        if (
          window.location.pathname !== "/login" &&
          !window.location.pathname.startsWith("/set-password") &&
          !window.location.pathname.startsWith("/forgot-password") &&
          !window.location.pathname.startsWith("/reset-password")
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

export interface DashboardSummary {
  assignedCourses: number;
  onlineBatches: number;
  offlineBatches: number;
  totalTrainees: number;
  atRiskTrainees: number;
  pendingEvaluations: number;
  averageAttendance: number;
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
 * Scoped strictly to authenticated trainer via Bearer JWT.
 */
export async function getTrainerDashboardApi(): Promise<TrainerDashboardResponse> {
  const response = await api.get<TrainerDashboardResponse>("/api/trainer/dashboard");
  return response.data;
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
  const response = await api.post<ForgotPasswordResponse>(
    "/auth/forgot-password",
    {
      email: email.trim().toLowerCase(),
    },
    {
      headers: {
        Authorization: undefined,
      },
    }
  );
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

export interface TrainerCoursesResponse {
  success: boolean;
  statusCode?: number;
  message?: string;
  courses: TrainerCourseItem[];
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
  courseId: string;
}

export interface CreateModuleResponse {
  success: boolean;
  message: string;
  moduleId?: string;
  module?: BackendModuleItem;
}

/**
 * Real Trainer Courses API: GET /api/trainer/courses
 * Bearer JWT authenticated. Returns courses scoped strictly to the trainer.
 */
export async function getTrainerCoursesApi(): Promise<TrainerCoursesResponse> {
  const response = await api.get<TrainerCoursesResponse>("/api/trainer/courses");
  return response.data;
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
    courseId: payload.courseId
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

/**
 * Real Batch API: GET /batches
 * Scoped to trainer's authorized batches/courses via JWT.
 */
export async function getTrainerBatchesApi(courseId?: string): Promise<BackendBatchItem[]> {
  const response = await api.get<BatchesResponse>("/batches", {
    params: courseId ? { courseId } : undefined
  });
  const list = response.data?.batch?.data || response.data?.data || [];
  return list;
}

export async function getBatchesForCourseApi(courseId: string): Promise<BackendBatchItem[]> {
  return getTrainerBatchesApi(courseId);
}

/**
 * Real Batch Details API: GET /batches/:id
 */
export async function getBatchDetailsApi(batchId: string): Promise<any> {
  const response = await api.get<{ message: string; batch: any }>(`/batches/${batchId}`);
  return response.data?.batch;
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
  try {
    const response = await api.get<QuizResultsResponse>(`/quizzes/${encodeURIComponent(cleanId)}/results`);
    return response.data;
  } catch (err: any) {
    const response = await api.get<QuizResultsResponse>("/assessment-results", {
      params: { assessmentId: cleanId }
    });
    return response.data;
  }
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
  const response = await api.get<AssignmentsResponse>("/assignments", {
    params: params ?? undefined
  });
  return response.data?.assignments || [];
}

/**
 * Real Single Assignment API: GET /assignments/:id
 */
export async function getAssignmentByIdApi(id: string): Promise<AssignmentItem | null> {
  const response = await api.get<{ success: boolean; assignment: AssignmentItem }>(`/assignments/${id}`);
  return response.data?.assignment || null;
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
  const response = await api.get<SubmissionsResponse>(`/assignments/${assignmentId}/submissions`);
  return response.data?.submissions || [];
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
  completedLessons: number;
  totalLessons: number;
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
  data: {
    trainees: TraineeListItem[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

export async function getTraineesApi(params?: {
  courseId?: string;
  batchId?: string;
  search?: string;
  mode?: string;
  atRisk?: boolean;
  page?: number;
  limit?: number;
}): Promise<TraineesApiResponse> {
  const response = await api.get<any>("/api/trainees", {
    params: params ?? undefined
  });
  const resData = response.data;
  const rawList = resData?.data?.trainees || resData?.trainees || [];
  const normalizedList: TraineeListItem[] = rawList.map((t: any) => {
    const fullName = t.name || t.fullName || (t.firstName || t.lastName ? `${t.firstName || ''} ${t.lastName || ''}`.trim() : 'Trainee');
    const bId = t.batchId || t.batch?.batchId || '';
    const bName = t.batchName || t.batch?.batchName || '';
    const cId = t.courseId || t.course?.courseId || '';
    const cName = t.courseName || t.course?.courseName || '';

    return {
      id: t.id || t.traineeId || '',
      name: fullName,
      email: t.email || '',
      batchId: bId,
      batchName: bName,
      courseId: cId,
      courseName: cName,
      mode: t.mode || t.batch?.mode || 'online',
      progressPct: Number(t.progressPct ?? t.lessonCompletion?.percentage ?? 0),
      completedLessons: Number(t.completedLessons ?? t.lessonCompletion?.completed ?? 0),
      totalLessons: Number(t.totalLessons ?? t.lessonCompletion?.total ?? 0),
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
    data: {
      ...resData?.data,
      trainees: normalizedList
    }
  };
}

export async function getTraineeDetailsApi(traineeId: string): Promise<any> {
  const response = await api.get(`/api/trainees/${traineeId}/details`);
  return response.data;
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

export async function getAttendanceByBatchApi(batchId?: string, courseId?: string): Promise<any> {
  const params: Record<string, string> = {};
  if (batchId && batchId !== "all") {
    params.batchId = batchId;
  }
  if (courseId && courseId !== "all") {
    params.courseId = courseId;
  }
  const response = await api.get<any>("/attendance", { params });
  return response.data;
}


