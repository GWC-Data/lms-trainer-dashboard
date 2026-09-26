import React, { useEffect, useState, useMemo } from "react";
import moment from "moment";
import { toast } from "sonner";
import { useNavigate, Link } from "react-router-dom";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  CheckCircle2,
  Clock,
  Video,
  FileText,
  X,
  ExternalLink,
  Users,
  Home,
  ChevronRight as ChevronRightIcon,
  AlertCircle,
  Trash2,
  Pencil,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { fetchBatchIdByTraineeIdApi } from "@/helpers/api/batchTraineeApi";
import { getTrainerFiltersApi, getTrainerScheduleApi } from "@/services/api";
import NoBatchEnrollment from "../SideBar/noBatchEnrollment";
import PageLoader from "@/components/ui/PageLoader";
import {
  fetchBatchEventsForTraineeApi,
  createBatchEventApi,
  updateBatchEventApi,
  deleteBatchEventApi,
  BatchEvent
} from "@/services/batchEventApi";

interface BatchFilter {
  id: string;
  name: string;
}

interface UnifiedEventItem {
  id: string;
  category: "batch-event" | "class-schedule" | "assignment";
  title: string;
  type: string;
  batchName: string;
  batchId: string;
  description: string;
  date: Date | string;
  startTime?: string;
  endTime?: string;
  trainers?: string;
  meetingLink?: string;
  classRecordedLink?: string;
  attendance?: boolean;
  assignmentFile?: string;
  moduleName?: string;
  totalMarks?: string;
}

