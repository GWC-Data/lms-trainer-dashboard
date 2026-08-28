import type {
  Assignment,
  AttendanceRow,
  Batch,
  Course,
  DocumentAsset,
  Lesson,
  Module,
  ModuleStatus,
  Quiz,
  ScheduleItem,
  Submission,
  Trainee,
  TraineeModuleProgress,
  VideoAsset,
} from "@/types";
import associateImg from "@/assets/1.png";
import developerImg from "@/assets/2.png";
import architectFoundationalImg from "@/assets/3.png";
import architectProfessionalImg from "@/assets/4.png";

export const trainer = {
  name: "Alex Thompson",
  role: "Trainer",
  initials: "AT",
  email: "alex.thompson@teqcertify.com",
};

// The only 4 courses TeqCertify offers — "The levels we offer." A course is
// shared curriculum; it says nothing about who's enrolled or how far along
// they are — that all lives on the batches below, because the same course
// can run as more than one batch at a time.
export const courses: Course[] = [
  {
    id: "c1",
    name: "Claude Certified Associate",
    level: "Foundational Level",
    category: "Claude Certification",
    mode: "online",
    domains: 7,
    hours: 60,
    image: associateImg,
  },
  {
    id: "c2",
    name: "Claude Certified Developer",
    level: "Foundational Level",
    category: "Claude Certification",
    mode: "online",
    domains: 6,
    hours: 80,
    image: developerImg,
  },
  {
    id: "c3",
    name: "Claude Certified Architect",
    level: "Foundational Level",
    category: "Claude Certification",
    mode: "online",
    domains: 5,
    hours: 80,
    image: architectFoundationalImg,
  },
  {
    id: "c4",
    name: "Claude Certified Architect",
    level: "Professional Level",
    category: "Claude Certification",
    mode: "offline",
    domains: 7,
    hours: 120,
    image: architectProfessionalImg,
  },
];

// Every batch is an independent run of its course — its own trainees, its
// own pace, its own progress. Claude Certified Architect (Professional) runs
// as two parallel offline cohorts here on purpose, to prove the point: same
// course, different batch, different numbers.
export const batches: Batch[] = [
  { id: "b1", courseId: "c1", code: "ASSOC-A", label: "August Intake", nextSession: "Self-paced", progress: 74 },
  { id: "b2", courseId: "c1", code: "ASSOC-B", label: "September Intake", nextSession: "Self-paced", progress: 58 },
  { id: "b3", courseId: "c2", code: "DEV-A", label: "August Intake", nextSession: "Self-paced", progress: 61 },
  { id: "b4", courseId: "c2", code: "DEV-B", label: "September Intake", nextSession: "Self-paced", progress: 44 },
  { id: "b5", courseId: "c3", code: "ARCH-F-A", label: "August Intake", nextSession: "Self-paced", progress: 42 },
  { id: "b6", courseId: "c3", code: "ARCH-F-B", label: "September Intake", nextSession: "Self-paced", progress: 29 },
  {
    id: "b7",
    courseId: "c4",
    code: "ARCH-P-01",
    label: "Bengaluru Cohort",
    location: "Studio 3, TeqCertify Bengaluru Campus",
    nextSession: "10 Sep 2026, 10:00 AM",
    progress: 62,
  },
  {
    id: "b8",
    courseId: "c4",
    code: "ARCH-P-02",
    label: "Hyderabad Cohort",
    location: "Studio 1, TeqCertify Hyderabad Campus",
    nextSession: "12 Sep 2026, 2:00 PM",
    progress: 41,
  },
];

const firstNames = [
  "Priya", "James", "Fatima", "Liam", "Aisha", "Noah", "Sofia", "Ethan",
  "Mia", "Lucas", "Zara", "Ravi", "Grace", "Omar", "Chloe", "Kabir",
  "Nina", "Leo", "Anya", "Victor", "Maya", "Sam", "Tara", "Dev",
  "Ivy", "Rohan", "Wei", "Hana", "Owen", "Lena", "Arjun", "Nora",
  "Felix", "Ines", "Karan", "Bella",
];
const lastNames = [
  "Patel", "Carter", "Khan", "Brooks", "Ahmed", "Turner", "Silva", "Reed",
  "Kapoor", "Bennett", "Ali", "Nair", "Foster", "Hassan", "Diaz", "Malhotra",
  "Ross", "Fischer", "Bose", "Grant", "Iyer", "Wells", "Sharma", "Cole",
  "Verma", "Hughes", "Lopez", "Ng", "Osei", "Berg",
];
const remarksBank = ["", "", "", "", "Left early", "", "", "Notified in advance", ""];

