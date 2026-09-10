import { api } from "@/services/api";

export const getAttendanceByUserIdApi = async (userId: string): Promise<any[]> => {
  try {
    const response = await api.get(`/attendance/${userId}`);
    return response.data?.attendanceRecords || response.data || [];
  } catch (error) {
    console.error(`Failed to fetch attendance for user ${userId}:`, error);
    return [];
  }
};
