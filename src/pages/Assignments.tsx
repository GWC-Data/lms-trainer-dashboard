import { useEffect, useState, useCallback } from "react";
import { Plus, PencilLine, CheckCircle2, Clock3, FileCheck2, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import AddAssignmentModal from "@/components/forms/AddAssignmentModal";
import {
  getAssignmentsApi,
  getAssignmentSubmissionsApi,
  scoreAssignmentSubmissionApi,
  type AssignmentItem,
  type AssignmentSubmissionItem,
} from "@/services/api";
import { cn } from "@/lib/utils";

function getInitials(name?: string): string {
  if (!name || !name.trim()) return "TR";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return parts[0].substring(0, 2).toUpperCase();
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return dateStr;
  }
}

export default function Assignments() {
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ status: number; message: string } | null>(null);
  const [activeAssignmentId, setActiveAssignmentId] = useState<string | null>(null);

  const [submissions, setSubmissions] = useState<AssignmentSubmissionItem[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [activeSubmissionId, setActiveSubmissionId] = useState<string | null>(null);

  const [marks, setMarks] = useState("");
  const [feedback, setFeedback] = useState("");
  const [scoring, setScoring] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  // Load assignments for trainer
  const loadAssignments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAssignmentsApi();
      setAssignments(data);

      if (data.length > 0) {
        setActiveAssignmentId((current) => {
          if (current && data.some((a) => a.id === current)) {
            return current;
          }
          return data[0].id;
        });
      } else {
        setActiveAssignmentId(null);
        setSubmissions([]);
        setActiveSubmissionId(null);
      }
    } catch (err: any) {
      console.error("Failed to load assignments:", err);
      const status = err?.response?.status || 500;
      const msg = err?.response?.data?.message || err?.message || "Failed to load assignments.";
      setError({ status, message: msg });
      if (status === 403) {
        toast.error("Permission denied to view assignments.");
      } else {
        toast.error("Failed to load assignments.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAssignments();
  }, [loadAssignments]);

  // Load submissions whenever activeAssignmentId changes
  useEffect(() => {
    if (!activeAssignmentId) {
      setSubmissions([]);
      setActiveSubmissionId(null);
      return;
    }

    let cancelled = false;
    setLoadingSubmissions(true);
    setActiveSubmissionId(null);
    setMarks("");
    setFeedback("");

    getAssignmentSubmissionsApi(activeAssignmentId)
      .then((data) => {
        if (cancelled) return;
        setSubmissions(data);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Failed to load submissions:", err);
        setSubmissions([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingSubmissions(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeAssignmentId]);

  const activeAssignment = assignments.find((a) => a.id === activeAssignmentId) ?? null;
  const activeSubmission = submissions.find((s) => s.id === activeSubmissionId) ?? null;

  function openSubmission(s: AssignmentSubmissionItem) {
    setActiveSubmissionId(s.id);
    setMarks(s.obtainedMarks !== undefined && s.obtainedMarks !== null ? s.obtainedMarks.toString() : "");
    setFeedback(s.feedback ?? "");
  }

  async function publishResult() {
    if (!activeAssignmentId || !activeSubmission) return;
    const marksNum = Number(marks);
    if (isNaN(marksNum) || marksNum < 0 || marksNum > 100) {
      toast.error("Please enter a valid mark percentage between 0 and 100.");
      return;
    }

    setScoring(true);
    try {
      const res = await scoreAssignmentSubmissionApi(activeAssignmentId, activeSubmission.id, {
        obtainedMarks: marksNum,
        totalMarks: 100,
        feedback: feedback.trim(),
      });

      if (res.success) {
        toast.success("Result published successfully!");
        setSubmissions((prev) =>
          prev.map((s) =>
            s.id === activeSubmission.id
              ? {
                  ...s,
                  status: "graded",
                  obtainedMarks: marksNum,
                  obtainedPercentage: marksNum,
                  feedback: feedback.trim(),
                }
              : s
          )
        );
        setActiveSubmissionId(null);
        setMarks("");
        setFeedback("");
        // Refresh assignments to update submission/pending counts
        loadAssignments();
      } else {
        toast.error(res.message || "Failed to publish result.");
      }
    } catch (err: any) {
      console.error("Error scoring submission:", err);
      toast.error(err?.response?.data?.message || "Failed to publish result.");
    } finally {
      setScoring(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#3A2A22]">Assignments</h1>
          <p className="text-sm text-[#8C7A70]">
            Trainer reviews each submission, enters marks & feedback, then publishes the result.
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="h-4 w-4" /> Create Assignment
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-[#8C7A70]">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading assignments...
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-red-200 bg-red-50/50 p-12 text-center">
          <AlertCircle className="h-10 w-10 text-red-500" />
          <h3 className="mt-3 text-base font-semibold text-[#3A2A22]">
            {error.status === 403 ? "Permission Denied" : "Failed to Load Assignments"}
          </h3>
          <p className="mt-1 max-w-sm text-sm text-[#8C7A70]">
            {error.status === 403
              ? "You do not have permission to view assignments. Please ensure you are logged in with an authorized trainer account."
              : error.message || "An unexpected error occurred while fetching assignments."}
          </p>
          <Button variant="outline" className="mt-4" onClick={loadAssignments}>
            <RefreshCw className="mr-1.5 h-4 w-4" /> Try Again
          </Button>
        </div>
      ) : assignments.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#E3D1C8] bg-white p-12 text-center">
          <PencilLine className="h-10 w-10 text-[#B7A79D]" />
          <h3 className="mt-3 text-base font-semibold text-[#3A2A22]">No assignments created yet</h3>
          <p className="mt-1 max-w-sm text-sm text-[#8C7A70]">
            Select a batch and course to assign tasks to your trainees.
          </p>
          <Button className="mt-4" onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4" /> Create Assignment
          </Button>
        </div>
      ) : (
        <>
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
                  {(a.submissions ?? a.submissionCount ?? 0)}/{(a.totalTrainees ?? 0)} submitted · {(a.pendingReview ?? 0)} pending
                </span>
              </button>
            ))}
          </div>

          {activeAssignment && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
              <Card className="lg:col-span-3">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>{activeAssignment.title}</CardTitle>
                    <p className="mt-1 text-xs text-[#B7A79D]">
                      {activeAssignment.courseName || activeAssignment.batchName || "Assigned Course"} · Due {activeAssignment.dueDate}
                    </p>
                  </div>
                  <Badge tone={(activeAssignment.pendingReview ?? 0) > 0 ? "amber" : "green"}>
                    {activeAssignment.pendingReview ?? 0} pending
                  </Badge>
                </CardHeader>
                <CardContent className="divide-y divide-[#F5E2DA] p-0">
                  {loadingSubmissions ? (
                    <div className="flex items-center justify-center p-8 text-sm text-[#8C7A70]">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading submissions...
                    </div>
                  ) : submissions.length === 0 ? (
                    <p className="p-5 text-sm text-[#B7A79D]">No submissions yet for this assignment.</p>
                  ) : (
                    submissions.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => openSubmission(s)}
                        className={cn(
                          "flex w-full items-center justify-between gap-3 p-4 text-left hover:bg-[#FFFBF9]",
                          activeSubmissionId === s.id && "bg-[#FFFBF9]"
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar initials={getInitials(s.traineeName)} />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-[#3A2A22]">{s.traineeName || s.email || "Trainee"}</p>
                            <p className="flex items-center gap-1.5 truncate text-xs text-[#B7A79D]">
                              Submitted {formatDate(s.submittedAt)}
                              {activeAssignment.batchName && <span>· {activeAssignment.batchName}</span>}
                            </p>
                          </div>
                        </div>
                        {s.status === "graded" || s.status === "reviewed" ? (
                          <Badge tone="green">
                            <CheckCircle2 className="h-3 w-3" /> {s.obtainedMarks ?? 0}%
                          </Badge>
                        ) : (
                          <Badge tone="amber">
                            <Clock3 className="h-3 w-3" /> pending
                          </Badge>
                        )}
                      </button>
                    ))
                  )}
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
                        <Avatar initials={getInitials(activeSubmission.traineeName)} />
                        <div>
                          <p className="text-sm font-semibold text-[#3A2A22]">{activeSubmission.traineeName || activeSubmission.email || "Trainee"}</p>
                          <p className="flex items-center gap-1.5 text-xs text-[#B7A79D]">
                            Submitted {formatDate(activeSubmission.submittedAt)}
                            {activeAssignment.batchName && <span>· {activeAssignment.batchName}</span>}
                          </p>
                        </div>
                      </div>

                      {activeSubmission.courseAssignmentAnswerFile ? (
                        <a
                          href={activeSubmission.courseAssignmentAnswerFile}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block truncate rounded-lg border border-dashed border-[#EEAF9C] bg-[#FFFBF9] p-3 text-xs text-[#8C7A70] hover:underline"
                        >
                          📎 View Submitted File
                        </a>
                      ) : activeSubmission.submissionText ? (
                        <div className="rounded-lg border border-dashed border-[#EEAF9C] bg-[#FFFBF9] p-3 text-xs text-[#8C7A70]">
                          📝 {activeSubmission.submissionText}
                        </div>
                      ) : null}

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

                      <Button onClick={publishResult} className="w-full justify-center" disabled={marks === "" || scoring}>
                        {scoring ? "Publishing..." : "Publish Result"}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}

      <AddAssignmentModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSuccess={loadAssignments}
      />
    </div>
  );
}