// The first few trainees of ARCH-P-01 are pinned so that batch's roster
// matches the reference attendance screenshot exactly (name, remark).
const FEATURED: Record<string, { first: string; last: string }[]> = {
  b7: [
    { first: "Sarah", last: "Chen" },
    { first: "Marcus", last: "Johnson" },
    { first: "David", last: "Rodriguez" },
    { first: "Elena", last: "Vance" },
  ],
};

function generateTrainees(batchId: string, courseId: string, prefix: string, count: number): Trainee[] {
  const featured = FEATURED[batchId] ?? [];
  return Array.from({ length: count }, (_, i) => {
    const pinned = featured[i];
    const first = pinned ? pinned.first : firstNames[i % firstNames.length];
    const last = pinned ? pinned.last : lastNames[(i * 3 + 1) % lastNames.length];
    const lessonCompletion = 45 + ((i * 13) % 55);
    const quizScore = 50 + ((i * 17) % 50);
    const attendance = 60 + ((i * 7) % 40);
    return {
      id: `${prefix}-${i + 1}`,
      trainerId: `${prefix}-${String(i + 1).padStart(3, "0")}`,
      name: `${first} ${last}`,
      initials: `${first[0]}${last[0]}`,
      courseId,
      batchId,
      lessonCompletion,
      quizScore,
      attendance,
      atRisk: attendance < 75 || quizScore < 60,
    };
  });
}

export const trainees: Trainee[] = [
  ...generateTrainees("b1", "c1", "ASSOC-A", 24),
  ...generateTrainees("b2", "c1", "ASSOC-B", 18),
  ...generateTrainees("b3", "c2", "DEV-A", 20),
  ...generateTrainees("b4", "c2", "DEV-B", 15),
  ...generateTrainees("b5", "c3", "ARCH-F-A", 15),
  ...generateTrainees("b6", "c3", "ARCH-F-B", 11),
  ...generateTrainees("b7", "c4", "ARCH-P-01", 30),
  ...generateTrainees("b8", "c4", "ARCH-P-02", 22),
];

function generateAttendanceRows(
  batchId: string,
  lateIndex: number,
  absentIndex: number,
  lateRemark: string
): AttendanceRow[] {
  return traineesForBatch(batchId).map((t, i) => ({
    traineeId: t.id,
    status: i === lateIndex ? "L" : i === absentIndex ? "A" : "P",
    remark: i === lateIndex ? lateRemark : remarksBank[i % remarksBank.length],
  }));
}

// Attendance only applies to offline batches — each one keeps its own roster,
// so the same course's two cohorts can show very different attendance rates.
export const attendanceRoster: AttendanceRow[] = [
  ...generateAttendanceRows("b7", 1, 5, "Train delayed"),
  ...generateAttendanceRows("b8", 7, 2, "Traffic delay"),
];

