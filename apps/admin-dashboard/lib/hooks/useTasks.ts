import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  status: "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  assigneeId?: string;
  dueDate?: string;
  position?: number;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
  assignee?: { id: string; name: string };
}

export interface TaskFilters {
  projectId?: string;
  status?: string;
  assigneeId?: string;
  page?: number;
  limit?: number;
}

export function useTasks(filters: TaskFilters = {}) {
  return useQuery({
    queryKey: ["tasks", filters],
    queryFn: async () => {
      const { data } = await apiClient.get("/tasks", { params: filters });
      return data as { data: Task[]; total: number };
    },
    enabled: !!filters.projectId,
    staleTime: 30_000,
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, ...payload }: Partial<Task> & { projectId: string }) => {
      const { data } = await apiClient.post(`/projects/${projectId}/tasks`, payload);
      return data as Task;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["tasks", { projectId: vars.projectId }] });
    },
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<Task> & { id: string }) => {
      const { data } = await apiClient.patch(`/tasks/${id}`, payload);
      return data as Task;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });
}

export function useMoveTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      status,
      position,
    }: {
      id: string;
      status: Task["status"];
      position?: number;
    }) => {
      const { data } = await apiClient.patch(`/tasks/${id}/move`, { status, position });
      return data as Task;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/tasks/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });
}
