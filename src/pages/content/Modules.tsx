import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, Boxes, ChevronRight, X, AlertCircle, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { getModulesApi, BackendModuleItem } from "@/services/api";
import AddModuleModal from "@/components/forms/AddModuleModal";

function formatUpdatedDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "recently";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);

  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours < 1) return "just now";
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;

  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function Modules() {
  const [modules, setModules] = useState<BackendModuleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [modalOpen, setModalOpen] = useState(false);

  const filterCourseId = searchParams.get("courseId") ?? undefined;

  const fetchModules = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const modulesRes = await getModulesApi(filterCourseId);

      if (modulesRes.success && Array.isArray(modulesRes.modules)) {
        setModules(modulesRes.modules);
      } else {
        setModules([]);
      }
    } catch (err: any) {
      console.error("Failed to load modules:", err);
      setError(err?.response?.data?.message || "Failed to load modules. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [filterCourseId]);

  useEffect(() => {
    fetchModules();
  }, [fetchModules]);

  const filterCourse = modules.find((m) => m.courseId === filterCourseId);

  function clearFilter() {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("courseId");
      return next;
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#3A2A22]">Modules</h1>
          <p className="text-sm text-[#8C7A70]">A course contains modules, each module contains lessons.</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="h-4 w-4" /> New Module
        </Button>
      </div>

      {filterCourseId && (
        <button
          onClick={clearFilter}
          className="inline-flex items-center gap-1.5 rounded-full border border-[#EEAF9C] bg-[#FBECE7] px-3 py-1.5 text-xs font-medium text-[#8A442E] hover:bg-[#F5D1C4] transition-colors"
        >
          Filtered by: {filterCourse?.courseName || "Selected Course"} <X className="h-3.5 w-3.5" />
        </button>
      )}

      <Card>
        <CardContent className="divide-y divide-[#F5E2DA] p-0">
          {loading ? (
            <div className="divide-y divide-[#F5E2DA]">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between gap-4 p-4 animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-[#FAF7F5]" />
                    <div className="space-y-2">
                      <div className="h-4 w-44 rounded bg-[#FAF7F5]" />
                      <div className="h-3 w-28 rounded bg-[#FAF7F5]" />
                    </div>
                  </div>
                  <div className="h-5 w-16 rounded bg-[#FAF7F5]" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-600">
                <AlertCircle className="h-5 w-5" />
              </div>
              <p className="mt-2 text-sm font-medium text-red-800">{error}</p>
              <div className="mt-4 flex justify-center">
                <button
                  onClick={fetchModules}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#DE896A] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#c97455] transition-colors"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Retry
                </button>
              </div>
            </div>
          ) : modules.length === 0 ? (
            <p className="p-5 text-sm text-[#B7A79D]">No modules yet — add one to get started.</p>
          ) : (
            modules.map((m) => {
              const courseDisplayName = m.courseName || "Course";
              const deliveryMode = m.deliveryMode || "online";

              return (
                <div key={m.id} className="flex items-center justify-between gap-4 p-4 hover:bg-[#FFFBF9] transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FBECE7] text-[#DE896A]">
                      <Boxes className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-[#3A2A22]">{m.title || m.moduleName}</p>
                      <p className="truncate text-xs text-[#B7A79D]">
                        {courseDisplayName} · {m.lessonsCount} lessons · updated {formatUpdatedDate(m.updatedAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <Badge tone="neutral">{deliveryMode}</Badge>
                    <ChevronRight className="h-4 w-4 text-[#C7B6AC]" />
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <AddModuleModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSuccess={fetchModules}
      />
    </div>
  );
}
