import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { modules as initialModules, lessons as initialLessons, videos as initialVideos, documents as initialDocuments, quizzes as initialQuizzes, assignments as initialAssignments, totalTraineesForCourse, } from "@/data/mockData";
const STORAGE_KEY = "lms-content-store-v1";
function loadStored() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw)
            return null;
        return JSON.parse(raw);
    }
    catch {
        return null;
    }
}
function makeId(prefix) {
    const rand = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2);
    return `${prefix}-${rand}`;
}
const ContentContext = createContext(null);
export function ContentProvider({ children }) {
    const stored = useMemo(loadStored, []);
    const [modules, setModules] = useState(stored?.modules ?? initialModules);
    const [lessons, setLessons] = useState(stored?.lessons ?? initialLessons);
    const [videos, setVideos] = useState(stored?.videos ?? initialVideos);
    const [documents, setDocuments] = useState(stored?.documents ?? initialDocuments);
    const [quizzes, setQuizzes] = useState(stored?.quizzes ?? initialQuizzes);
    const [assignments, setAssignments] = useState(stored?.assignments ?? initialAssignments);
    useEffect(() => {
        // fileUrl is a blob: URL that only lives for this session — don't persist a dead reference.
        const payload = {
            modules,
            lessons,
            videos: videos.map(({ fileUrl: _fileUrl, ...rest }) => rest),
            documents: documents.map(({ fileUrl: _fileUrl, ...rest }) => rest),
            quizzes,
            assignments,
        };
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
        }
        catch {
            // storage full or unavailable — additions still work for this session
        }
    }, [modules, lessons, videos, documents, quizzes, assignments]);
    function addModule(input) {
        const newModule = {
            id: makeId("m"),
            courseId: input.courseId,
            title: input.title,
            lessonsCount: 0,
            updatedAt: "just now",
        };
        setModules((prev) => [newModule, ...prev]);
        return newModule;
    }
    function addLesson(input) {
        const newLesson = {
            id: makeId("l"),
            moduleId: input.moduleId,
            courseId: input.courseId,
            title: input.title,
            type: input.type,
            duration: input.duration,
        };
        setLessons((prev) => [newLesson, ...prev]);
        setModules((prev) => prev.map((m) => m.id === input.moduleId ? { ...m, lessonsCount: m.lessonsCount + 1, updatedAt: "just now" } : m));
        return newLesson;
    }
    function addVideo(input) {
        const newVideo = {
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
    function addDocument(input) {
        const newDocument = {
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
    function addQuiz(input) {
        const newQuiz = {
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
    function updateQuiz(id, input) {
        setQuizzes((prev) => prev.map((q) => q.id === id
            ? { ...q, title: input.title, courseId: input.courseId, questions: input.questions, status: input.status }
            : q));
    }
    function addAssignment(input) {
        const newAssignment = {
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
    const value = {
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
    return _jsx(ContentContext.Provider, { value: value, children: children });
}
export function useContent() {
    const ctx = useContext(ContentContext);
    if (!ctx)
        throw new Error("useContent must be used within a ContentProvider");
    return ctx;
}
