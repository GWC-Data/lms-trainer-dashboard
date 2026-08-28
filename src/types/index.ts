export type DeliveryMode = "online" | "offline";

// A course is the shared curriculum (content, quizzes, assignments).
// It can run as more than one batch at a time — each batch is its own
// cohort with its own trainees, its own progress, and (for offline courses)
// its own attendance and schedule. Course-level fields never vary by batch;
// anything that can differ between two runs of the same course lives on Batch.
export interface Course {
  id: string;
  name: string;
  level: string; // e.g. "Foundational Level" | "Professional Level"
  category: string;
  mode: DeliveryMode;
  domains: number;
  hours: number;
  image: string;
}

export interface Batch {
  id: string;
  courseId: string;
  code: string; // e.g. "ARCH-P-01"
  label: string; // e.g. "August Intake"
  location?: string; // offline batches only
  nextSession?: string;
  progress: number; // 0-100 — independent per batch, even for the same course
}

export interface Trainee {
  id: string;
  trainerId: string; // trainee code e.g. ARCH-P-01-042
  name: string;
  initials: string;
  courseId: string;
  batchId: string;
  lessonCompletion: number; // %
  quizScore: number; // %
  attendance: number; // %
  atRisk: boolean;
}

export type AttendanceStatus = "P" | "A" | "L";

export interface AttendanceRow {
  traineeId: string;
  status: AttendanceStatus;
  remark: string;
}

export interface Module {
  id: string;
  courseId: string;
  title: string;
  lessonsCount: number;
  updatedAt: string;
}

export type ModuleStatus = "completed" | "in-progress" | "not-started";

export interface TraineeModuleProgress {
  module: Module;
  status: ModuleStatus;
}

export interface Lesson {
  id: string;
  moduleId: string;
  courseId: string;
  title: string;
  type: "video" | "document" | "quiz" | "assignment";
  duration?: string;
}

export interface VideoAsset {
  id: string;
  title: string;
  courseId: string;
  duration: string;
  uploadedAt: string;
  size: string;
  fileUrl?: string; // session-only blob: URL for freshly uploaded videos
}

export interface DocumentAsset {
  id: string;
  title: string;
  courseId: string;
  fileType: string; // e.g. "PDF" | "DOCX" | "PPTX" | "XLSX" | any uploaded extension
  uploadedAt: string;
  size: string;
  fileUrl?: string; // session-only blob: URL for freshly uploaded documents
}

export interface Quiz {
  id: string;
  title: string;
  courseId: string;
  questions: number;
  submissions: number;
  totalTrainees: number;
  avgScore: number;
  status: "draft" | "published";
}

export interface Assignment {
  id: string;
  title: string;
  courseId: string;
  submissions: number;
  pendingReview: number;
  totalTrainees: number;
  dueDate: string;
}

export interface Submission {
  id: string;
  assignmentId: string;
  traineeName: string;
  traineeInitials: string;
  submittedAt: string;
  status: "pending" | "reviewed";
  marks?: number;
  feedback?: string;
}

export interface ScheduleItem {
  id: string;
  batchId: string;
  date: string;
  time: string;
  title: string;
  description: string;
  isToday?: boolean;
}