const Calendar: React.FC = () => {
  const navigate = useNavigate();

  // Navigation & Date State
  const [currentMonth, setCurrentMonth] = useState<moment.Moment>(moment());
  const [selectedDate, setSelectedDate] = useState<moment.Moment>(moment());

  // Backend Data State
  const [scheduleItems, setScheduleItems] = useState<UnifiedEventItem[]>([]);
  const [batchFilters, setBatchFilters] = useState<BatchFilter[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<string | null>(null);
  const [batchName, setBatchName] = useState<string>("");
  const [batchId, setBatchId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Modals & Actions
  const [selectedDetailEvent, setSelectedDetailEvent] = useState<UnifiedEventItem | null>(null);
  const [showAddEventModal, setShowAddEventModal] = useState<boolean>(false);
  const [isSavingEvent, setIsSavingEvent] = useState<boolean>(false);
  const [eventToDelete, setEventToDelete] = useState<UnifiedEventItem | null>(null);
  const [isDeletingEvent, setIsDeletingEvent] = useState<boolean>(false);

  // Edit Event State
  const [eventToEdit, setEventToEdit] = useState<UnifiedEventItem | null>(null);
  const [isUpdatingEvent, setIsUpdatingEvent] = useState<boolean>(false);
  const [editBatchId, setEditBatchId] = useState<string>("");
  const [editTitle, setEditTitle] = useState<string>("");
  const [editType, setEditType] = useState<string>("session");
  const [editEventDate, setEditEventDate] = useState<string>(moment().format("YYYY-MM-DD"));
  const [editDescription, setEditDescription] = useState<string>("");

  // Add Event Form State
  const [formBatchId, setFormBatchId] = useState<string>("");
  const [formTitle, setFormTitle] = useState<string>("");
  const [formType, setFormType] = useState<string>("session");
  const [formEventDate, setFormEventDate] = useState<string>(moment().format("YYYY-MM-DD"));
  const [formDescription, setFormDescription] = useState<string>("");

  // Token & User Auth Helpers
  const getToken = () =>
    localStorage.getItem("teqcertify_token") || localStorage.getItem("authToken");

  const getCurrentUser = () => {
    try {
      const stored = localStorage.getItem("teqcertify_user");
      if (stored) return JSON.parse(stored);
    } catch {}
    return null;
  };

  const currentUser = getCurrentUser();
  const roleStr = (
    typeof currentUser?.role === "string"
      ? currentUser.role
      : typeof currentUser?.roleName === "string"
      ? currentUser.roleName
      : ""
  ).toUpperCase();
  const isAdmin = roleStr === "ADMIN";
  const isTrainer = roleStr === "TRAINER";
  const isTrainee = !isAdmin && !isTrainer;

  const getUserId = (): string | null => {
    const token = getToken();
    if (token) {
      const directUserId = localStorage.getItem("userId");
      if (directUserId) return directUserId;
      if (currentUser?.id) return currentUser.id;
    }
    return null;
  };

  // Stable date string extractor (avoids timezone shifting for date-only values)
  const toDateString = (val: any): string => {
    if (!val) return "";
    if (typeof val === "string") {
      const match = val.match(/^\d{4}-\d{2}-\d{2}/);
      if (match) return match[0];
    }
    if (typeof val === "object" && val !== null && "value" in val) {
      const match = String(val.value).match(/^\d{4}-\d{2}-\d{2}/);
      if (match) return match[0];
    }
    if (val instanceof Date) {
      const y = val.getFullYear();
      const m = String(val.getMonth() + 1).padStart(2, "0");
      const d = String(val.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }
    if (moment.isMoment(val)) {
      return val.format("YYYY-MM-DD");
    }
    return moment(val).format("YYYY-MM-DD");
  };

  const isSameDaySafe = (d1: any, d2: any): boolean => {
    const s1 = toDateString(d1);
    const s2 = toDateString(d2);
    return Boolean(s1 && s2 && s1 === s2);
  };

  const isSameBatchSafe = (b1: string | null | undefined, b2: string | null | undefined): boolean => {
    if (!b1 || !b2) return true;
    if (String(b1).trim().toLowerCase() === "all" || String(b2).trim().toLowerCase() === "all") return true;
    return String(b1).trim().toLowerCase() === String(b2).trim().toLowerCase();
  };

  // Load unified schedule from backend
  const loadSchedule = async (targetBatch?: string | null, targetMonth?: moment.Moment) => {
    try {
      const m = targetMonth || currentMonth;
      const startDate = m.clone().startOf("month").format("YYYY-MM-DD");
      const endDate = m.clone().endOf("month").format("YYYY-MM-DD");
      const activeBatch = targetBatch !== undefined ? targetBatch : selectedBatch;
      const bId = activeBatch && activeBatch !== "all" ? activeBatch : undefined;

      if (isTrainer || isAdmin) {
        const res = await getTrainerScheduleApi({
          batchId: bId,
          startDate,
          endDate,
        });
        const rows = res?.data || [];
        const items: UnifiedEventItem[] = rows.map((r: any) => {
          const batchObj = batchFilters.find((b) => isSameBatchSafe(b.id, r.batchId));
          return {
            id: r.id,
            category: r.type === "class" ? "class-schedule" : "batch-event",
            title: r.title,
            type: r.type || "session",
            batchName: r.batchName || batchObj?.name || batchName || "Batch",
            batchId: r.batchId,
            description: r.description || "",
            date: r.date,
            startTime: r.startTime,
            endTime: r.endTime,
            meetingLink: r.meetingLink,
          };
        });
        setScheduleItems(items);
      } else {
        const data = await fetchBatchEventsForTraineeApi(bId);
        const items: UnifiedEventItem[] = (data || []).map((be: any) => ({
          id: be.id || `be-${be.title}-${be.eventDate}`,
          category: "batch-event",
          title: be.title,
          type: be.type || "event",
          batchName: be.batchName || batchName || "Active Batch",
          batchId: be.batchId,
          description: be.description || "",
          date: be.eventDate,
        }));
        setScheduleItems(items);
      }
    } catch (error) {
      console.error("Failed to load schedule:", error);
    }
  };

  // Initial load: Fetch batches once and initial schedule
  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      setIsLoading(true);
      try {
        if (isTrainer || isAdmin) {
          const { batches: trainerBatches } = await getTrainerFiltersApi();
          const filters: BatchFilter[] = (trainerBatches || [])
            .map((b: any) => ({
              id: b.id || b.batchId,
              name: b.name || b.batchName,
            }))
            .filter((f: any) => Boolean(f.id && f.name));

          if (!isMounted) return;

          setBatchFilters(filters);
          const initialBatch = filters.length > 0 ? filters[0].id : "all";
          setSelectedBatch(initialBatch);
          setBatchId(initialBatch);
          setBatchName(filters[0]?.name || "All Batches");

          const startDate = currentMonth.clone().startOf("month").format("YYYY-MM-DD");
          const endDate = currentMonth.clone().endOf("month").format("YYYY-MM-DD");
          const res = await getTrainerScheduleApi({
            batchId: initialBatch !== "all" ? initialBatch : undefined,
            startDate,
            endDate,
          });

          if (!isMounted) return;

          const rows = res?.data || [];
          const items: UnifiedEventItem[] = rows.map((r: any) => {
            const batchObj = filters.find((b) => isSameBatchSafe(b.id, r.batchId));
            return {
              id: r.id,
              category: r.type === "class" ? "class-schedule" : "batch-event",
              title: r.title,
              type: r.type || "session",
              batchName: r.batchName || batchObj?.name || "Batch",
              batchId: r.batchId,
              description: r.description || "",
              date: r.date,
              startTime: r.startTime,
              endTime: r.endTime,
              meetingLink: r.meetingLink,
            };
          });
          setScheduleItems(items);
        } else {
          const token = getToken();
          const userId = getUserId();
          if (!token || !userId) {
            setIsLoading(false);
            return;
          }
          const batchIds = await fetchBatchIdByTraineeIdApi(String(userId));
          if (!isMounted) return;
          if (Array.isArray(batchIds) && batchIds.length > 0) {
            const firstId = batchIds[0];
            setSelectedBatch(firstId);
            setBatchId(firstId);
            const data = await fetchBatchEventsForTraineeApi(firstId);
            if (!isMounted) return;
            const items: UnifiedEventItem[] = (data || []).map((be: any) => ({
              id: be.id,
              category: "batch-event",
              title: be.title,
              type: be.type || "event",
              batchName: "Active Batch",
              batchId: be.batchId,
              description: be.description || "",
              date: be.eventDate,
            }));
            setScheduleItems(items);
          }
        }
      } catch (err) {
        console.error("Failed to initialize calendar:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    init();
    return () => {
      isMounted = false;
    };
  }, []);

  // Keep form date in sync when user picks a date
  useEffect(() => {
    setFormEventDate(selectedDate.format("YYYY-MM-DD"));
  }, [selectedDate]);

  // Keep form batch in sync with the actively selected batch
  useEffect(() => {
    if (selectedBatch) {
      setFormBatchId(selectedBatch);
    } else if (batchFilters.length > 0) {
      setFormBatchId(batchFilters[0].id);
    }
  }, [selectedBatch, batchFilters]);

  // Month navigation
  const handlePrevMonth = () => {
    const prev = currentMonth.clone().subtract(1, "month");
    setCurrentMonth(prev);
    loadSchedule(selectedBatch, prev);
  };

  const handleNextMonth = () => {
    const next = currentMonth.clone().add(1, "month");
    setCurrentMonth(next);
    loadSchedule(selectedBatch, next);
  };

  // Build grid days for the active month view
  const { startDayOfWeek, daysInMonth } = useMemo(() => {
    const startOfMonth = currentMonth.clone().startOf("month");
    const dayOfWeek = startOfMonth.day(); // 0 is Sunday
    const totalDays = currentMonth.daysInMonth();
    const days: moment.Moment[] = [];

    for (let d = 1; d <= totalDays; d++) {
      days.push(currentMonth.clone().date(d));
    }

    return {
      startDayOfWeek: dayOfWeek,
      daysInMonth: days,
    };
  }, [currentMonth]);

  // Check if a specific date contains ANY real event
  const hasEventsOnDate = (day: moment.Moment): boolean => {
    const activeBatchId = selectedBatch || batchId;
    return scheduleItems.some((item) => {
      const matchesDate = isSameDaySafe(item.date, day);
      const matchesBatch = isSameBatchSafe(item.batchId, activeBatchId);
      return matchesDate && matchesBatch;
    });
  };

  // Get all unified events for the currently selected date
  const selectedDayItems = useMemo((): UnifiedEventItem[] => {
    const activeBatchId = selectedBatch || batchId;
    return scheduleItems.filter((item) => {
      const matchesDate = isSameDaySafe(item.date, selectedDate);
      const matchesBatch = isSameBatchSafe(item.batchId, activeBatchId);
      return matchesDate && matchesBatch;
    });
  }, [scheduleItems, selectedDate, selectedBatch, batchId]);

  // Handle Event Click -> Open Detail Modal
  const handleEventClick = (item: UnifiedEventItem) => {
    setSelectedDetailEvent(item);
  };

  // Handle Create Event (Admin/Trainer)
  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formBatchId) {
      toast.error("Please select a batch.");
      return;
    }
    if (!formTitle.trim()) {
      toast.error("Please enter an event title.");
      return;
    }
    if (!formEventDate) {
      toast.error("Please select an event date.");
      return;
    }

    try {
      setIsSavingEvent(true);
      const res = await createBatchEventApi({
        batchId: formBatchId,
        title: formTitle.trim(),
        eventDate: formEventDate,
        type: formType as any,
        description: formDescription.trim() || undefined,
      });

      if (res?.success !== false) {
        toast.success("Event created successfully!");
        setShowAddEventModal(false);
        setFormTitle("");
        setFormDescription("");
        setFormType("session");

        // Immediately switch calendar to the created event's batch
        const targetBatch = formBatchId || "all";
        setSelectedBatch(targetBatch);
        setBatchId(targetBatch);
        if (targetBatch === "all") {
          setBatchName("All Batches");
        } else {
          const matched = batchFilters.find((b) => isSameBatchSafe(b.id, targetBatch));
          if (matched) {
            setBatchName(matched.name);
          }
        }

        // Immediately refresh real schedule from BigQuery for this batch
        await loadSchedule(targetBatch, moment(formEventDate));

        // Switch calendar selected date to the event date to see it right away
        setSelectedDate(moment(formEventDate));
        setCurrentMonth(moment(formEventDate));
      } else {
        toast.error(res?.message || "Failed to create batch event.");
      }
    } catch (err: any) {
      console.error("Error creating event:", err);
      const msg = err.response?.data?.message || "Failed to create event. Please verify permissions.";
      toast.error(msg);
    } finally {
      setIsSavingEvent(false);
    }
  };

  // Open Edit Event Modal
  const handleOpenEditModal = (item: UnifiedEventItem) => {
    setEventToEdit(item);
    setEditBatchId(item.batchId || selectedBatch || (batchFilters[0]?.id ?? ""));
    setEditTitle(item.title || "");
    const rawType = (item.type || "event").toLowerCase();
    setEditType(
      ["session", "holiday", "exam", "postpond", "announcement", "event"].includes(rawType)
        ? rawType
        : "event"
    );
    const dateStr = toDateString(item.date);
    setEditEventDate(dateStr || moment().format("YYYY-MM-DD"));
    setEditDescription(item.description || "");
  };

  // Handle Update Event (Admin/Trainer)
  const handleUpdateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventToEdit || !eventToEdit.id) return;

    if (!editBatchId) {
      toast.error("Please select a batch.");
      return;
    }
    if (!editTitle.trim()) {
      toast.error("Please enter an event title.");
      return;
    }
    if (!editEventDate) {
      toast.error("Please select an event date.");
      return;
    }

    try {
      setIsUpdatingEvent(true);
      const res = await updateBatchEventApi(eventToEdit.id, {
        batchId: editBatchId,
        title: editTitle.trim(),
        eventDate: editEventDate,
        type: editType as any,
        description: editDescription.trim() || undefined,
      });

      if (res?.success !== false) {
        toast.success("Event updated successfully!");
        setEventToEdit(null);
        setSelectedDetailEvent(null);

        // Switch to the updated event's batch if needed
        const targetBatch = editBatchId || "all";
        setSelectedBatch(targetBatch);
        setBatchId(targetBatch);
        if (targetBatch === "all") {
          setBatchName("All Batches");
        } else {
          const matched = batchFilters.find((b) => isSameBatchSafe(b.id, targetBatch));
          if (matched) {
            setBatchName(matched.name);
          }
        }

        // Refresh schedule from BigQuery
        await loadSchedule(targetBatch, moment(editEventDate));

        // Switch calendar view to the updated date
        setSelectedDate(moment(editEventDate));
        setCurrentMonth(moment(editEventDate));
      } else {
        toast.error(res?.message || "Failed to update batch event.");
      }
    } catch (err: any) {
      console.error("Error updating event:", err);
      const msg = err.response?.data?.message || "Failed to update event. Please verify permissions.";
      toast.error(msg);
    } finally {
      setIsUpdatingEvent(false);
    }
  };

  // Handle Delete Event (Admin & Authorized Trainer)
  const handleConfirmDelete = async () => {
    if (!eventToDelete || !eventToDelete.id) return;

    try {
      setIsDeletingEvent(true);
      const res = await deleteBatchEventApi(eventToDelete.id);

      if (res?.success !== false) {
        toast.success("Event deleted successfully!");
        setEventToDelete(null);
        setSelectedDetailEvent(null);

        // Immediately refresh real schedule from BigQuery
        await loadSchedule(selectedBatch, currentMonth);
      } else {
        toast.error(res?.message || "Failed to delete event.");
      }
    } catch (err: any) {
      console.error("Error deleting event:", err);
      const msg = err.response?.data?.message || "Failed to delete event. Please check authorization.";
      toast.error(msg);
    } finally {
      setIsDeletingEvent(false);
    }
  };

  // Helper for event badge styling
  const getBadgeStyle = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes("holiday")) {
      return "bg-amber-100 text-amber-800 border-amber-200";
    }
    if (t.includes("session") || t.includes("class")) {
      return "bg-blue-100 text-blue-800 border-blue-200";
    }
    if (t.includes("assignment")) {
      return "bg-purple-100 text-purple-800 border-purple-200";
    }
    if (t.includes("exam") || t.includes("assessment")) {
      return "bg-rose-100 text-rose-800 border-rose-200";
    }
    if (t.includes("postpond") || t.includes("postponed")) {
      return "bg-amber-100 text-amber-800 border-amber-200";
    }
    return "bg-orange-100 text-[#DE6841] border-orange-200";
  };

  if (isLoading) {
    return <PageLoader />;
  }

  if (!batchId && batchFilters.length === 0) {
    return <NoBatchEnrollment />;
  }

  return (
    <div className="min-h-screen bg-[#FDFBF9] px-4 py-6 sm:px-8 sm:py-8">
      <div className="max-w-7xl mx-auto">
        {/* Top Breadcrumb */}
        <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500 mb-4">
          <Link
            to="/dashboard"
            className="flex items-center gap-1.5 hover:text-gray-800 transition-colors"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </Link>
          <ChevronRightIcon className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-gray-800 font-medium">Calendar</span>
        </div>

        {/* Schedule Gradient Header Banner */}
        <div className="bg-gradient-to-r from-[#D75C35] via-[#DF6942] to-[#E37550] rounded-2xl p-6 sm:p-8 text-white shadow-sm mb-6">
          <span className="text-xs font-bold tracking-widest uppercase text-white/80 block mb-1.5">
            SCHEDULE
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2 tracking-tight">
            Calendar & Events
          </h1>
          <p className="text-sm text-white/90 max-w-2xl leading-relaxed">
            Manage your training schedule. Create and track live sessions, assignment deadlines, and important events for your batches.
          </p>
        </div>

        {/* Batch Filter (Display real human-readable batch name, allows switching) */}
        {batchFilters.length > 0 && (
          <div className="flex items-center justify-between bg-white rounded-xl p-3 border border-[#F0EBE6] mb-6 shadow-xs">
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <Users className="w-4 h-4 text-[#DE6841]" />
              <span className="font-semibold text-gray-900">Batch:</span>
            </div>
            <div className="w-[260px] sm:w-[320px]">
              <Select
                value={selectedBatch || undefined}
                onValueChange={(val) => {
                  setSelectedBatch(val);
                  setBatchId(val);
                  setFormBatchId(val);
                  if (val === "all") {
                    setBatchName("All Batches");
                  } else {
                    const matched = batchFilters.find((b) => isSameBatchSafe(b.id, val));
                    if (matched) {
                      setBatchName(matched.name);
                    }
                  }
                  loadSchedule(val, currentMonth);
                }}
              >
                <SelectTrigger className="h-10 rounded-xl border-[#F0DED4] bg-[#FFFBF9] text-xs sm:text-sm font-medium text-[#233047] shadow-xs hover:border-[#DE896A]/40 focus:ring-[#DE896A]/20">
                  <SelectValue placeholder="Select Batch" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  <SelectItem
                    value="all"
                    className="cursor-pointer text-xs sm:text-sm py-2 font-semibold text-[#DE6841]"
                  >
                    All Batches
                  </SelectItem>
                  {batchFilters.map((b) => (
                    <SelectItem
                      key={b.id}
                      value={b.id}
                      className="cursor-pointer text-xs sm:text-sm py-2"
                    >
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Monthly Calendar (Select Date) */}
          <div className="lg:col-span-5 bg-[#FAF7F5] rounded-2xl p-6 border border-[#F0EBE6] shadow-xs">
            {/* Header: Icon + Select Date */}
            <div className="flex items-center gap-2 text-gray-800 text-sm font-semibold mb-6">
              <CalendarIcon className="w-4 h-4 text-[#DE6841]" />
              <span>Select Date</span>
            </div>

            {/* Month Navigation Row */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                {currentMonth.format("MMMM YYYY")}
              </h2>
              <div className="flex items-center gap-1">
                <button
                  onClick={handlePrevMonth}
                  className="p-1.5 hover:bg-white rounded-lg transition-colors text-gray-600 hover:text-gray-900 focus:outline-none cursor-pointer"
                  title="Previous Month"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={handleNextMonth}
                  className="p-1.5 hover:bg-white rounded-lg transition-colors text-gray-600 hover:text-gray-900 focus:outline-none cursor-pointer"
                  title="Next Month"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Weekdays Row */}
            <div className="grid grid-cols-7 text-center mb-3">
              {["SU", "MO", "TU", "WE", "TH", "FR", "SA"].map((day) => (
                <div key={day} className="text-xs font-bold text-gray-800 tracking-wider">
                  {day}
                </div>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-y-2 text-center">
              {/* Offset cells for days before the 1st */}
              {Array.from({ length: startDayOfWeek }).map((_, idx) => (
                <div key={`offset-${idx}`} className="h-10" />
              ))}

              {/* Days of the active month */}
              {daysInMonth.map((dayMoment) => {
                const isSelected = dayMoment.isSame(selectedDate, "day");
                const hasEvents = hasEventsOnDate(dayMoment);

                return (
                  <button
                    key={dayMoment.format("YYYY-MM-DD")}
                    onClick={() => setSelectedDate(dayMoment)}
                    className="relative flex flex-col items-center justify-center h-10 group focus:outline-none cursor-pointer"
                  >
                    <span
                      className={`w-9 h-9 flex items-center justify-center rounded-full text-sm font-medium transition-all ${
                        isSelected
                          ? "bg-white text-gray-900 font-bold border border-gray-200/80 shadow-xs"
                          : "text-gray-700 hover:bg-white/60"
                      }`}
                    >
                      {dayMoment.format("D")}
                    </span>

                    {/* Event Indicator Bar (matches screenshot under active dates) */}
                    {hasEvents && (
                      <span className="w-4 h-0.5 bg-[#DE6841] rounded-full mt-0.5 mx-auto block" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Events on Selected Date */}
          <div className="lg:col-span-7 bg-[#FAF7F5] rounded-2xl p-6 sm:p-8 border border-[#F0EBE6] min-h-[460px] flex flex-col shadow-xs">
            {/* Header: Events on [Date] + Add Event Action */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-2 border-b border-gray-200/40">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                Events on {selectedDate.format("MMMM Do, YYYY")}
              </h2>

              {(isAdmin || isTrainer) && (
                <button
                  onClick={() => setShowAddEventModal(true)}
                  className="inline-flex items-center gap-1.5 bg-[#DE6841] hover:bg-[#C85732] text-white text-sm font-medium px-4 py-2 rounded-xl transition-all shadow-xs cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Event</span>
                </button>
              )}
            </div>

            {/* Event List or Empty State */}
            {selectedDayItems.length === 0 ? (
              // Empty State matching reference screenshot
              <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
                <div className="w-14 h-14 rounded-2xl bg-white border border-gray-200/60 flex items-center justify-center shadow-xs mb-4 text-gray-400">
                  <CheckCircle2 className="w-7 h-7 stroke-[1.75]" />
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-1">
                  No events scheduled
                </h3>
                <p className="text-sm text-gray-500 max-w-sm leading-relaxed">
                  There are no sessions or deadlines set by trainers for this date. Enjoy your free time or continue learning!
                </p>
              </div>
            ) : (
              // Real Event Cards List
              <div className="space-y-3 overflow-y-auto max-h-[560px] pr-1">
                {selectedDayItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleEventClick(item)}
                    className="bg-white rounded-xl p-4 sm:p-5 border border-gray-200/60 shadow-xs hover:shadow-md transition-all cursor-pointer group relative"
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <h4 className="font-semibold text-gray-900 text-base group-hover:text-[#DE6841] transition-colors">
                          {item.title}
                        </h4>
                        <span className="inline-block text-xs font-medium text-gray-500 mt-0.5">
                          Batch: {item.batchName}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs px-2.5 py-1 rounded-full font-medium border capitalize ${getBadgeStyle(
                            item.type
                          )}`}
                        >
                          {item.type}
                        </span>

                        {/* Edit & Delete Event Icons (Admin / Authorized Trainer only) */}
                        {(isAdmin || isTrainer) && item.category === "batch-event" && (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenEditModal(item);
                              }}
                              className="p-1.5 text-gray-400 hover:text-[#DE6841] hover:bg-[#FDF3EF] rounded-lg transition-colors cursor-pointer"
                              title="Edit Event"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEventToDelete(item);
                              }}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              title="Delete Event"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {item.description && (
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 pt-2 border-t border-gray-100">
                      {/* Actual Event Date */}
                      <div className="flex items-center gap-1.5 font-medium text-gray-700">
                        <CalendarIcon className="w-3.5 h-3.5 text-[#DE6841]" />
                        <span>{moment(toDateString(item.date)).format("MMMM Do, YYYY")}</span>
                      </div>

                      {item.startTime && item.endTime && (
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-[#DE6841]" />
                          <span>
                            {item.startTime} - {item.endTime}
                          </span>
                        </div>
                      )}

                      {item.trainers && (
                        <div className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-gray-400" />
                          <span>{item.trainers}</span>
                        </div>
                      )}

                      {item.attendance !== undefined && (
                        <span
                          className={`px-2 py-0.5 rounded-md font-medium text-xs ${
                            item.attendance
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-rose-50 text-rose-700"
                          }`}
                        >
                          {item.attendance ? "Present" : "Absent"}
                        </span>
                      )}

                      {item.meetingLink && (
                        <a
                          href={item.meetingLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="ml-auto inline-flex items-center gap-1 text-[#DE6841] hover:underline font-medium"
                        >
                          <Video className="w-3.5 h-3.5" />
                          <span>Join</span>
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Event Details Modal */}
      {selectedDetailEvent && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between gap-3 mb-4 pb-3 border-b border-gray-100">
              <div>
                <span
                  className={`inline-block text-xs px-2.5 py-0.5 rounded-full font-medium border capitalize mb-2 ${getBadgeStyle(
                    selectedDetailEvent.type
                  )}`}
                >
                  {selectedDetailEvent.type}
                </span>
                <h3 className="text-xl font-bold text-gray-900">
                  {selectedDetailEvent.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedDetailEvent(null)}
                className="p-1 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-sm text-gray-700">
              <div className="bg-gray-50 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 font-medium">Batch</span>
                  <span className="font-semibold text-gray-900">
                    {selectedDetailEvent.batchName}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 font-medium">Date</span>
                  <span className="font-semibold text-gray-900">
                    {moment(toDateString(selectedDetailEvent.date)).format("MMMM Do, YYYY")}
                  </span>
                </div>
                {selectedDetailEvent.startTime && selectedDetailEvent.endTime && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 font-medium">Time</span>
                    <span className="font-semibold text-gray-900">
                      {selectedDetailEvent.startTime} - {selectedDetailEvent.endTime}
                    </span>
                  </div>
                )}
                {selectedDetailEvent.trainers && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 font-medium">Instructor</span>
                    <span className="font-semibold text-gray-900">
                      {selectedDetailEvent.trainers}
                    </span>
                  </div>
                )}
                {selectedDetailEvent.attendance !== undefined && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 font-medium">Attendance</span>
                    <span
                      className={`font-semibold px-2 py-0.5 rounded text-xs ${
                        selectedDetailEvent.attendance
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-rose-100 text-rose-800"
                      }`}
                    >
                      {selectedDetailEvent.attendance ? "Present" : "Absent"}
                    </span>
                  </div>
                )}
              </div>

              {selectedDetailEvent.description && (
                <div>
                  <h5 className="font-semibold text-gray-800 mb-1">Description</h5>
                  <p className="text-gray-600 leading-relaxed bg-gray-50 p-3 rounded-xl whitespace-pre-wrap">
                    {selectedDetailEvent.description}
                  </p>
                </div>
              )}

              {/* Action Buttons (Meeting, Recording, Assignment) */}
              <div className="space-y-2 pt-2">
                {selectedDetailEvent.meetingLink && (
                  <a
                    href={selectedDetailEvent.meetingLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 bg-[#DE6841] hover:bg-[#C85732] text-white py-2.5 rounded-xl font-medium transition-all shadow-xs"
                  >
                    <Video className="w-4 h-4" />
                    <span>Join Live Meeting</span>
                  </a>
                )}

                {selectedDetailEvent.classRecordedLink && (
                  <a
                    href={selectedDetailEvent.classRecordedLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl font-medium transition-all shadow-xs"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>View Class Recording</span>
                  </a>
                )}

                {selectedDetailEvent.assignmentFile && (
                  <a
                    href={selectedDetailEvent.assignmentFile}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white py-2.5 rounded-xl font-medium transition-all shadow-xs"
                  >
                    <FileText className="w-4 h-4" />
                    <span>Download Assignment Resource</span>
                  </a>
                )}
              </div>
            </div>

            {/* Modal Footer with Edit and Delete Action for authorized managers */}
            <div className="mt-6 pt-3 border-t border-gray-100 flex items-center justify-between">
              {(isAdmin || isTrainer) && selectedDetailEvent.category === "batch-event" ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const evt = selectedDetailEvent;
                      setSelectedDetailEvent(null);
                      handleOpenEditModal(evt);
                    }}
                    className="px-4 py-2 bg-[#FDF3EF] hover:bg-[#FBE6DF] text-[#DE6841] rounded-xl font-medium text-sm transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Pencil className="w-4 h-4" />
                    <span>Edit Event</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const evt = selectedDetailEvent;
                      setSelectedDetailEvent(null);
                      setEventToDelete(evt);
                    }}
                    className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-medium text-sm transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete Event</span>
                  </button>
                </div>
              ) : (
                <div />
              )}
              <button
                onClick={() => setSelectedDetailEvent(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium text-sm transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {eventToDelete && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-gray-100 animate-in fade-in zoom-in-95 duration-150 text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">
              Delete Event?
            </h3>
            <p className="text-sm text-gray-500 mb-4 leading-relaxed">
              Are you sure you want to delete <span className="font-semibold text-gray-800">"{eventToDelete.title}"</span>? This will permanently remove the event from BigQuery.
            </p>

            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                disabled={isDeletingEvent}
                onClick={() => setEventToDelete(null)}
                className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium text-sm transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingEvent}
                onClick={handleConfirmDelete}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium text-sm transition-all shadow-xs disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isDeletingEvent ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Delete</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Event Modal for Admin / Trainer */}
      {showAddEventModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Add Batch Event</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Schedule an event or announcement for an authorized batch.
                </p>
              </div>
              <button
                onClick={() => setShowAddEventModal(false)}
                className="p-1 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="space-y-4">
              {/* Batch Selector (shadcn Select dropdown) */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Batch <span className="text-red-500">*</span>
                </label>
                <Select
                  value={formBatchId || undefined}
                  onValueChange={(val) => setFormBatchId(val)}
                >
                  <SelectTrigger className="h-10 rounded-xl border-gray-200 bg-gray-50 text-xs sm:text-sm text-gray-900 focus:ring-[#DE6841]/20">
                    <SelectValue placeholder="Select Batch" />
                  </SelectTrigger>
                  <SelectContent className="max-h-56">
                    <SelectItem
                      value="all"
                      className="cursor-pointer text-xs sm:text-sm py-2 font-semibold text-[#DE6841]"
                    >
                      All Batches
                    </SelectItem>
                    {batchFilters.map((b) => (
                      <SelectItem
                        key={b.id}
                        value={b.id}
                        className="cursor-pointer text-xs sm:text-sm py-2"
                      >
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Event Title */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Event Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g., Fun Friday or AI Class"
                  className="w-full text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#DE6841]"
                  required
                />
              </div>

              {/* Event Type & Date Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Event Type <span className="text-red-500">*</span>
                  </label>
                  <Select
                    value={formType}
                    onValueChange={(val) => setFormType(val)}
                  >
                    <SelectTrigger className="h-10 rounded-xl border-gray-200 bg-gray-50 text-xs sm:text-sm text-gray-900 focus:ring-[#DE6841]/20">
                      <SelectValue placeholder="Select Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="session" className="cursor-pointer text-xs sm:text-sm py-2">
                        Class Session
                      </SelectItem>
                      <SelectItem value="holiday" className="cursor-pointer text-xs sm:text-sm py-2">
                        Holiday
                      </SelectItem>
                      <SelectItem value="exam" className="cursor-pointer text-xs sm:text-sm py-2">
                        Assessment / Exam
                      </SelectItem>
                      <SelectItem value="postpond" className="cursor-pointer text-xs sm:text-sm py-2">
                        Postponed Session
                      </SelectItem>
                      <SelectItem value="announcement" className="cursor-pointer text-xs sm:text-sm py-2">
                        Announcement
                      </SelectItem>
                      <SelectItem value="event" className="cursor-pointer text-xs sm:text-sm py-2">
                        General Event
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Event Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formEventDate}
                    onChange={(e) => setFormEventDate(e.target.value)}
                    className="w-full text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#DE6841]"
                    required
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Description
                </label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={3}
                  placeholder="Add notes, schedule details, or instructions..."
                  className="w-full text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#DE6841]"
                />
              </div>

              {/* Form Actions */}
              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddEventModal(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium text-sm transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEvent}
                  className="px-4 py-2 bg-[#DE6841] hover:bg-[#C85732] text-white rounded-xl font-medium text-sm transition-all shadow-xs disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {isSavingEvent ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Event</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Edit Event Modal for Admin / Trainer */}
      {eventToEdit && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Update Batch Event</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Update event details, schedule date, or announcement.
                </p>
              </div>
              <button
                onClick={() => setEventToEdit(null)}
                className="p-1 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateEvent} className="space-y-4">
              {/* Batch Selector (shadcn Select dropdown) */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Batch <span className="text-red-500">*</span>
                </label>
                <Select
                  value={editBatchId || undefined}
                  onValueChange={(val) => setEditBatchId(val)}
                >
                  <SelectTrigger className="h-10 rounded-xl border-gray-200 bg-gray-50 text-xs sm:text-sm text-gray-900 focus:ring-[#DE6841]/20">
                    <SelectValue placeholder="Select Batch" />
                  </SelectTrigger>
                  <SelectContent className="max-h-56">
                    <SelectItem
                      value="all"
                      className="cursor-pointer text-xs sm:text-sm py-2 font-semibold text-[#DE6841]"
                    >
                      All Batches
                    </SelectItem>
                    {batchFilters.map((b) => (
                      <SelectItem
                        key={b.id}
                        value={b.id}
                        className="cursor-pointer text-xs sm:text-sm py-2"
                      >
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Event Title */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Event Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="e.g., Fun Friday or AI Class"
                  className="w-full text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#DE6841]"
                  required
                />
              </div>

              {/* Event Type & Date Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Event Type <span className="text-red-500">*</span>
                  </label>
                  <Select
                    value={editType}
                    onValueChange={(val) => setEditType(val)}
                  >
                    <SelectTrigger className="h-10 rounded-xl border-gray-200 bg-gray-50 text-xs sm:text-sm text-gray-900 focus:ring-[#DE6841]/20">
                      <SelectValue placeholder="Select Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="session" className="cursor-pointer text-xs sm:text-sm py-2">
                        Class Session
                      </SelectItem>
                      <SelectItem value="holiday" className="cursor-pointer text-xs sm:text-sm py-2">
                        Holiday
                      </SelectItem>
                      <SelectItem value="exam" className="cursor-pointer text-xs sm:text-sm py-2">
                        Assessment / Exam
                      </SelectItem>
                      <SelectItem value="postpond" className="cursor-pointer text-xs sm:text-sm py-2">
                        Postponed Session
                      </SelectItem>
                      <SelectItem value="announcement" className="cursor-pointer text-xs sm:text-sm py-2">
                        Announcement
                      </SelectItem>
                      <SelectItem value="event" className="cursor-pointer text-xs sm:text-sm py-2">
                        General Event
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Event Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={editEventDate}
                    onChange={(e) => setEditEventDate(e.target.value)}
                    className="w-full text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#DE6841]"
                    required
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Description
                </label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={3}
                  placeholder="Add notes, schedule details, or instructions..."
                  className="w-full text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#DE6841]"
                />
              </div>

              {/* Form Actions */}
              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEventToEdit(null)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium text-sm transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingEvent}
                  className="px-4 py-2 bg-[#DE6841] hover:bg-[#C85732] text-white rounded-xl font-medium text-sm transition-all shadow-xs disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {isUpdatingEvent ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Updating...</span>
                    </>
                  ) : (
                    <span>Update Event</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Calendar;