// One module per certification domain — content is shared across every
// batch of a course, unlike progress and attendance which are per batch.
export const modules: Module[] = [
  // Claude Certified Associate — Foundational Level (7 domains)
  { id: "m1", courseId: "c1", title: "Introduction to Claude & LLMs", lessonsCount: 5, updatedAt: "2 days ago" },
  { id: "m2", courseId: "c1", title: "Prompt Engineering Fundamentals", lessonsCount: 4, updatedAt: "4 days ago" },
  { id: "m3", courseId: "c1", title: "Claude API Essentials", lessonsCount: 4, updatedAt: "1 week ago" },
  { id: "m4", courseId: "c1", title: "Responsible & Safe AI Use", lessonsCount: 3, updatedAt: "1 week ago" },
  { id: "m5", courseId: "c1", title: "Claude for Everyday Productivity", lessonsCount: 3, updatedAt: "2 weeks ago" },
  { id: "m6", courseId: "c1", title: "Claude for Business Workflows", lessonsCount: 3, updatedAt: "3 weeks ago" },
  { id: "m7", courseId: "c1", title: "Associate Certification Exam Prep", lessonsCount: 3, updatedAt: "3 weeks ago" },
  // Claude Certified Developer — Foundational Level (6 domains)
  { id: "m8", courseId: "c2", title: "Claude API Deep Dive", lessonsCount: 5, updatedAt: "3 days ago" },
  { id: "m9", courseId: "c2", title: "Tool Use & Function Calling", lessonsCount: 4, updatedAt: "5 days ago" },
  { id: "m10", courseId: "c2", title: "Building Agents with Claude", lessonsCount: 4, updatedAt: "1 week ago" },
  { id: "m11", courseId: "c2", title: "Retrieval-Augmented Generation (RAG)", lessonsCount: 4, updatedAt: "1 week ago" },
  { id: "m12", courseId: "c2", title: "Testing & Evaluating Claude Apps", lessonsCount: 3, updatedAt: "2 weeks ago" },
  { id: "m13", courseId: "c2", title: "Deploying Production Claude Applications", lessonsCount: 3, updatedAt: "2 weeks ago" },
  // Claude Certified Architect — Foundational Level (5 domains)
  { id: "m14", courseId: "c3", title: "AI System Architecture Fundamentals", lessonsCount: 4, updatedAt: "4 days ago" },
  { id: "m15", courseId: "c3", title: "Claude Deployment Models", lessonsCount: 4, updatedAt: "1 week ago" },
  { id: "m16", courseId: "c3", title: "Security & Governance for AI Systems", lessonsCount: 4, updatedAt: "1 week ago" },
  { id: "m17", courseId: "c3", title: "Scaling Claude in the Enterprise", lessonsCount: 3, updatedAt: "2 weeks ago" },
  { id: "m18", courseId: "c3", title: "Architecture Case Studies", lessonsCount: 3, updatedAt: "3 weeks ago" },
  // Claude Certified Architect — Professional Level (7 domains)
  { id: "m19", courseId: "c4", title: "Advanced Multi-Agent Architectures", lessonsCount: 5, updatedAt: "2 days ago" },
  { id: "m20", courseId: "c4", title: "Enterprise Claude Integration Strategy", lessonsCount: 4, updatedAt: "5 days ago" },
  { id: "m21", courseId: "c4", title: "Cost & Performance Optimization", lessonsCount: 4, updatedAt: "1 week ago" },
  { id: "m22", courseId: "c4", title: "Advanced Safety & Compliance Frameworks", lessonsCount: 4, updatedAt: "1 week ago" },
  { id: "m23", courseId: "c4", title: "Claude in Regulated Industries", lessonsCount: 4, updatedAt: "2 weeks ago" },
  { id: "m24", courseId: "c4", title: "Capstone Architecture Project", lessonsCount: 4, updatedAt: "3 weeks ago" },
  { id: "m25", courseId: "c4", title: "Professional Certification Assessment", lessonsCount: 3, updatedAt: "3 weeks ago" },
];

export const lessons: Lesson[] = [
  { id: "l1", moduleId: "m1", courseId: "c1", title: "What Is Claude? Model Family Overview", type: "video", duration: "12:10" },
  { id: "l2", moduleId: "m1", courseId: "c1", title: "How LLMs Generate Text", type: "video", duration: "15:40" },
  { id: "l3", moduleId: "m1", courseId: "c1", title: "Claude Model Comparison — Reference Sheet", type: "document" },
  { id: "l4", moduleId: "m1", courseId: "c1", title: "Domain 1 Knowledge Check", type: "quiz" },
  { id: "l5", moduleId: "m1", courseId: "c1", title: "Explore the Claude Console", type: "assignment" },
  { id: "l6", moduleId: "m2", courseId: "c1", title: "Anatomy of a Good Prompt", type: "video", duration: "14:20" },
  { id: "l7", moduleId: "m2", courseId: "c1", title: "Prompting Techniques Cheatsheet", type: "document" },
  { id: "l8", moduleId: "m8", courseId: "c2", title: "Authentication & the Messages API", type: "video", duration: "16:05" },
  { id: "l9", moduleId: "m8", courseId: "c2", title: "API Parameters Reference", type: "document" },
  { id: "l10", moduleId: "m10", courseId: "c2", title: "Building Your First Agent", type: "video", duration: "19:30" },
  { id: "l11", moduleId: "m19", courseId: "c4", title: "Designing Multi-Agent Systems", type: "video", duration: "21:15" },
];

export const videos: VideoAsset[] = [
  { id: "v1", title: "What Is Claude? Model Family Overview", courseId: "c1", duration: "12:10", uploadedAt: "2 days ago", size: "158 MB" },
  { id: "v2", title: "How LLMs Generate Text", courseId: "c1", duration: "15:40", uploadedAt: "2 days ago", size: "201 MB" },
  { id: "v3", title: "Anatomy of a Good Prompt", courseId: "c1", duration: "14:20", uploadedAt: "4 days ago", size: "184 MB" },
  { id: "v4", title: "Authentication & the Messages API", courseId: "c2", duration: "16:05", uploadedAt: "3 days ago", size: "212 MB" },
  { id: "v5", title: "Building Your First Agent", courseId: "c2", duration: "19:30", uploadedAt: "1 week ago", size: "247 MB" },
  { id: "v6", title: "Designing Multi-Agent Systems", courseId: "c4", duration: "21:15", uploadedAt: "2 days ago", size: "268 MB" },
];

