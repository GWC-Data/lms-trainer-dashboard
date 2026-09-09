import { useState, useEffect, useMemo, useCallback } from "react";
import * as XLSX from "xlsx";
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
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  getQuizResultsApi,
  type QuizResultsResponse,
  type TraineeQuizResultItem,
} from "@/services/api";
import type { Quiz } from "@/types";
import {
  Users,
  CheckCircle2,
  Clock,
  Award,
  AlertCircle,
  Search,
  Download,
  FileSpreadsheet,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";

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

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return "Not submitted";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "Recently";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function QuizResultsModal({ open, onOpenChange, quiz }: QuizResultsModalProps) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<QuizResultsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const loadData = useCallback(async (quizId: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getQuizResultsApi(quizId);
      setData(res);
    } catch (err: any) {
      console.error("Error loading quiz results:", err);
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to load quiz results. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open || !quiz) {
      setData(null);
      setError(null);
      setSearchQuery("");
      setStatusFilter("all");
      return;
    }

    loadData(quiz.id);
  }, [open, quiz, loadData]);

  const [isExporting, setIsExporting] = useState(false);

  const quizInfo = {
    title: cleanDisplayString(data?.quiz?.title || quiz?.title) || "Quiz",
    courseName: cleanDisplayString(data?.quiz?.courseName || quiz?.courseName) || "Course",
    batchName: cleanDisplayString(data?.quiz?.batchName || quiz?.batchName) || "Batch",
    moduleName: cleanDisplayString(data?.quiz?.moduleName || quiz?.moduleName) || "General",
    passingScorePct: data?.quiz?.passingScorePct ?? (quiz as any)?.passingScorePct ?? 70,
    totalQuestions: data?.quiz?.totalQuestions ?? quiz?.totalQuestions ?? 0,
    status: data?.quiz?.status ?? quiz?.status ?? "Published",
    fileUrl: data?.quiz?.fileUrl || quiz?.fileUrl || null,
  };

  const summary = data?.summary || {
    totalTrainees: 0,
    submitted: 0,
    pending: 0,
    averageScore: null,
  };

  const allTrainees = useMemo(() => data?.trainees || [], [data]);

  // Local filter
  const filteredTrainees = useMemo(() => {
    return allTrainees.filter((t) => {
      // 1. Text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = t.traineeName.toLowerCase().includes(q);
        const matchesEmail = t.traineeEmail.toLowerCase().includes(q);
        if (!matchesName && !matchesEmail) return false;
      }

      // 2. Status filter
      if (statusFilter === "submitted") return t.status === "Submitted";
      if (statusFilter === "pending") return t.status === "Pending";
      if (statusFilter === "passed") return t.passed === true;
      if (statusFilter === "failed") return t.passed === false;

      return true;
    });
  }, [allTrainees, searchQuery, statusFilter]);

  // Export results to Excel
  const handleExportExcel = () => {
    if (allTrainees.length === 0) {
      toast.error("No trainee results to export.");
      return;
    }

    setIsExporting(true);
    try {
      const exportRows = allTrainees.map((t) => ({
        "Trainee Name": t.traineeName,
        "Email": t.traineeEmail || "—",
        "Batch": quizInfo.batchName || "—",
        "Course": quizInfo.courseName || "—",
        "Quiz": quizInfo.title || "—",
        "Status": t.status,
        "Score": t.score !== null ? (t.rawScore !== null ? `${t.rawScore} / ${quizInfo.totalQuestions}` : t.score) : "—",
        "Percentage": t.scorePercentage !== null ? `${t.scorePercentage}%` : "—",
        "Submitted At": t.completedAt ? formatDate(t.completedAt) : "—",
        "Result": t.passed === true ? "Passed" : t.passed === false ? "Failed" : "Pending",
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportRows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Quiz Results");
      const safeTitle = (quizInfo.title || "quiz")
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
      XLSX.writeFile(workbook, `${safeTitle || "quiz"}-results.xlsx`);
      toast.success("Excel report exported successfully.");
    } catch (err) {
      console.error("Failed to export Excel:", err);
      toast.error("Failed to export Excel report.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadQuiz = () => {
    if (!quizInfo.fileUrl) {
      toast.error("Original quiz question file is not available.");
      return;
    }
    window.open(quizInfo.fileUrl, "_blank", "noopener,noreferrer");
  };

  if (!quiz) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto no-scrollbar p-6 rounded-2xl">
        <DialogHeader className="border-b border-[#F5E2DA] pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pr-6">
            <div>
              <DialogTitle className="text-xl font-bold text-[#3A2A22]">
                {quizInfo.title}
              </DialogTitle>
              <DialogDescription className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#8C7A70]">
                <span>{quizInfo.courseName}</span>
                <span>•</span>
                <span className="font-semibold text-[#DE896A]">{quizInfo.batchName}</span>
                {quizInfo.moduleName && (
                  <>
                    <span>•</span>
                    <span>{quizInfo.moduleName}</span>
                  </>
                )}
                <span>•</span>
                <Badge
                  tone="orange"
                  className="rounded-lg text-[10px] font-semibold"
                >
                  {quizInfo.status}
                </Badge>
              </DialogDescription>
            </div>

            {/* Header Action Buttons: Export Excel & Download Quiz */}
            <div className="flex items-center gap-2 shrink-0">
              {quizInfo.fileUrl ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadQuiz}
                  className="h-8 rounded-xl border-[#F0DED4] text-xs font-medium text-[#3A2A22] hover:bg-[#FBECE7] hover:text-[#DE896A]"
                >
                  <Download className="mr-1.5 h-3.5 w-3.5" />
                  Download Quiz
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  disabled
                  className="h-8 rounded-xl border-[#F0DED4] text-xs text-[#B7A79D] cursor-not-allowed opacity-60"
                  title="No original question file linked to this quiz"
                >
                  <Download className="mr-1.5 h-3.5 w-3.5" />
                  File unavailable
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={handleExportExcel}
                disabled={loading || isExporting || allTrainees.length === 0}
                className="h-8 rounded-xl border-[#F0DED4] text-xs font-medium text-[#233047] hover:bg-[#FBECE7] hover:text-[#DE896A]"
              >
                <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5 text-emerald-600" />
                {isExporting ? "Exporting..." : "Export Excel"}
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Loading State */}
        {loading && (
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-2xl" />
              ))}
            </div>
            <Skeleton className="h-48 rounded-2xl" />
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center my-4">
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <p className="text-sm font-semibold text-red-800">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadData(quiz.id)}
              className="mt-3 rounded-xl border-red-300 text-xs text-red-700 hover:bg-red-100"
            >
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Retry
            </Button>
          </div>
        )}

        {/* Loaded Content */}
        {!loading && !error && (
          <div className="space-y-6 pt-4">
            {/* 1. Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Card className="rounded-2xl border border-[#F5E2DA] bg-[#FFFBF9] shadow-xs">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-[#8C7A70]">
                      Total Trainees
                    </p>
                    <p className="text-2xl font-black text-[#3A2A22] mt-0.5">
                      {summary.totalTrainees}
                    </p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FBECE7] text-[#DE896A]">
                    <Users className="h-5 w-5" />
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border border-[#F5E2DA] bg-[#FFFBF9] shadow-xs">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-[#8C7A70]">
                      Submitted
                    </p>
                    <p className="text-2xl font-black text-emerald-600 mt-0.5">
                      {summary.submitted}
                    </p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border border-[#F5E2DA] bg-[#FFFBF9] shadow-xs">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-[#8C7A70]">
                      Pending
                    </p>
                    <p className="text-2xl font-black text-amber-600 mt-0.5">
                      {summary.pending}
                    </p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                    <Clock className="h-5 w-5" />
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border border-[#F5E2DA] bg-[#FFFBF9] shadow-xs">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-[#8C7A70]">
                      Average Score
                    </p>
                    <p className="text-2xl font-black text-[#3A2A22] mt-0.5">
                      {summary.averageScore !== null ? `${summary.averageScore}%` : "—"}
                    </p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                    <Award className="h-5 w-5" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 2. Controls: Search + Status Filter */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative flex-1 w-full sm:max-w-xs">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#C7B6AC]" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search trainees..."
                  className="h-9 pl-9 pr-3 rounded-xl border-[#F0DED4] bg-white text-xs text-[#3A2A22]"
                />
              </div>

              <div className="w-full sm:w-44 shrink-0">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-9 rounded-xl border-[#F0DED4] text-xs font-semibold text-[#233047]">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="submitted">Submitted</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="passed">Passed</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 3. Trainee Results Table */}
            <div className="rounded-2xl border border-[#F5E2DA] bg-white overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#F5E2DA] bg-[#FFFBF9] text-[11px] font-bold uppercase tracking-wider text-[#8C7A70]">
                      <th className="py-3 px-4">Trainee</th>
                      <th className="py-3 px-4">Email</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Score</th>
                      <th className="py-3 px-4">Percentage</th>
                      <th className="py-3 px-4">Submitted At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F5E2DA]">
                    {filteredTrainees.length > 0 ? (
                      filteredTrainees.map((t) => (
                        <tr key={t.traineeId} className="hover:bg-[#FFF8F5]/60 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <Avatar
                                initials={getInitials(t.traineeName)}
                                className="h-8 w-8 text-[11px] font-bold border border-[#F5E2DA]"
                              />
                              <span className="font-semibold text-[#3A2A22]">
                                {t.traineeName}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-[#8C7A70]">{t.traineeEmail || "—"}</td>
                          <td className="py-3 px-4">
                            {t.status === "Submitted" ? (
                              <Badge
                                tone={t.passed === true ? "green" : t.passed === false ? "red" : "blue"}
                              >
                                {t.passed === true ? "Passed" : t.passed === false ? "Failed" : "Submitted"}
                              </Badge>
                            ) : (
                              <Badge tone="amber">
                                Pending
                              </Badge>
                            )}
                          </td>
                          <td className="py-3 px-4 font-semibold text-[#3A2A22]">
                            {t.status === "Submitted" && t.score !== null ? (
                              t.rawScore !== null && quizInfo.totalQuestions > 0 ? (
                                <span>
                                  {t.rawScore}{" "}
                                  <span className="text-[#8C7A70] font-normal">
                                    / {quizInfo.totalQuestions}
                                  </span>
                                </span>
                              ) : (
                                `${t.score}`
                              )
                            ) : (
                              <span className="text-[#B7A79D] font-normal">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-semibold text-[#3A2A22]">
                            {t.status === "Submitted" && t.scorePercentage !== null ? (
                              <span>{t.scorePercentage}%</span>
                            ) : (
                              <span className="text-[#B7A79D] font-normal">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-[#8C7A70]">
                            {formatDate(t.completedAt)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-[#8C7A70]">
                          {allTrainees.length === 0 ? (
                            <span>No trainees enrolled in this batch.</span>
                          ) : (
                            <span>No trainees match the current search filter.</span>
                          )}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
