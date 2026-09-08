import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/Dialog";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  getQuizResultsApi,
  getTraineesApi,
  type AssessmentResultItem,
  type TraineeListItem,
} from "@/services/api";
import type { Quiz } from "@/types";
import { Users, CheckCircle2, Clock, Award, AlertCircle } from "lucide-react";

interface QuizResultsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quiz: Quiz | null;
}

function cleanDisplayString(str?: string | null): string {
  if (!str) return "";
  return str
    .replace(/\s*-\s*cid-[a-zA-Z0-9_-]+/gi, "")
    .replace(/\s*-\s*[0-9a-fA-F-]{36}/gi, "")
    .replace(/^cid-[a-zA-Z0-9_-]+\s*/gi, "")
    .replace(/\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b/gi, "")
    .trim();
}

function getInitials(name?: string): string {
  if (!name || !name.trim()) return "TR";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return parts[0].substring(0, 2).toUpperCase();
}

interface MergedTraineeResult {
  id: string;
  name: string;
  email: string;
  submissionDate: string;
  score: number | null;
  status: "Passed" | "Submitted" | "Pending";
}

export default function QuizResultsModal({ open, onOpenChange, quiz }: QuizResultsModalProps) {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<AssessmentResultItem[]>([]);
  const [enrolledTrainees, setEnrolledTrainees] = useState<TraineeListItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !quiz) {
      setResults([]);
      setEnrolledTrainees([]);
      setError(null);
      return;
    }

    const activeQuiz = quiz;
    let mounted = true;
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const [resultsData, traineesRes] = await Promise.all([
          getQuizResultsApi(activeQuiz.id).catch((err) => {
            console.warn("Failed to fetch assessment results:", err);
            return [] as AssessmentResultItem[];
          }),
          activeQuiz.batchId
            ? getTraineesApi({ batchId: activeQuiz.batchId }).catch((err) => {
                console.warn("Failed to fetch batch trainees:", err);
                return null;
              })
            : Promise.resolve(null),
        ]);

        if (!mounted) return;

        setResults(resultsData || []);
        const rawTrainees = traineesRes?.data?.trainees || [];
        setEnrolledTrainees(rawTrainees);
      } catch (err: any) {
        console.error("Error loading quiz results modal:", err);
        if (mounted) {
          setError("Failed to load detailed submission results. Please try again.");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadData();
    return () => {
      mounted = false;
    };
  }, [open, quiz]);

  if (!quiz) return null;

  const courseName = cleanDisplayString(quiz.courseName) || "Course";
  const batchName = cleanDisplayString(quiz.batchName);
  const moduleName = cleanDisplayString(quiz.moduleName);

  // Compute merged roster
  const resultMapByTraineeId = new Map<string, AssessmentResultItem>();
  const resultMapByEmail = new Map<string, AssessmentResultItem>();

  results.forEach((r) => {
    if (r.traineeId) resultMapByTraineeId.set(r.traineeId, r);
    if (r.traineeEmail) resultMapByEmail.set(r.traineeEmail.toLowerCase().trim(), r);
  });

  const mergedRoster: MergedTraineeResult[] = [];
  const processedTraineeIds = new Set<string>();

  // 1. Enrolled Trainees from Batch
  enrolledTrainees.forEach((t) => {
    processedTraineeIds.add(t.id);
    const sub = resultMapByTraineeId.get(t.id) || resultMapByEmail.get((t.email || "").toLowerCase().trim());
    if (sub) {
      const scoreVal = typeof sub.score === "number" ? sub.score : Number(sub.score) || 0;
      const isPass = scoreVal >= 70;
      mergedRoster.push({
        id: t.id,
        name: cleanDisplayString(t.name),
        email: t.email || "—",
        submissionDate: sub.completedAt
          ? new Date(sub.completedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
          : "Recently",
        score: scoreVal,
        status: isPass ? "Passed" : "Submitted",
      });
    } else {
      mergedRoster.push({
        id: t.id,
        name: cleanDisplayString(t.name),
        email: t.email || "—",
        submissionDate: "—",
        score: null,
        status: "Pending",
      });
    }
  });

  // 2. Results that were not matched in enrolled list (if any submitted before unenrollment)
  results.forEach((r) => {
    if (r.traineeId && !processedTraineeIds.has(r.traineeId)) {
      const scoreVal = typeof r.score === "number" ? r.score : Number(r.score) || 0;
      const isPass = scoreVal >= 70;
      mergedRoster.push({
        id: r.traineeId,
        name: cleanDisplayString(r.traineeName || `${r.traineeFirstName || ''} ${r.traineeLastName || ''}`.trim() || "Trainee"),
        email: r.traineeEmail || "—",
        submissionDate: r.completedAt
          ? new Date(r.completedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
          : "Recently",
        score: scoreVal,
        status: isPass ? "Passed" : "Submitted",
      });
    }
  });

  const totalTrainees = Math.max(mergedRoster.length, quiz.totalTrainees || 0);
  const submittedCount = results.length > 0 ? results.length : quiz.submissions || 0;
  const pendingCount = Math.max(0, totalTrainees - submittedCount);
  const avgScore =
    results.length > 0
      ? Math.round(results.reduce((acc, r) => acc + (Number(r.score) || 0), 0) / results.length)
      : quiz.avgScore || 0;
  const submissionRate = totalTrainees > 0 ? Math.round((submittedCount / totalTrainees) * 100) : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto no-scrollbar p-6 rounded-2xl">
        <DialogHeader className="space-y-1">
          <div className="flex items-center justify-between gap-3">
            <DialogTitle className="text-xl font-bold text-[#3A2A22]">{quiz.title}</DialogTitle>
            <Badge tone={quiz.status === "published" ? "green" : "neutral"} className="text-xs">
              {quiz.status === "published" ? "Published" : "Draft"}
            </Badge>
          </div>
          <DialogDescription className="text-xs text-[#8C7A70]">
            {courseName}
            {batchName ? ` · Batch: ${batchName}` : ""}
            {moduleName ? ` · Module: ${moduleName}` : ""}
            {quiz.questions ? ` · ${quiz.questions} questions` : ""}
          </DialogDescription>
        </DialogHeader>

        {/* 4 Summary Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4">
          <Card className="rounded-xl border border-[#F0DED4] bg-[#FFFBF9]">
            <CardContent className="p-3 text-center">
              <div className="flex items-center justify-center gap-1 text-[11px] font-medium text-[#8C7A70]">
                <Users className="h-3.5 w-3.5 text-[#DE896A]" /> Total Trainees
              </div>
              <p className="mt-1 text-lg font-bold text-[#3A2A22]">{totalTrainees}</p>
            </CardContent>
          </Card>

          <Card className="rounded-xl border border-emerald-100 bg-emerald-50/50">
            <CardContent className="p-3 text-center">
              <div className="flex items-center justify-center gap-1 text-[11px] font-medium text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Submitted
              </div>
              <p className="mt-1 text-lg font-bold text-emerald-800">{submittedCount}</p>
            </CardContent>
          </Card>

          <Card className="rounded-xl border border-amber-100 bg-amber-50/50">
            <CardContent className="p-3 text-center">
              <div className="flex items-center justify-center gap-1 text-[11px] font-medium text-amber-700">
                <Clock className="h-3.5 w-3.5 text-amber-600" /> Pending
              </div>
              <p className="mt-1 text-lg font-bold text-amber-800">{pendingCount}</p>
            </CardContent>
          </Card>

          <Card className="rounded-xl border border-[#F0DED4] bg-[#FFFBF9]">
            <CardContent className="p-3 text-center">
              <div className="flex items-center justify-center gap-1 text-[11px] font-medium text-[#8C7A70]">
                <Award className="h-3.5 w-3.5 text-[#DE896A]" /> Average Score
              </div>
              <p className="mt-1 text-lg font-bold text-[#3A2A22]">
                {submittedCount > 0 ? `${avgScore}%` : "—"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Overall Completion Progress */}
        <div className="rounded-xl border border-[#F0DED4] bg-white p-3.5 mb-4">
          <div className="flex items-center justify-between text-xs font-semibold text-[#3A2A22] mb-1.5">
            <span>Overall Submission Progress</span>
            <span>{submissionRate}% ({submittedCount}/{totalTrainees})</span>
          </div>
          <ProgressBar value={submissionRate} className="h-2" />
        </div>

        {/* Trainee Results List */}
        <div>
          <h4 className="text-sm font-bold text-[#3A2A22] mb-3">Trainee Results Roster</h4>

          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : mergedRoster.length === 0 ? (
            <div className="rounded-xl border border-[#F0DED4] bg-[#FFFBF9] p-6 text-center text-xs text-[#8C7A70]">
              No trainees enrolled in this batch or submitted yet.
            </div>
          ) : (
            <div className="rounded-xl border border-[#F0DED4] overflow-hidden bg-white shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FAF4F0] border-b border-[#F0DED4] text-[11px] font-bold text-[#8C7A70] uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-2.5">Trainee</th>
                      <th className="px-4 py-2.5">Email</th>
                      <th className="px-4 py-2.5">Submission Date</th>
                      <th className="px-4 py-2.5">Score</th>
                      <th className="px-4 py-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0DED4]">
                    {mergedRoster.map((t) => (
                      <tr key={t.id} className="hover:bg-[#FFFBF9] transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <Avatar initials={getInitials(t.name)} className="h-8 w-8 text-[11px]" />
                            <span className="font-semibold text-[#3A2A22]">{t.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-[#8C7A70]">{t.email}</td>
                        <td className="px-4 py-3 text-[#8C7A70]">{t.submissionDate}</td>
                        <td className="px-4 py-3 font-semibold text-[#3A2A22]">
                          {t.score !== null ? `${t.score}%` : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            tone={
                              t.status === "Passed"
                                ? "green"
                                : t.status === "Submitted"
                                ? "blue"
                                : "amber"
                            }
                            className="text-[10px]"
                          >
                            {t.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
