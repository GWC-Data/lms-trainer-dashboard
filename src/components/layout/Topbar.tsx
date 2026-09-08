import { useState, useEffect, useRef, useTransition } from "react";
import { useLocation, Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Search,
  HelpCircle,
  Bell,
  Home,
  ChevronRight,
  Menu,
  X,
  FileText,
  BookOpen,
  Boxes,
  Download,
  ArrowRight,
  Loader2,
} from "lucide-react";
import {
  getDocumentsApi,
  getTrainerCoursesApi,
  getModulesApi,
  type BackendDocumentItem,
  type TrainerCourseItem,
  type BackendModuleItem,
} from "@/services/api";
import { triggerDownload } from "@/lib/utils";

const LABELS: Record<string, string> = {
  "": "Dashboard",
  courses: "My Courses",
  content: "Content",
  modules: "Modules",
  lessons: "Lessons",
  videos: "Videos",
  documents: "Materials",
  quizzes: "Quizzes",
  assignments: "Assignments",
  attendance: "Attendance",
  trainees: "Trainees",
  reports: "Reports",
};

interface TopbarProps {
  toggleSidebar?: () => void;
}

export default function Topbar({ toggleSidebar }: TopbarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const segments = location.pathname.split("/").filter(Boolean);
  const crumbs = segments.length === 0 ? ["Dashboard"] : segments.map((s) => LABELS[s] ?? s);

  // Search state
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Cached data
  const [materials, setMaterials] = useState<BackendDocumentItem[]>([]);
  const [courses, setCourses] = useState<TrainerCourseItem[]>([]);
  const [modules, setModules] = useState<BackendModuleItem[]>([]);
  const dataFetchedRef = useRef(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync search input with URL if on documents page
  useEffect(() => {
    if (location.pathname === "/content/documents") {
      const urlQuery = searchParams.get("search") || "";
      setQuery(urlQuery);
    }
  }, [location.pathname, searchParams]);

  // Fetch search index data once user interacts with search
  const loadSearchData = async () => {
    if (dataFetchedRef.current) return;
    try {
      setLoading(true);
      dataFetchedRef.current = true;
      const [docsRes, coursesRes, modulesRes] = await Promise.allSettled([
        getDocumentsApi(),
        getTrainerCoursesApi(),
        getModulesApi(),
      ]);

      if (docsRes.status === "fulfilled" && docsRes.value?.documents) {
        setMaterials(docsRes.value.documents);
      }
      if (coursesRes.status === "fulfilled" && coursesRes.value?.courses) {
        setCourses(coursesRes.value.courses);
      }
      if (modulesRes.status === "fulfilled" && modulesRes.value?.modules) {
        setModules(modulesRes.value.modules);
      }
    } catch (err) {
      console.error("Error loading search index:", err);
    } finally {
      setLoading(false);
    }
  };

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const cleanQuery = query.trim().toLowerCase();

  // Filter matching items
  const filteredMaterials = cleanQuery
    ? materials.filter(
        (m) =>
          (m.title || "").toLowerCase().includes(cleanQuery) ||
          (m.courseName || "").toLowerCase().includes(cleanQuery) ||
          (m.batchName || "").toLowerCase().includes(cleanQuery) ||
          (m.moduleName || "").toLowerCase().includes(cleanQuery) ||
          (m.fileType || "").toLowerCase().includes(cleanQuery)
      )
    : [];

  const filteredCourses = cleanQuery
    ? courses.filter(
        (c) =>
          (c.name || "").toLowerCase().includes(cleanQuery) ||
          (c.level || "").toLowerCase().includes(cleanQuery) ||
          (c.id || "").toLowerCase().includes(cleanQuery)
      )
    : [];

  const filteredModules = cleanQuery
    ? modules.filter(
        (m) =>
          (m.title || "").toLowerCase().includes(cleanQuery) ||
          (m.courseName || "").toLowerCase().includes(cleanQuery)
      )
    : [];

  const totalResults = filteredMaterials.length + filteredCourses.length + filteredModules.length;

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!cleanQuery) return;
    setIsOpen(false);
    navigate(`/content/documents?search=${encodeURIComponent(query.trim())}`);
  };

  const handleClear = () => {
    setQuery("");
    setIsOpen(false);
    if (location.pathname === "/content/documents") {
      navigate("/content/documents");
    }
    inputRef.current?.focus();
  };

  const handleDownloadFile = (e: React.MouseEvent, doc: BackendDocumentItem) => {
    e.stopPropagation();
    if (doc.fileUrl) {
      triggerDownload(doc.fileUrl, doc.title);
    }
  };

  const getBadgeColor = (fileType?: string) => {
    const ft = (fileType || "").toUpperCase();
    if (ft.includes("PDF")) return "bg-red-50 text-red-700 border-red-200";
    if (ft.includes("DOC")) return "bg-blue-50 text-blue-700 border-blue-200";
    if (ft.includes("PPT")) return "bg-amber-50 text-amber-700 border-amber-200";
    if (ft.includes("XLS")) return "bg-emerald-50 text-emerald-700 border-emerald-200";
    return "bg-neutral-50 text-neutral-700 border-neutral-200";
  };

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-[#F5E2DA] bg-white px-6">
      <div className="flex items-center gap-1.5 text-sm text-[#8C7A70]">
        {toggleSidebar && (
          <button onClick={toggleSidebar} className="mr-3 flex items-center text-[#B7A79D] hover:text-[#DE896A]">
            <Menu className="h-5 w-5" />
          </button>
        )}
        <Link to="/" className="flex items-center text-[#B7A79D] hover:text-[#DE896A]">
          <Home className="h-4 w-4" />
        </Link>
        {crumbs.map((crumb, i) => (
          <span key={i} className="flex items-center gap-1.5">
            <ChevronRight className="h-3.5 w-3.5 text-[#D8C7BE]" />
            <span className={i === crumbs.length - 1 ? "font-medium text-[#3A2A22]" : ""}>{crumb}</span>
          </span>
        ))}
      </div>

      <div className="flex items-center gap-3">
        {/* Search Bar Container */}
        <div ref={containerRef} className="relative hidden sm:block">
          <form onSubmit={handleSearchSubmit}>
            <div className="relative flex items-center">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#C7B6AC]" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onFocus={() => {
                  loadSearchData();
                  if (cleanQuery) setIsOpen(true);
                }}
                onChange={(e) => {
                  const val = e.target.value;
                  setQuery(val);
                  if (val.trim()) {
                    setIsOpen(true);
                    loadSearchData();
                  } else {
                    setIsOpen(false);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setIsOpen(false);
                  }
                }}
                placeholder="Search training materials..."
                className="h-9 w-64 md:w-80 rounded-xl border border-[#F0DED4] bg-[#FFFBF9] pl-9 pr-8 text-sm text-[#3A2A22] placeholder:text-[#C7B6AC] focus:border-[#DE896A] focus:outline-none focus:ring-2 focus:ring-[#DE896A]/20 transition-all duration-200"
              />
              {query && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#B7A79D] hover:text-[#DE896A] transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </form>

          {/* Live Search Results Dropdown */}
          {isOpen && cleanQuery && (
            <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 md:w-[420px] max-h-[480px] overflow-y-auto rounded-2xl border border-[#F0DED4] bg-white shadow-2xl z-50 divide-y divide-[#FDF1EB]">
              {loading && totalResults === 0 ? (
                <div className="flex items-center justify-center gap-2 py-8 text-sm text-[#8C7A70]">
                  <Loader2 className="h-4 w-4 animate-spin text-[#DE896A]" />
                  <span>Searching training materials...</span>
                </div>
              ) : totalResults === 0 ? (
                <div className="p-6 text-center">
                  <FileText className="mx-auto h-8 w-8 text-[#D8C7BE] mb-2" />
                  <p className="text-sm font-medium text-[#3A2A22]">No matching materials found</p>
                  <p className="text-xs text-[#8C7A70] mt-1">
                    No items matching "{query}". Try checking your spelling or view all materials.
                  </p>
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      navigate("/content/documents");
                    }}
                    className="mt-3 text-xs font-semibold text-[#DE896A] hover:underline"
                  >
                    Browse all materials →
                  </button>
                </div>
              ) : (
                <>
                  {/* Results Count Header */}
                  <div className="flex items-center justify-between px-4 py-2.5 bg-[#FFFBF9] text-xs text-[#8C7A70]">
                    <span>
                      Found <strong className="text-[#3A2A22]">{totalResults}</strong> result{totalResults === 1 ? "" : "s"}
                    </span>
                    <span className="text-[11px] text-[#B7A79D]">Press Enter to view all</span>
                  </div>

                  {/* Materials / Documents Section */}
                  {filteredMaterials.length > 0 && (
                    <div className="p-2">
                      <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[#B7A79D]">
                        Training Materials ({filteredMaterials.length})
                      </div>
                      <div className="space-y-1">
                        {filteredMaterials.slice(0, 5).map((doc) => {
                          const fileType = (doc.fileType || "FILE").toUpperCase().replace(/^\./, "");
                          return (
                            <div
                              key={doc.id}
                              onClick={() => {
                                setIsOpen(false);
                                navigate(`/content/documents?search=${encodeURIComponent(doc.title)}`);
                              }}
                              className="group flex items-center justify-between gap-3 rounded-xl p-2.5 hover:bg-[#FFF8F6] cursor-pointer transition-colors"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#FBECE7] text-[#DE896A]">
                                  <FileText className="h-4 w-4" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-[#3A2A22] truncate group-hover:text-[#DE896A] transition-colors">
                                    {doc.title}
                                  </p>
                                  <p className="text-xs text-[#8C7A70] truncate">
                                    {[doc.courseName, doc.batchName].filter(Boolean).join(" · ") || "Training Material"}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${getBadgeColor(fileType)}`}>
                                  {fileType}
                                </span>
                                {doc.fileUrl && (
                                  <button
                                    onClick={(e) => handleDownloadFile(e, doc)}
                                    title="Download File"
                                    className="p-1.5 rounded-lg text-[#8C7A70] hover:bg-[#FBECE7] hover:text-[#DE896A] transition-colors"
                                  >
                                    <Download className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Courses Section */}
                  {filteredCourses.length > 0 && (
                    <div className="p-2">
                      <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[#B7A79D]">
                        Courses ({filteredCourses.length})
                      </div>
                      <div className="space-y-1">
                        {filteredCourses.slice(0, 3).map((course) => (
                          <div
                            key={course.id}
                            onClick={() => {
                              setIsOpen(false);
                              navigate("/courses");
                            }}
                            className="group flex items-center justify-between gap-3 rounded-xl p-2.5 hover:bg-[#FFF8F6] cursor-pointer transition-colors"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                                <BookOpen className="h-4 w-4" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-[#3A2A22] truncate group-hover:text-[#DE896A] transition-colors">
                                  {course.name}
                                </p>
                                <p className="text-xs text-[#8C7A70] truncate">
                                  {course.batches?.length || 0} batches · {course.totalTrainees || 0} trainees
                                </p>
                              </div>
                            </div>
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-[#F5E2DA] text-[#3A2A22]">
                              Course
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Modules Section */}
                  {filteredModules.length > 0 && (
                    <div className="p-2">
                      <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[#B7A79D]">
                        Modules ({filteredModules.length})
                      </div>
                      <div className="space-y-1">
                        {filteredModules.slice(0, 3).map((mod) => (
                          <div
                            key={mod.id}
                            onClick={() => {
                              setIsOpen(false);
                              navigate("/content/modules");
                            }}
                            className="group flex items-center justify-between gap-3 rounded-xl p-2.5 hover:bg-[#FFF8F6] cursor-pointer transition-colors"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
                                <Boxes className="h-4 w-4" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-[#3A2A22] truncate group-hover:text-[#DE896A] transition-colors">
                                  {mod.title}
                                </p>
                                <p className="text-xs text-[#8C7A70] truncate">
                                  {mod.courseName || "Module"}
                                </p>
                              </div>
                            </div>
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-sky-100 text-sky-800">
                              Module
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* View All Footer */}
                  <div className="p-2 bg-[#FFFBF9]">
                    <button
                      onClick={() => handleSearchSubmit()}
                      className="w-full flex items-center justify-center gap-2 rounded-xl py-2 px-3 text-xs font-semibold text-[#DE896A] hover:bg-[#FBECE7] transition-colors"
                    >
                      <span>View all results in Materials</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <button className="flex h-9 w-9 items-center justify-center rounded-xl text-[#8C7A70] hover:bg-[#FBECE7] hover:text-[#DE896A]">
          <HelpCircle className="h-[18px] w-[18px]" />
        </button>
        <button className="relative flex h-9 w-9 items-center justify-center rounded-xl text-[#8C7A70] hover:bg-[#FBECE7] hover:text-[#DE896A]">
          <Bell className="h-[18px] w-[18px]" />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[#DE896A]" />
        </button>
      </div>
    </header>
  );
}
