import { api } from "@/services/api";

/**
 * Fetches class schedules for a given batch.
 *
 * Authorization semantics (enforced by backend):
 *   - Admin: always allowed
 *   - Trainer: allowed only for batches they are assigned to (TrainerAssignment / Courses.trainerId)
 *   - Trainee: allowed only for their enrolled batch
 *
 * A 403 response means the authenticated user is not authorized for this batch.
 * This is CORRECT backend behavior — we return [] and do NOT retry, because a
 * retry against a different endpoint would bypass the authorization entirely.
 *
 * A 404 response means the batch has no schedules yet — also return [].
 */
export const fetchBatchClassScheduleByBatchIdApi = async (batchId: string): Promise<any[]> => {
  try {
    const response = await api.get(`/batchClassSchedulebybatch/${batchId}`);
    if (Array.isArray(response.data)) {
      return response.data;
    }
    if (Array.isArray(response.data?.batchClassSchedule)) {
      return response.data.batchClassSchedule;
    }
    return [];
  } catch (error: any) {
    // 404 = batch has no class schedules recorded yet -> return empty schedules []
    if (error?.response?.status === 404) {
      return [];
    }
    throw error;
  }
};

