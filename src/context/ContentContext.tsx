import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  modules as initialModules,
  lessons as initialLessons,
  videos as initialVideos,
  documents as initialDocuments,
  quizzes as initialQuizzes,
  assignments as initialAssignments,
  totalTraineesForCourse,
} from "@/data/mockData";
import type { Assignment, DocumentAsset, Lesson, Module, Quiz, VideoAsset } from "@/types";

const STORAGE_KEY = "lms-content-store-v1";

interface StoredShape {
  modules: Module[];
  lessons: Lesson[];
  videos: VideoAsset[];
  documents: DocumentAsset[];
  quizzes: Quiz[];
  assignments: Assignment[];
}

function loadStored(): StoredShape | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredShape;
  } catch {
    return null;
  }
}

function makeId(prefix: string): string {
  const rand = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2);
  return `${prefix}-${rand}`;
}

export interface NewModuleInput {
  title: string;
  courseId: string;
}

export interface NewLessonInput {
  title: string;
  courseId: string;
  moduleId: string;
  type: Lesson["type"];
  duration?: string;
}

export interface NewVideoInput {
  title: string;
  courseId: string;
  duration: string;
  size: string;
  fileUrl?: string;
}

export interface NewDocumentInput {
  title: string;
  courseId: string;
  fileType: string;
  size: string;
  fileUrl?: string;
}

export interface NewQuizInput {
  title: string;
  courseId: string;
  questions: number;
  status: Quiz["status"];
}

export interface NewAssignmentInput {
  title: string;
  courseId: string;
  dueDate: string;
}

interface ContentContextValue {
  modules: Module[];
  lessons: Lesson[];
  videos: VideoAsset[];
  documents: DocumentAsset[];
  quizzes: Quiz[];
  assignments: Assignment[];
  addModule: (input: NewModuleInput) => Module;
  addLesson: (input: NewLessonInput) => Lesson;
  addVideo: (input: NewVideoInput) => VideoAsset;
  addDocument: (input: NewDocumentInput) => DocumentAsset;
  addQuiz: (input: NewQuizInput) => Quiz;
  updateQuiz: (id: string, input: NewQuizInput) => void;
  addAssignment: (input: NewAssignmentInput) => Assignment;
}

const ContentContext = createContext<ContentContextValue | null>(null);

export function ContentProvider({ children }: { children: ReactNode }) {
  const stored = useMemo(loadStored, []);

  const [modules, setModules] = useState<Module[]>(stored?.modules ?? initialModules);
  const [lessons, setLessons] = useState<Lesson[]>(stored?.lessons ?? initialLessons);
  const [videos, setVideos] = useState<VideoAsset[]>(stored?.videos ?? initialVideos);
  const [documents, setDocuments] = useState<DocumentAsset[]>(stored?.documents ?? initialDocuments);
  const [quizzes, setQuizzes] = useState<Quiz[]>(stored?.quizzes ?? initialQuizzes);
  const [assignments, setAssignments] = useState<Assignment[]>(stored?.assignments ?? initialAssignments);

  useEffect(() => {
    // fileUrl is a blob: URL that only lives for this session — don't persist a dead reference.
    const payload: StoredShape = {
      modules,
      lessons,
      videos: videos.map(({ fileUrl: _fileUrl, ...rest }) => rest),
      documents: documents.map(({ fileUrl: _fileUrl, ...rest }) => rest),
      quizzes,
      assignments,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // storage full or unavailable — additions still work for this session
    }
  }, [modules, lessons, videos, documents, quizzes, assignments]);

  function addModule(input: NewModuleInput): Module {
    const newModule: Module = {
      id: makeId("m"),
      courseId: input.courseId,
      title: input.title,
      lessonsCount: 0,
      updatedAt: "just now",
    };
    setModules((prev) => [newModule, ...prev]);
    return newModule;
  }

  function addLesson(input: NewLessonInput): Lesson {
    const newLesson: Lesson = {
      id: makeId("l"),
      moduleId: input.moduleId,
      courseId: input.courseId,
      title: input.title,
      type: input.type,
      duration: input.duration,
    };
    setLessons((prev) => [newLesson, ...prev]);
    setModules((prev) =>
      prev.map((m) =>
        m.id === input.moduleId ? { ...m, lessonsCount: m.lessonsCount + 1, updatedAt: "just now" } : m
      )
    );
    return newLesson;
  }

  function addVideo(input: NewVideoInput): VideoAsset {
    const newVideo: VideoAsset = {
      id: makeId("v"),
      title: input.title,
      courseId: input.courseId,
      duration: input.duration,
      uploadedAt: "just now",
      size: input.size,
      fileUrl: input.fileUrl,
    };
    setVideos((prev) => [newVideo, ...prev]);
    return newVideo;
  }

  function addDocument(input: NewDocumentInput): DocumentAsset {
    const newDocument: DocumentAsset = {
      id: makeId("d"),
      title: input.title,
      courseId: input.courseId,
      fileType: input.fileType,
      uploadedAt: "just now",
      size: input.size,
      fileUrl: input.fileUrl,
    };
    setDocuments((prev) => [newDocument, ...prev]);
    return newDocument;
  }

  function addQuiz(input: NewQuizInput): Quiz {
    const newQuiz: Quiz = {
      id: makeId("q"),
      title: input.title,
      courseId: input.courseId,
      questions: input.questions,
      submissions: 0,
      totalTrainees: totalTraineesForCourse(input.courseId),
      avgScore: 0,
      status: input.status,
    };
    setQuizzes((prev) => [newQuiz, ...prev]);
    return newQuiz;
  }

  function updateQuiz(id: string, input: NewQuizInput) {
    setQuizzes((prev) =>
      prev.map((q) =>
        q.id === id
          ? { ...q, title: input.title, courseId: input.courseId, questions: input.questions, status: input.status }
          : q
      )
    );
  }

  function addAssignment(input: NewAssignmentInput): Assignment {
    const newAssignment: Assignment = {
      id: makeId("a"),
      title: input.title,
      courseId: input.courseId,
      submissions: 0,
      pendingReview: 0,
      totalTrainees: totalTraineesForCourse(input.courseId),
      dueDate: input.dueDate,
    };
    setAssignments((prev) => [newAssignment, ...prev]);
    return newAssignment;
  }

  const value: ContentContextValue = {
    modules,
    lessons,
    videos,
    documents,
    quizzes,
    assignments,
    addModule,
    addLesson,
    addVideo,
    addDocument,
    addQuiz,
    updateQuiz,
    addAssignment,
  };

  return <ContentContext.Provider value={value}>{children}</ContentContext.Provider>;
}

export function useContent(): ContentContextValue {
  const ctx = useContext(ContentContext);
  if (!ctx) throw new Error("useContent must be used within a ContentProvider");
  return ctx;
}
