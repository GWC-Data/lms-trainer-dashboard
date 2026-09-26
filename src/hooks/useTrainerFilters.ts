import { useState, useEffect, useMemo, useCallback } from "react";
import {
  getTrainerFiltersApi,
  TrainerFilterCourseItem,
  TrainerFilterBatchItem,
} from "@/services/api";

export interface UseTrainerFiltersOptions {
  /** Initial course filter value. Defaults to "all" */
  initialCourseId?: string;
  /** Initial batch filter value. Defaults to "all" */
  initialBatchId?: string;
  /** Value representing "all" / unfiltered state (e.g. "all" or "ALL"). Defaults to "all" */
  allValue?: string;
  /** If true, selecting a batch will automatically sync selectedCourseId to batch.courseId. Defaults to true */
  syncBatchToCourse?: boolean;
}

export interface UseTrainerFiltersReturn {
  courses: TrainerFilterCourseItem[];
  batches: TrainerFilterBatchItem[];
  /** Batches filtered dynamically according to selectedCourseId */
  availableBatches: TrainerFilterBatchItem[];
  selectedCourseId: string;
  selectedBatchId: string;
  setSelectedCourseId: (courseId: string) => void;
  setSelectedBatchId: (batchId: string) => void;
  selectedCourse: TrainerFilterCourseItem | null;
  selectedBatch: TrainerFilterBatchItem | null;
  /** Changes course and automatically resets batch if it does not belong to the newly selected course */
  handleCourseChange: (newCourseId: string) => void;
  /** Changes batch and optionally syncs course selection */
  handleBatchChange: (newBatchId: string) => void;
  /** Resets both course and batch filters to allValue */
  resetFilters: () => void;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  courseMap: Map<string, TrainerFilterCourseItem>;
  batchMap: Map<string, TrainerFilterBatchItem>;
}

/**
 * Reusable hook for Trainer Course & Batch dropdown filters across all dashboard pages.
 * - Loads filter data once via `GET /api/trainer/filters`
 * - Maintains Course -> Batch dependency purely in-memory with ZERO repeated API requests
 * - Automatically resets batch selection when switching to a course that doesn't contain that batch
 */
export function useTrainerFilters(options: UseTrainerFiltersOptions = {}): UseTrainerFiltersReturn {
  const {
    initialCourseId = "all",
    initialBatchId = "all",
    allValue = "all",
    syncBatchToCourse = true,
  } = options;

  const [courses, setCourses] = useState<TrainerFilterCourseItem[]>([]);
  const [batches, setBatches] = useState<TrainerFilterBatchItem[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>(initialCourseId);
  const [selectedBatchId, setSelectedBatchId] = useState<string>(initialBatchId);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchFilters = useCallback(async (force = false) => {
    try {
      setLoading(true);
      setError(null);
      const data = await getTrainerFiltersApi(force);
      setCourses(Array.isArray(data.courses) ? data.courses : []);
      setBatches(Array.isArray(data.batches) ? data.batches : []);
    } catch (err: any) {
      console.error("useTrainerFilters: Failed to load trainer filters:", err);
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFilters(false);
  }, [fetchFilters]);

  // Lookup maps for rapid O(1) resolution
  const courseMap = useMemo(() => {
    const map = new Map<string, TrainerFilterCourseItem>();
    courses.forEach((c) => {
      if (c.id) map.set(c.id, c);
    });
    return map;
  }, [courses]);

  const batchMap = useMemo(() => {
    const map = new Map<string, TrainerFilterBatchItem>();
    batches.forEach((b) => {
      if (b.id) map.set(b.id, b);
    });
    return map;
  }, [batches]);

  // Dynamically filter available batches by selected course locally
  const availableBatches = useMemo(() => {
    if (selectedCourseId === allValue || !selectedCourseId) {
      return batches;
    }
    return batches.filter((b) => b.courseId === selectedCourseId);
  }, [batches, selectedCourseId, allValue]);

  // Currently selected objects
  const selectedCourse = useMemo(() => {
    if (selectedCourseId === allValue || !selectedCourseId) return null;
    return courseMap.get(selectedCourseId) || null;
  }, [selectedCourseId, allValue, courseMap]);

  const selectedBatch = useMemo(() => {
    if (selectedBatchId === allValue || !selectedBatchId) return null;
    return batchMap.get(selectedBatchId) || null;
  }, [selectedBatchId, allValue, batchMap]);

  // Course change with automatic batch validity check
  const handleCourseChange = useCallback(
    (newCourseId: string) => {
      setSelectedCourseId(newCourseId);

      // If a batch was selected, check if it still belongs to the new course
      if (newCourseId !== allValue && selectedBatchId !== allValue) {
        const currentBatch = batchMap.get(selectedBatchId);
        if (currentBatch && currentBatch.courseId && currentBatch.courseId !== newCourseId) {
          // Reset batch to "all" since it doesn't belong to the newly selected course
          setSelectedBatchId(allValue);
        }
      }
    },
    [allValue, selectedBatchId, batchMap]
  );

  // Batch change with optional course synchronization
  const handleBatchChange = useCallback(
    (newBatchId: string) => {
      setSelectedBatchId(newBatchId);

      if (syncBatchToCourse && newBatchId !== allValue) {
        const found = batchMap.get(newBatchId);
        if (found?.courseId) {
          setSelectedCourseId(found.courseId);
        }
      }
    },
    [allValue, syncBatchToCourse, batchMap]
  );

  const resetFilters = useCallback(() => {
    setSelectedCourseId(allValue);
    setSelectedBatchId(allValue);
  }, [allValue]);

  return {
    courses,
    batches,
    availableBatches,
    selectedCourseId,
    selectedBatchId,
    setSelectedCourseId,
    setSelectedBatchId,
    selectedCourse,
    selectedBatch,
    handleCourseChange,
    handleBatchChange,
    resetFilters,
    loading,
    error,
    refresh: () => fetchFilters(true),
    courseMap,
    batchMap,
  };
}
