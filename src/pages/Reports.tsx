import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TrendingUp, Users2, CalendarX2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { RadialProgress } from "@/components/ui/ProgressBar";
import {
  getTrainerCoursesApi,
  getTrainerBatchesApi,
  getTraineesApi,
  type TrainerCourseItem,
  type BackendBatchItem,
  type TraineeListItem,
} from "@/services/api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import PageLoader from "@/components/ui/PageLoader";

function cleanDisplayString(str?: string | null): string {
  if (!str) return "";
  return str
    .replace(/\s*-\s*cid-[a-zA-Z0-9_-]+/gi, "")
    .replace(/\s*-\s*[0-9a-fA-F-]{36}/gi, "")
    .replace(/^cid-[a-zA-Z0-9_-]+\s*/gi, "")
    .trim();
}

const STATUS_COLORS: Record<string, string> = {
  Present: "#DE896A",
  Absent: "#E76F51",
  Late: "#F0C39B",
};

const ALL_BATCHES = "all";

export default function Reports() {
  const [courses, setCourses] = useState<TrainerCourseItem[]>([]);
  const [batches, setBatches] = useState<BackendBatchItem[]>([]);
  const [loadingSelectors, setLoadingSelectors] = useState(true);

  const [selectedBatchId, setSelectedBatchId] = useState<string>("");

  const [trainees, setTrainees] = useState<TraineeListItem[]>([]);
  const [loadingTrainees, setLoadingTrainees] = useState(false);

  // 1. Fetch real batches and real courses from BigQuery
  useEffect(() => {
    let mounted = true;
    async function loadData() {
      try {
        setLoadingSelectors(true);
        const [cRes, bData] = await Promise.all([
          getTrainerCoursesApi(),
          getTrainerBatchesApi(),
        ]);
        if (!mounted) return;
        const cList = cRes.courses || [];
        const bList = bData || [];
        setCourses(cList);
        setBatches(bList);
        if (bList.length > 0) {
          setSelectedBatchId(bList[0].id);
        }
      } catch (err) {
        console.error("Failed to load report selectors:", err);
      } finally {
        if (mounted) setLoadingSelectors(false);
      }
    }
    loadData();
    return () => {
      mounted = false;
    };
  }, []);

  const selectedBatch = useMemo(
    () => batches.find((b) => b.id === selectedBatchId),
    [batches, selectedBatchId]
  );

  const targetCourseId = selectedBatch?.courseId || selectedBatch?.course?.id || "";

  const selectedCourse = useMemo(
    () => courses.find((c) => c.id === targetCourseId),
    [courses, targetCourseId]
  );

  const courseDisplayName =
    selectedCourse?.courseName ||
    selectedCourse?.name ||
    selectedBatch?.course?.courseName ||
    (targetCourseId ? "Associated Course" : "No course found for this batch");

  // 2. Fetch real trainees in scope of selected Batch + resolved Course
  useEffect(() => {
    let mounted = true;
    async function loadTrainees() {
      if (!selectedBatchId) {
        setTrainees([]);
        return;
      }
      try {
        setLoadingTrainees(true);
        const res = await getTraineesApi({
          batchId: selectedBatchId,
          courseId: targetCourseId || undefined,
        });
        if (!mounted) return;
        setTrainees(res.data?.trainees || []);
      } catch (err) {
        console.error("Failed to load trainees for report:", err);
        if (mounted) setTrainees([]);
      } finally {
        if (mounted) setLoadingTrainees(false);
      }
    }
    loadTrainees();
    return () => {
      mounted = false;
    };
  }, [selectedBatchId, targetCourseId]);

  const avgCompletion = useMemo(() => {
    if (trainees.length === 0) return 0;
    const sum = trainees.reduce((acc, t) => acc + (t.progressPct || 0), 0);
    return Math.round(sum / trainees.length);
  }, [trainees]);

  const completionBuckets = useMemo(() => [
    { range: "0-25%", count: trainees.filter((t) => t.progressPct < 25).length },
    { range: "25-50%", count: trainees.filter((t) => t.progressPct >= 25 && t.progressPct < 50).length },
    { range: "50-75%", count: trainees.filter((t) => t.progressPct >= 50 && t.progressPct < 75).length },
    { range: "75-100%", count: trainees.filter((t) => t.progressPct >= 75).length },
  ], [trainees]);

  // Attendance metrics calculated from real trainee attendance sessions
  const attendanceData = useMemo(() => {
    let presentCount = 0;
    let totalCount = 0;
    for (const t of trainees) {
      if (t.attendanceSessions) {
        presentCount += Number(t.attendanceSessions.present || 0);
        totalCount += Number(t.attendanceSessions.total || 0);
      }
    }
    const absentCount = Math.max(0, totalCount - presentCount);
    return [
      { name: "Present", value: presentCount },
      { name: "Absent", value: absentCount },
      { name: "Late", value: 0 },
    ];
  }, [trainees]);

  const hasAttendance = attendanceData.some((d) => d.value > 0);

  if (loadingSelectors && batches.length === 0) {
    return <PageLoader text="Loading..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#3A2A22]">Course Reports</h1>
          <p className="text-sm text-[#8C7A70]">
            Trainee progress, attendance, scores, and completion history — batch by batch.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {/* Batch Selector (Starting point) */}
          <div className="w-[200px]">
            <Select
              value={selectedBatchId}
              onValueChange={(val) => setSelectedBatchId(val)}
              disabled={loadingSelectors || batches.length === 0}
            >
              <SelectTrigger className="h-10 rounded-xl border-[#F0DED4] bg-white text-xs font-medium text-[#3A2A22]">
                <SelectValue placeholder={loadingSelectors ? "Loading batches..." : "Select Batch"} />
              </SelectTrigger>
              <SelectContent>
                {batches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {cleanDisplayString(b.batchName)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Course (Locked derived from Batch) */}
          <div className="rounded-xl border border-[#F0DED4] bg-[#FFFBF9] px-3.5 py-2 min-w-[180px]">
            <p className="text-[10px] font-medium text-[#8C7A70]">Allocated Course</p>
            <p className="text-xs font-bold text-[#233047] truncate">
              {targetCourseId ? `${cleanDisplayString(courseDisplayName)} 🔒` : "No course assigned"}
            </p>
          </div>
        </div>
      </div>

      {loadingSelectors && batches.length === 0 ? (
        <PageLoader text="Loading..." />
      ) : loadingTrainees ? (
        <Card className="border-[#F5E2DA]">
          <CardContent className="py-12">
            <PageLoader text="Loading..." className="min-h-[240px] py-6" />
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Top 3 Metric Cards */}
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#8C7A70]">Avg. Completion</span>
                  <TrendingUp className="h-4 w-4 text-[#DE896A]" />
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-[#3A2A22]">{avgCompletion}%</span>
                </div>
                <p className="mt-2 text-xs text-[#B7A79D]">
                  {selectedBatch ? selectedBatch.batchName : "In selected batch"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#8C7A70]">Enrolled Trainees</span>
                  <Users2 className="h-4 w-4 text-[#C26D4D]" />
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-[#3A2A22]">{trainees.length}</span>
                </div>
                <p className="mt-2 text-xs text-[#B7A79D]">
                  {selectedBatch ? `In ${selectedBatch.batchName}` : "In selected batch"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#8C7A70]">Course Domains</span>
                  <span className="text-xs font-semibold text-[#8C7A70]">
                    {selectedCourse?.domains || 0} Modules
                  </span>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-[#3A2A22]">{selectedCourse?.hours || 0}h</span>
                </div>
                <p className="mt-2 text-xs text-[#B7A79D]">
                  Total estimated duration
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {/* Completion distribution */}
            <Card>
              <CardHeader className="border-b border-[#F5E2DA] p-5">
                <CardTitle className="text-base font-semibold text-[#3A2A22]">
                  Completion Distribution
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={completionBuckets}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F5E2DA" />
                      <XAxis dataKey="range" stroke="#8C7A70" fontSize={12} />
                      <YAxis stroke="#8C7A70" fontSize={12} allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#DE896A" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Attendance breakdown */}
            <Card>
              <CardHeader className="border-b border-[#F5E2DA] p-5">
                <CardTitle className="text-base font-semibold text-[#3A2A22]">
                  Attendance Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5">
                {hasAttendance ? (
                  <div className="flex h-64 flex-col items-center justify-center">
                    <ResponsiveContainer width="100%" height="80%">
                      <PieChart>
                        <Pie
                          data={attendanceData.filter((d) => d.value > 0)}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={3}
                        >
                          {attendanceData.map((entry) => (
                            <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || "#DE896A"} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex gap-4 text-xs">
                      {attendanceData.map((item) => (
                        <div key={item.name} className="flex items-center gap-1.5">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: STATUS_COLORS[item.name] }}
                          />
                          <span className="text-[#8C7A70]">{item.name}: {item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex h-64 flex-col items-center justify-center text-[#B7A79D]">
                    <CalendarX2 className="mb-2 h-8 w-8 text-[#C7B6AC]" />
                    <p className="text-sm">No attendance records recorded yet for this selection.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
