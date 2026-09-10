import { api } from "@/services/api";

export const fetchBatchByIdApi = async (id: string): Promise<any> => {
  try {
    const response = await api.get(`/batches/${id}`).catch(() => api.get(`/batch/${id}`));
    const b = response.data?.batch || response.data || {};
    return {
      ...b,
      batchName: b.batchName || "Batch",
      startDate:
        typeof b.startDate === "object" && b.startDate !== null && "value" in b.startDate
          ? b.startDate
          : { value: b.startDate || new Date().toISOString() },
      endDate:
        typeof b.endDate === "object" && b.endDate !== null && "value" in b.endDate
          ? b.endDate
          : { value: b.endDate || new Date().toISOString() },
    };
  } catch (error) {
    console.error(`Failed to fetch batch by ID ${id}:`, error);
    return {
      batchName: "Batch",
      startDate: { value: new Date().toISOString() },
      endDate: { value: new Date().toISOString() },
    };
  }
};
