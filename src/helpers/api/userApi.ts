import { api } from "@/services/api";

export const fetchUsersbyIdApi = async (id: string): Promise<any> => {
  try {
    const response = await api.get(`/users/${id}`);
    return response.data?.user || response.data || {};
  } catch (error) {
    console.error(`Failed to fetch user by ID ${id}:`, error);
    return { firstName: "Trainer", lastName: "" };
  }
};
