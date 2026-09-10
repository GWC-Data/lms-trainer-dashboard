import { api } from "@/services/api";

/**
 * Resolves batch enrollment for the authenticated user/trainee.
 *
 * Flow:
 * 1. Calls existing GET /trainees/:id/batch (trainee batch endpoint gated by GetUser).
 * 2. If user is a trainer/admin or not enrolled as a single trainee, calls existing GET /batches
 *    which resolves all batches accessible to the authenticated JWT user.
 * 3. Gracefully tries GET /batchTrainee/:id catching any 404/403.
 *
 * Returns an array of real batch ID strings.
 */
export const fetchBatchIdByTraineeIdApi = async (traineeId: string): Promise<string[]> => {
  try {
    // 1. Try real trainee batch endpoint: GET /trainees/:id/batch
    if (traineeId) {
      try {
        const traineeBatchRes = await api.get(`/trainees/${traineeId}/batch`);
        const singleBatch = traineeBatchRes.data?.batch;
        if (singleBatch && singleBatch.batchId) {
          return [singleBatch.batchId];
        }
      } catch (err: any) {
        // If 404 or not found, proceed to next strategy
        if (err.response?.status !== 404) {
          console.warn("Trainee batch lookup note:", err.response?.data?.message || err.message);
        }
      }
    }

    // 2. Try user/trainer batches via JWT: GET /batches
    try {
      const batchesRes = await api.get("/batches");
      const list = batchesRes.data?.batch?.data || batchesRes.data?.data || [];
      if (Array.isArray(list) && list.length > 0) {
        const ids = list
          .map((item: any) => item.batchId || item.id)
          .filter((id: any): id is string => typeof id === "string" && id.length > 0);
        if (ids.length > 0) {
          return Array.from(new Set(ids));
        }
      }
    } catch (err: any) {
      console.warn("Batches list lookup note:", err.response?.data?.message || err.message);
    }

    // 3. Fallback to /batchTrainee/:id if available
    if (traineeId) {
      try {
        const btRes = await api.get(`/batchTrainee/${traineeId}`);
        if (Array.isArray(btRes.data?.batchIds) && btRes.data.batchIds.length > 0) {
          return btRes.data.batchIds;
        }
      } catch {
        // Ignore 404/403 gracefully
      }
    }

    return [];
  } catch (error) {
    console.error(`Failed to resolve batches for user ${traineeId}:`, error);
    return [];
  }
};
