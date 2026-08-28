import { useEffect, useMemo, useState } from "react";
import { Plus, PencilLine, CheckCircle2, Clock3, FileCheck2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { submissions as initialSubmissions, courseById, trainees, batchById } from "@/data/mockData";
import { useContent } from "@/context/ContentContext";
import AddAssignmentModal from "@/components/forms/AddAssignmentModal";
import type { Submission } from "@/types";
import { cn } from "@/lib/utils";

export default function Assignments() {
  const { assignments } = useContent();
  const [submissions, setSubmissions] = useState<Submission[]>(initialSubmissions);
  const [activeAssignmentId, setActiveAssignmentId] = useState(assignments[0].id);
  const [activeSubmissionId, setActiveSubmissionId] = useState<string | null>(null);
  const [marks, setMarks] = useState("");
  const [feedback, setFeedback] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (!assignments.some((a) => a.id === activeAssignmentId) && assignments[0]) {
      setActiveAssignmentId(assignments[0].id);
    }
  }, [assignments, activeAssignmentId]);

  const activeAssignment = assignments.find((a) => a.id === activeAssignmentId)!;
  const course = courseById(activeAssignment.courseId);

  const assignmentSubmissions = useMemo(
    () => submissions.filter((s) => s.assignmentId === activeAssignmentId),
    [submissions, activeAssignmentId]
  );

  const activeSubmission = submissions.find((s) => s.id === activeSubmissionId) ?? null;

  function openSubmission(s: Submission) {
    setActiveSubmissionId(s.id);
    setMarks(s.marks?.toString() ?? "");
    setFeedback(s.feedback ?? "");
  }

  function publishResult() {
    if (!activeSubmission) return;
    setSubmissions((prev) =>
      prev.map((s) =>
        s.id === activeSubmission.id
          ? { ...s, status: "reviewed", marks: Number(marks) || 0, feedback }
          : s
      )
    );
    setActiveSubmissionId(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#3A2A22]">Assignments</h1>
          <p className="text-sm text-[#8C7A70]">Trainer reviews each submission, enters marks & feedback, then publishes the result.</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="h-4 w-4" /> Create Assignment
        </Button>
      </div>

      {/* Assignment selector */}
      <div className="flex gap-3 overflow-x-auto pb-1">
        {assignments.map((a) => (
          <button
            key={a.id}
            onClick={() => {
              setActiveAssignmentId(a.id);
              setActiveSubmissionId(null);
            }}
            className={cn(
              "flex shrink-0 flex-col rounded-xl border px-4 py-3 text-left transition-colors",
              a.id === activeAssignmentId
                ? "border-[#DE896A] bg-[#FBECE7]"
                : "border-[#F5E2DA] bg-white hover:bg-[#FFFBF9]"
            )}
          >
            <span className="flex items-center gap-1.5 text-sm font-medium text-[#3A2A22]">
              <PencilLine className="h-3.5 w-3.5 text-[#DE896A]" /> {a.title}
            </span>
            <span className="mt-1 text-xs text-[#B7A79D]">
              {a.submissions}/{a.totalTrainees} submitted · {a.pendingReview} pending
            </span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>{activeAssignment.title}</CardTitle>
              <p className="mt-1 text-xs text-[#B7A79D]">
                {course?.name} · Due {activeAssignment.dueDate}
              </p>
            </div>
            <Badge tone={activeAssignment.pendingReview > 0 ? "amber" : "green"}>
              {activeAssignment.pendingReview} pending
            </Badge>
          </CardHeader>
          <CardContent className="divide-y divide-[#F5E2DA] p-0">
            {assignmentSubmissions.length === 0 && (
              <p className="p-5 text-sm text-[#B7A79D]">No submissions yet for this assignment.</p>
            )}
            {assignmentSubmissions.map((s) => (
              <button
                key={s.id}
                onClick={() => openSubmission(s)}
                className={cn(
                  "flex w-full items-center justify-between gap-3 p-4 text-left hover:bg-[#FFFBF9]",
                  activeSubmissionId === s.id && "bg-[#FFFBF9]"
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar initials={s.traineeInitials} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[#3A2A22]">{s.traineeName}</p>
                    {(() => {
                      const t = trainees.find((tr) => tr.name === s.traineeName);
                      const b = t ? batchById(t.batchId) : null;
                      return (
                        <p className="flex items-center gap-1.5 truncate text-xs text-[#B7A79D]">
                          Submitted {s.submittedAt}
                          {b && course && (
                            <>
                              <span>· {b.code}</span>
                              <Badge tone={course.mode === "online" ? "blue" : "amber"} className="scale-75 origin-left px-1.5 py-0">
                                {course.mode}
                              </Badge>
                            </>
                          )}
                        </p>
                      );
                    })()}
                  </div>
                </div>
                {s.status === "reviewed" ? (
                  <Badge tone="green">
                    <CheckCircle2 className="h-3 w-3" /> {s.marks}%
                  </Badge>
                ) : (
                  <Badge tone="amber">
                    <Clock3 className="h-3 w-3" /> pending
                  </Badge>
                )}
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Review & Feedback</CardTitle>
          </CardHeader>
          <CardContent>
            {!activeSubmission ? (
              <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-sm text-[#B7A79D]">
                <FileCheck2 className="h-8 w-8 text-[#E9D6CC]" />
                Select a submission to enter marks and feedback.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Avatar initials={activeSubmission.traineeInitials} />
                  <div>
                    <p className="text-sm font-semibold text-[#3A2A22]">{activeSubmission.traineeName}</p>
                    {(() => {
                      const t = trainees.find((tr) => tr.name === activeSubmission.traineeName);
                      const b = t ? batchById(t.batchId) : null;
                      return (
                        <p className="flex items-center gap-1.5 text-xs text-[#B7A79D]">
                          Submitted {activeSubmission.submittedAt}
                          {b && course && (
                            <>
                              <span>· {b.code}</span>
                              <Badge tone={course.mode === "online" ? "blue" : "amber"} className="scale-75 origin-left px-1.5 py-0">
                                {course.mode}
                              </Badge>
                            </>
                          )}
                        </p>
                      );
                    })()}
                  </div>
                </div>

                <div className="rounded-lg border border-dashed border-[#EEAF9C] bg-[#FFFBF9] p-3 text-xs text-[#8C7A70]">
                  📎 submission_{activeSubmission.traineeInitials.toLowerCase()}.pdf
                </div>

                <div>
                  <label className="text-xs font-medium text-[#6B5A52]">Marks (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={marks}
                    onChange={(e) => setMarks(e.target.value)}
                    className="mt-1 h-10 w-full rounded-xl border border-[#F0DED4] bg-white px-3 text-sm text-[#3A2A22] focus:border-[#DE896A] focus:outline-none focus:ring-2 focus:ring-[#DE896A]/20"
                    placeholder="e.g. 88"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-[#6B5A52]">Feedback</label>
                  <textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    rows={4}
                    className="mt-1 w-full resize-none rounded-xl border border-[#F0DED4] bg-white px-3 py-2 text-sm text-[#3A2A22] focus:border-[#DE896A] focus:outline-none focus:ring-2 focus:ring-[#DE896A]/20"
                    placeholder="Something actionable beyond a raw score..."
                  />
                </div>

                <Button onClick={publishResult} className="w-full justify-center" disabled={marks === ""}>
                  Publish Result
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AddAssignmentModal open={modalOpen} onOpenChange={setModalOpen} />
    </div>
  );
}
