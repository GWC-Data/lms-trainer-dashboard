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
import { MessageSquareText, TrendingUp, Users2, CalendarX2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { RadialProgress } from "@/components/ui/ProgressBar";
import { Avatar } from "@/components/ui/Avatar";
import {
  courses,
  trainees,
  quizzes,
  submissions,
  batchesForCourse,
  traineesForBatch,
  attendanceForBatch,
  avgProgressForCourse,
} from "@/data/mockData";

const STATUS_COLORS: Record<string, string> = {
  Present: "#DE896A",
  Absent: "#E76F51",
  Late: "#F0C39B",
};

const ALL_BATCHES = "all";

export default function Reports() {
  const [courseId, setCourseId] = useState(courses[0].id);
  const [batchSelection, setBatchSelection] = useState<string>(ALL_BATCHES);
  const courseBatches = useMemo(() => batchesForCourse(courseId), [courseId]);
  const selectedBatch = batchSelection === ALL_BATCHES ? null : courseBatches.find((b) => b.id === batchSelection);

  // Switching courses resets the batch selection back to "all batches" —
  // a batch id from the old course wouldn't mean anything for the new one.
  useEffect(() => {
    setBatchSelection(ALL_BATCHES);
  }, [courseId]);

  const scopeTrainees = useMemo(
    () => (selectedBatch ? traineesForBatch(selectedBatch.id) : trainees.filter((t) => t.courseId === courseId)),
    [selectedBatch, courseId]
  );
  const courseQuizzes = useMemo(() => quizzes.filter((q) => q.courseId === courseId), [courseId]);
  const feedbackLog = useMemo(
    () => submissions.filter((s) => s.status === "reviewed" && s.feedback),
    []
  );

  const avgCompletion = Math.round(
    scopeTrainees.reduce((sum, t) => sum + t.lessonCompletion, 0) / (scopeTrainees.length || 1)
  );

  const completionRate = selectedBatch ? selectedBatch.progress : avgProgressForCourse(courseId);
  const completionLabel = selectedBatch
    ? `Batch ${selectedBatch.code}`
    : `Average across ${courseBatches.length} batch${courseBatches.length === 1 ? "" : "es"}`;

  const completionBuckets = [
    { range: "0-25%", count: scopeTrainees.filter((t) => t.lessonCompletion < 25).length },
    { range: "25-50%", count: scopeTrainees.filter((t) => t.lessonCompletion >= 25 && t.lessonCompletion < 50).length },
    { range: "50-75%", count: scopeTrainees.filter((t) => t.lessonCompletion >= 50 && t.lessonCompletion < 75).length },
    { range: "75-100%", count: scopeTrainees.filter((t) => t.lessonCompletion >= 75).length },
  ];

  // Attendance only exists for offline batches — never fabricate a number
  // for a self-paced online batch that never took attendance. Mode lives on
  // the batch, so a mixed course only counts its offline batches here.
  const offlineBatchesInScope = selectedBatch
    ? selectedBatch.mode === "offline"
      ? [selectedBatch]
      : []
    : courseBatches.filter((b) => b.mode === "offline");
  const attendanceRows = offlineBatchesInScope.flatMap((b) => attendanceForBatch(b.id));
  const attendanceData = [
    { name: "Present", value: attendanceRows.filter((r) => r.status === "P").length },
    { name: "Absent", value: attendanceRows.filter((r) => r.status === "A").length },
    { name: "Late", value: attendanceRows.filter((r) => r.status === "L").length },
  ];
  const hasAttendance = attendanceRows.length > 0;

  const quizScoreData = courseQuizzes.map((q) => ({ name: q.title.split(" ").slice(0, 2).join(" "), score: q.avgScore }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#3A2A22]">Course Reports</h1>
          <p className="text-sm text-[#8C7A70]">Trainee progress, attendance, scores, completion, and feedback history — batch by batch.</p>
        </div>
        <div className="flex flex-nowrap items-center gap-2">
          <select
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
            className="h-10 shrink-0 rounded-xl border border-[#F0DED4] bg-white px-3 text-sm text-[#3A2A22] focus:border-[#DE896A] focus:outline-none focus:ring-2 focus:ring-[#DE896A]/20"
          >
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} — {c.level}
              </option>
            ))}
          </select>
          <select
            value={batchSelection}
            onChange={(e) => setBatchSelection(e.target.value)}
            className="h-10 shrink-0 rounded-xl border border-[#F0DED4] bg-white px-3 text-sm text-[#3A2A22] focus:border-[#DE896A] focus:outline-none focus:ring-2 focus:ring-[#DE896A]/20"
          >
            <option value={ALL_BATCHES}>All batches</option>
            {courseBatches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.code} — {b.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Trainee Progress */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Trainee Progress</CardTitle>
              <p className="mt-1 text-xs text-[#B7A79D]">
                Lesson completion distribution across {scopeTrainees.length} trainees
                {selectedBatch ? ` in ${selectedBatch.code}` : ""}
              </p>
            </div>
            <Badge tone="orange">
              <TrendingUp className="h-3 w-3" /> {avgCompletion}% avg
            </Badge>
          </CardHeader>
          <CardContent className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={completionBuckets} barSize={40}>
                <CartesianGrid vertical={false} stroke="#F5E2DA" />
                <XAxis dataKey="range" tick={{ fontSize: 12, fill: "#8C7A70" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "#8C7A70" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip cursor={{ fill: "#FBECE7" }} contentStyle={{ borderRadius: 12, borderColor: "#F0DED4" }} />
                <Bar dataKey="count" fill="#DE896A" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Completion Rate */}
        <Card>
          <CardHeader>
            <CardTitle>Completion Rate</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center gap-3 pb-6">
            <div className="rounded-full bg-gradient-to-br from-[#E38F6C] to-[#C26D4D] p-3">
              <RadialProgress value={completionRate} size={120} strokeWidth={10} label={`${completionRate}%`} sublabel="complete" />
            </div>
            <p className="text-xs text-[#8C7A70]">{completionLabel}</p>
          </CardContent>
        </Card>

        {/* Attendance Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Attendance Summary</CardTitle>
            {selectedBatch && <p className="mt-1 text-xs text-[#B7A79D]">Batch {selectedBatch.code}</p>}
          </CardHeader>
          <CardContent>
            {hasAttendance ? (
              <div className="flex items-center gap-4">
                <div className="h-40 w-40 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={attendanceData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={70} paddingAngle={3}>
                        {attendanceData.map((entry) => (
                          <Cell key={entry.name} fill={STATUS_COLORS[entry.name]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: 12, borderColor: "#F0DED4" }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2">
                  {attendanceData.map((d) => (
                    <div key={d.name} className="flex items-center gap-2 text-sm">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[d.name] }} />
                      <span className="text-[#6B5A52]">{d.name}</span>
                      <span className="font-semibold text-[#3A2A22]">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 py-8 text-center text-sm text-[#B7A79D]">
                <CalendarX2 className="h-7 w-7 text-[#E9D6CC]" />
                Attendance isn't tracked for self-paced online batches.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Assessment Scores */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Assessment Scores</CardTitle>
            <p className="mt-1 text-xs text-[#B7A79D]">Average quiz score per assessment (shared across every batch)</p>
          </CardHeader>
          <CardContent className="h-56">
            {quizScoreData.length === 0 ? (
              <p className="flex h-full items-center justify-center text-sm text-[#B7A79D]">No quizzes for this course yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={quizScoreData} layout="vertical" barSize={20}>
                  <CartesianGrid horizontal={false} stroke="#F5E2DA" />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12, fill: "#8C7A70" }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: "#8C7A70" }} axisLine={false} tickLine={false} width={110} />
                  <Tooltip cursor={{ fill: "#FBECE7" }} contentStyle={{ borderRadius: 12, borderColor: "#F0DED4" }} />
                  <Bar dataKey="score" fill="#DE896A" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Feedback Log */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <MessageSquareText className="h-4 w-4 text-[#DE896A]" />
            <CardTitle>Feedback Log</CardTitle>
          </CardHeader>
          <CardContent className="max-h-56 space-y-3 overflow-y-auto">
            {feedbackLog.length === 0 ? (
              <p className="flex items-center gap-2 text-sm text-[#B7A79D]">
                <Users2 className="h-4 w-4" /> No feedback published yet.
              </p>
            ) : (
              feedbackLog.map((s) => (
                <div key={s.id} className="flex gap-2.5 rounded-xl bg-[#FFFBF9] p-3">
                  <Avatar initials={s.traineeInitials} className="h-8 w-8" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[#3A2A22]">
                      {s.traineeName} <span className="font-normal text-[#B7A79D]">· {s.marks}%</span>
                    </p>
                    <p className="mt-0.5 text-xs text-[#8C7A70]">{s.feedback}</p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
