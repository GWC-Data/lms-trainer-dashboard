import { api } from "@/services/api";

export interface BatchEvent {
  id?: string;
  batchId: string;
  title: string;
  description?: string;
  eventDate: string;
  type: string;
  createdBy?: string;
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface BatchEventApiResponse {
  message?: string;
  events?: BatchEvent[];
}

/**
 * Fetch batch events for the authenticated trainee / user.
 * 1. If batchId is provided, queries GET /batch-events?batchId=...
 * 2. Checks trainee-scoped GET /batch-events/trainee with JWT
 * 3. Falls back to GET /batch-events for trainer/admin roles
 */
export const fetchBatchEventsForTraineeApi = async (batchId?: string): Promise<BatchEvent[]> => {
  try {
    let role = "";
    try {
      const stored = localStorage.getItem("teqcertify_user");
      if (stored) {
        const u = JSON.parse(stored);
        role = (u.role || u.roleName || "").toUpperCase();
      }
    } catch {}

    const isTrainee = role === "TRAINEE" || (role !== "ADMIN" && role !== "TRAINER");

    // Trainees only query the self-scoped /batch-events/trainee endpoint
    if (isTrainee) {
      const traineeRes = await api.get<BatchEventApiResponse>("/batch-events/trainee");
      const events = traineeRes.data?.events || [];
      if (batchId) {
        return events.filter(
          (e) => String(e.batchId).trim().toLowerCase() === String(batchId).trim().toLowerCase()
        );
      }
      return events;
    }

    // For Admin / Trainer: query /batch-events with selected batchId
    const res = await api.get<BatchEventApiResponse>("/batch-events", {
      params: batchId && batchId !== "all" ? { batchId } : undefined,
    });
    return res.data?.events || [];
  } catch (error) {
    console.error("Failed to fetch batch events:", error);
    return [];
  }
};

/**
 * Fetch all batch events, optionally filtered by batchId.
 * Hits GET /batch-events.
 */
export const fetchBatchEventsApi = async (batchId?: string): Promise<BatchEvent[]> => {
  try {
    const response = await api.get<BatchEventApiResponse>("/batch-events", {
      params: batchId ? { batchId } : undefined,
    });
    return response.data?.events || [];
  } catch (error) {
    console.error("Failed to fetch batch events:", error);
    return [];
  }
};

function notifyScheduleUpdated(action: "create" | "update" | "delete", id?: string) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("lms:schedule-updated", {
        detail: { action, id, timestamp: Date.now() },
      })
    );
  }
}

/**
 * Create a new batch event (Admin only).
 * Hits POST /batch-events.
 */
export const createBatchEventApi = async (data: Omit<BatchEvent, "id">): Promise<any> => {
  const response = await api.post("/batch-events", data);
  if (response.data && response.data.success !== false) {
    notifyScheduleUpdated("create");
  }
  return response.data;
};

/**
 * Update an existing batch event by ID.
 * Hits PUT /batch-events/:id.
 */
export const updateBatchEventApi = async (id: string, data: Partial<BatchEvent>): Promise<any> => {
  const response = await api.put(`/batch-events/${id}`, data);
  if (response.data && response.data.success !== false) {
    notifyScheduleUpdated("update", id);
  }
  return response.data;
};

/**
 * Delete a batch event by ID.
 * Hits DELETE /batch-events/:id.
 */
export const deleteBatchEventApi = async (id: string): Promise<any> => {
  const response = await api.delete(`/batch-events/${id}`);
  if (response.data && response.data.success !== false) {
    notifyScheduleUpdated("delete", id);
  }
  return response.data;
};
