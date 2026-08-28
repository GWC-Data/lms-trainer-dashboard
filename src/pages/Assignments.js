import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { Plus, PencilLine, CheckCircle2, Clock3, FileCheck2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { submissions as initialSubmissions, courseById, trainees, batchById } from "@/data/mockData";
import { useContent } from "@/context/ContentContext";
import AddAssignmentModal from "@/components/forms/AddAssignmentModal";
import { cn } from "@/lib/utils";
export default function Assignments() {
    const { assignments } = useContent();
    const [submissions, setSubmissions] = useState(initialSubmissions);
    const [activeAssignmentId, setActiveAssignmentId] = useState(assignments[0].id);
    const [activeSubmissionId, setActiveSubmissionId] = useState(null);
    const [marks, setMarks] = useState("");
    const [feedback, setFeedback] = useState("");
    const [modalOpen, setModalOpen] = useState(false);
    useEffect(() => {
        if (!assignments.some((a) => a.id === activeAssignmentId) && assignments[0]) {
            setActiveAssignmentId(assignments[0].id);
        }
    }, [assignments, activeAssignmentId]);
    const activeAssignment = assignments.find((a) => a.id === activeAssignmentId);
    const course = courseById(activeAssignment.courseId);
    const assignmentSubmissions = useMemo(() => submissions.filter((s) => s.assignmentId === activeAssignmentId), [submissions, activeAssignmentId]);
    const activeSubmission = submissions.find((s) => s.id === activeSubmissionId) ?? null;
    function openSubmission(s) {
        setActiveSubmissionId(s.id);
        setMarks(s.marks?.toString() ?? "");
        setFeedback(s.feedback ?? "");
    }
    function publishResult() {
        if (!activeSubmission)
            return;
        setSubmissions((prev) => prev.map((s) => s.id === activeSubmission.id
            ? { ...s, status: "reviewed", marks: Number(marks) || 0, feedback }
            : s));
        setActiveSubmissionId(null);
    }
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold text-[#3A2A22]", children: "Assignments" }), _jsx("p", { className: "text-sm text-[#8C7A70]", children: "Trainer reviews each submission, enters marks & feedback, then publishes the result." })] }), _jsxs(Button, { onClick: () => setModalOpen(true), children: [_jsx(Plus, { className: "h-4 w-4" }), " Create Assignment"] })] }), _jsx("div", { className: "flex gap-3 overflow-x-auto pb-1", children: assignments.map((a) => (_jsxs("button", { onClick: () => {
                        setActiveAssignmentId(a.id);
                        setActiveSubmissionId(null);
                    }, className: cn("flex shrink-0 flex-col rounded-xl border px-4 py-3 text-left transition-colors", a.id === activeAssignmentId
                        ? "border-[#DE896A] bg-[#FBECE7]"
                        : "border-[#F5E2DA] bg-white hover:bg-[#FFFBF9]"), children: [_jsxs("span", { className: "flex items-center gap-1.5 text-sm font-medium text-[#3A2A22]", children: [_jsx(PencilLine, { className: "h-3.5 w-3.5 text-[#DE896A]" }), " ", a.title] }), _jsxs("span", { className: "mt-1 text-xs text-[#B7A79D]", children: [a.submissions, "/", a.totalTrainees, " submitted \u00B7 ", a.pendingReview, " pending"] })] }, a.id))) }), _jsxs("div", { className: "grid grid-cols-1 gap-6 lg:grid-cols-5", children: [_jsxs(Card, { className: "lg:col-span-3", children: [_jsxs(CardHeader, { className: "flex flex-row items-center justify-between", children: [_jsxs("div", { children: [_jsx(CardTitle, { children: activeAssignment.title }), _jsxs("p", { className: "mt-1 text-xs text-[#B7A79D]", children: [course?.name, " \u00B7 Due ", activeAssignment.dueDate] })] }), _jsxs(Badge, { tone: activeAssignment.pendingReview > 0 ? "amber" : "green", children: [activeAssignment.pendingReview, " pending"] })] }), _jsxs(CardContent, { className: "divide-y divide-[#F5E2DA] p-0", children: [assignmentSubmissions.length === 0 && (_jsx("p", { className: "p-5 text-sm text-[#B7A79D]", children: "No submissions yet for this assignment." })), assignmentSubmissions.map((s) => (_jsxs("button", { onClick: () => openSubmission(s), className: cn("flex w-full items-center justify-between gap-3 p-4 text-left hover:bg-[#FFFBF9]", activeSubmissionId === s.id && "bg-[#FFFBF9]"), children: [_jsxs("div", { className: "flex items-center gap-3 min-w-0", children: [_jsx(Avatar, { initials: s.traineeInitials }), _jsxs("div", { className: "min-w-0", children: [_jsx("p", { className: "truncate text-sm font-medium text-[#3A2A22]", children: s.traineeName }), (() => {
                                                                const t = trainees.find((tr) => tr.name === s.traineeName);
                                                                const b = t ? batchById(t.batchId) : null;
                                                                return (_jsxs("p", { className: "flex items-center gap-1.5 truncate text-xs text-[#B7A79D]", children: ["Submitted ", s.submittedAt, b && course && (_jsxs(_Fragment, { children: [_jsxs("span", { children: ["\u00B7 ", b.code] }), _jsx(Badge, { tone: b.mode === "online" ? "blue" : "amber", className: "scale-75 origin-left px-1.5 py-0", children: b.mode })] }))] }));
                                                            })()] })] }), s.status === "reviewed" ? (_jsxs(Badge, { tone: "green", children: [_jsx(CheckCircle2, { className: "h-3 w-3" }), " ", s.marks, "%"] })) : (_jsxs(Badge, { tone: "amber", children: [_jsx(Clock3, { className: "h-3 w-3" }), " pending"] }))] }, s.id)))] })] }), _jsxs(Card, { className: "lg:col-span-2", children: [_jsx(CardHeader, { children: _jsx(CardTitle, { children: "Review & Feedback" }) }), _jsx(CardContent, { children: !activeSubmission ? (_jsxs("div", { className: "flex flex-col items-center justify-center gap-2 py-12 text-center text-sm text-[#B7A79D]", children: [_jsx(FileCheck2, { className: "h-8 w-8 text-[#E9D6CC]" }), "Select a submission to enter marks and feedback."] })) : (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx(Avatar, { initials: activeSubmission.traineeInitials }), _jsxs("div", { children: [_jsx("p", { className: "text-sm font-semibold text-[#3A2A22]", children: activeSubmission.traineeName }), (() => {
                                                            const t = trainees.find((tr) => tr.name === activeSubmission.traineeName);
                                                            const b = t ? batchById(t.batchId) : null;
                                                            return (_jsxs("p", { className: "flex items-center gap-1.5 text-xs text-[#B7A79D]", children: ["Submitted ", activeSubmission.submittedAt, b && course && (_jsxs(_Fragment, { children: [_jsxs("span", { children: ["\u00B7 ", b.code] }), _jsx(Badge, { tone: b.mode === "online" ? "blue" : "amber", className: "scale-75 origin-left px-1.5 py-0", children: b.mode })] }))] }));
                                                        })()] })] }), _jsxs("div", { className: "rounded-lg border border-dashed border-[#EEAF9C] bg-[#FFFBF9] p-3 text-xs text-[#8C7A70]", children: ["\uD83D\uDCCE submission_", activeSubmission.traineeInitials.toLowerCase(), ".pdf"] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs font-medium text-[#6B5A52]", children: "Marks (%)" }), _jsx("input", { type: "number", min: 0, max: 100, value: marks, onChange: (e) => setMarks(e.target.value), className: "mt-1 h-10 w-full rounded-xl border border-[#F0DED4] bg-white px-3 text-sm text-[#3A2A22] focus:border-[#DE896A] focus:outline-none focus:ring-2 focus:ring-[#DE896A]/20", placeholder: "e.g. 88" })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs font-medium text-[#6B5A52]", children: "Feedback" }), _jsx("textarea", { value: feedback, onChange: (e) => setFeedback(e.target.value), rows: 4, className: "mt-1 w-full resize-none rounded-xl border border-[#F0DED4] bg-white px-3 py-2 text-sm text-[#3A2A22] focus:border-[#DE896A] focus:outline-none focus:ring-2 focus:ring-[#DE896A]/20", placeholder: "Something actionable beyond a raw score..." })] }), _jsx(Button, { onClick: publishResult, className: "w-full justify-center", disabled: marks === "", children: "Publish Result" })] })) })] })] }), _jsx(AddAssignmentModal, { open: modalOpen, onOpenChange: setModalOpen })] }));
}