export const documents: DocumentAsset[] = [
  { id: "d1", title: "Claude Model Comparison — Reference Sheet", courseId: "c1", fileType: "PDF", uploadedAt: "2 days ago", size: "1.1 MB" },
  { id: "d2", title: "Prompting Techniques Cheatsheet", courseId: "c1", fileType: "DOCX", uploadedAt: "4 days ago", size: "420 KB" },
  { id: "d3", title: "API Parameters Reference", courseId: "c2", fileType: "PDF", uploadedAt: "3 days ago", size: "980 KB" },
  { id: "d4", title: "RAG Pattern Comparison", courseId: "c2", fileType: "XLSX", uploadedAt: "1 week ago", size: "310 KB" },
  { id: "d5", title: "Multi-Agent Pattern Library", courseId: "c4", fileType: "PPTX", uploadedAt: "2 days ago", size: "4.1 MB" },
];

// Quizzes and assignments are course-level content, shared by every batch.
export const quizzes: Quiz[] = [
  { id: "q1", title: "Domain 1 Knowledge Check — Claude & LLM Basics", courseId: "c1", questions: 12, submissions: 36, totalTrainees: 42, avgScore: 81, status: "published" },
  { id: "q2", title: "Prompt Engineering Quiz", courseId: "c1", questions: 10, submissions: 30, totalTrainees: 42, avgScore: 74, status: "published" },
  { id: "q3", title: "Tool Use & Function Calling Quiz", courseId: "c2", questions: 10, submissions: 22, totalTrainees: 35, avgScore: 69, status: "published" },
  { id: "q4", title: "RAG Patterns Assessment", courseId: "c2", questions: 15, submissions: 18, totalTrainees: 35, avgScore: 72, status: "published" },
  { id: "q5", title: "Professional Capstone Readiness Quiz", courseId: "c4", questions: 20, submissions: 0, totalTrainees: 52, avgScore: 0, status: "draft" },
];

export const assignments: Assignment[] = [
  { id: "a1", title: "Build Your First Claude Prompt Library", courseId: "c1", submissions: 34, pendingReview: 8, totalTrainees: 42, dueDate: "05 Sep 2026" },
  { id: "a2", title: "Implement Tool Use in a Claude Agent", courseId: "c2", submissions: 21, pendingReview: 14, totalTrainees: 35, dueDate: "18 Sep 2026" },
  { id: "a3", title: "Capstone: Design a Multi-Agent Enterprise System", courseId: "c4", submissions: 27, pendingReview: 6, totalTrainees: 52, dueDate: "20 Sep 2026" },
];

export const submissions: Submission[] = [
  { id: "s1", assignmentId: "a1", traineeName: "Priya Iyer", traineeInitials: "PI", submittedAt: "2 days ago", status: "pending" },
  { id: "s2", assignmentId: "a1", traineeName: "James Carter", traineeInitials: "JC", submittedAt: "2 days ago", status: "reviewed", marks: 85, feedback: "Solid prompt library. Add a few negative examples to show what to avoid." },
  { id: "s3", assignmentId: "a2", traineeName: "Fatima Khan", traineeInitials: "FK", submittedAt: "4 hours ago", status: "pending" },
  { id: "s4", assignmentId: "a3", traineeName: "Sarah Chen", traineeInitials: "SC", submittedAt: "2 days ago", status: "pending" },
  { id: "s5", assignmentId: "a3", traineeName: "Marcus Johnson", traineeInitials: "MJ", submittedAt: "2 days ago", status: "reviewed", marks: 88, feedback: "Great coordinator/worker split. Double-check the fallback routing for failed tool calls." },
  { id: "s6", assignmentId: "a3", traineeName: "David Rodriguez", traineeInitials: "DR", submittedAt: "3 days ago", status: "pending" },
  { id: "s7", assignmentId: "a3", traineeName: "Elena Vance", traineeInitials: "EV", submittedAt: "1 day ago", status: "reviewed", marks: 92, feedback: "Excellent documentation and a clean, well-justified architecture diagram." },
];

// Each offline batch runs its own session calendar.
export const schedule: ScheduleItem[] = [
  { id: "sc1", batchId: "b7", date: "TODAY", time: "10:00 AM", title: "Session 1: Multi-Agent Architectures", description: "Coordinator/worker patterns, hand-offs, and...", isToday: true },
  { id: "sc2", batchId: "b7", date: "SEP 12", time: "10:00 AM", title: "Session 2: Enterprise Integration Strategy", description: "Claude in enterprise systems, gateways, and SSO." },
  { id: "sc3", batchId: "b7", date: "SEP 15", time: "10:00 AM", title: "Session 3: Cost & Performance Optimization", description: "Token budgets, caching strategies, and latency." },
  { id: "sc4", batchId: "b7", date: "SEP 18", time: "10:00 AM", title: "Session 4: Compliance Frameworks", description: "Safety reviews, audit trails, and regulated use." },
  { id: "sc5", batchId: "b8", date: "SEP 12", time: "2:00 PM", title: "Session 1: Multi-Agent Architectures", description: "Coordinator/worker patterns, hand-offs, and...", isToday: false },
  { id: "sc6", batchId: "b8", date: "SEP 16", time: "2:00 PM", title: "Session 2: Enterprise Integration Strategy", description: "Claude in enterprise systems, gateways, and SSO." },
  { id: "sc7", batchId: "b8", date: "SEP 19", time: "2:00 PM", title: "Session 3: Cost & Performance Optimization", description: "Token budgets, caching strategies, and latency." },
  { id: "sc8", batchId: "b8", date: "SEP 23", time: "2:00 PM", title: "Session 4: Compliance Frameworks", description: "Safety reviews, audit trails, and regulated use." },
];

export function courseById(id: string): Course | undefined {
  return courses.find((c) => c.id === id);
}

export function batchById(id: string): Batch | undefined {
  return batches.find((b) => b.id === id);
}

export function batchesForCourse(courseId: string): Batch[] {
  return batches.filter((b) => b.courseId === courseId);
}

export function traineesForBatch(batchId: string): Trainee[] {
  return trainees.filter((t) => t.batchId === batchId);
}

export function attendanceForBatch(batchId: string): AttendanceRow[] {
  const ids = new Set(traineesForBatch(batchId).map((t) => t.id));
  return attendanceRoster.filter((r) => ids.has(r.traineeId));
}

export function scheduleForBatch(batchId: string): ScheduleItem[] {
  return schedule.filter((s) => s.batchId === batchId);
}

// Every offline batch across every course — this is what the Attendance
// page lets the trainer switch between.
export function offlineBatches(): Batch[] {
  return batches.filter((b) => courseById(b.courseId)?.mode === "offline");
}

export function modulesForCourse(courseId: string): Module[] {
  return modules.filter((m) => m.courseId === courseId);
}

export function totalTraineesForCourse(courseId: string): number {
  return trainees.filter((t) => t.courseId === courseId).length;
}

// A course's own "progress" is just the trainee-weighted average of its
// batches — each batch still moves at its own pace underneath.
export function avgProgressForCourse(courseId: string): number {
  const courseBatches = batchesForCourse(courseId);
  if (courseBatches.length === 0) return 0;
  const totalTrainees = courseBatches.reduce((sum, b) => sum + traineesForBatch(b.id).length, 0);
  if (totalTrainees === 0) {
    return Math.round(courseBatches.reduce((sum, b) => sum + b.progress, 0) / courseBatches.length);
  }
  const weighted = courseBatches.reduce((sum, b) => sum + b.progress * traineesForBatch(b.id).length, 0);
  return Math.round(weighted / totalTrainees);
}

export function nextSessionForCourse(courseId: string): string {
  const courseBatches = batchesForCourse(courseId);
  const scheduled = courseBatches.find((b) => b.nextSession && b.nextSession !== "Self-paced");
  return scheduled?.nextSession ?? courseBatches[0]?.nextSession ?? "—";
}

// Every module of a trainee's course is handled here, per trainee, per batch —
// derived from their overall lesson-completion % so it always stays in sync.
export function traineeModuleProgress(trainee: Trainee): TraineeModuleProgress[] {
  const courseModules = modulesForCourse(trainee.courseId);
  const total = courseModules.length;
  if (total === 0) return [];

  const perModule = 100 / total;
  const completedCount = Math.min(total, Math.floor(trainee.lessonCompletion / perModule));

  return courseModules.map((module, i) => {
    let status: ModuleStatus = "not-started";
    if (i < completedCount) status = "completed";
    else if (i === completedCount && trainee.lessonCompletion > completedCount * perModule) {
      status = "in-progress";
    }
    return { module, status };
  });
}
