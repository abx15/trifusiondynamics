import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: "PLANNING" | "ACTIVE" | "ON_HOLD" | "COMPLETED" | "CANCELLED";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  clientId?: string;
  startDate?: string;
  dueDate?: string;
  budget?: number;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
  client?: { id: string; name: string };
  milestones?: Milestone[];
  members?: ProjectMember[];
  _count?: { tasks: number };
}

export interface Milestone {
  id: string;
  projectId: string;
  title: string;
  dueDate?: string;
  completed: boolean;
  createdAt: string;
}

export interface ProjectMember {
  userId: string;
  role: string;
  user?: { id: string; name: string; email: string };
}

export interface ProjectFilters {
  status?: string;
  clientId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export function useProjects(filters: ProjectFilters = {}) {
  return useQuery({
    queryKey: ["projects", filters],
    queryFn: async () => {
      const { data } = await apiClient.get("/projects", { params: filters });
      return data as { data: Project[]; total: number; page: number; limit: number };
    },
    staleTime: 30_000,
  });
}

export function useProject(id: string) {
  return useQuery({
    queryKey: ["projects", id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/projects/${id}`);
      return data as Project;
    },
    enabled: !!id,
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<Project>) => {
      const { data } = await apiClient.post("/projects", payload);
      return data as Project;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects"] }),
  });
}

export function useUpdateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<Project> & { id: string }) => {
      const { data } = await apiClient.patch(`/projects/${id}`, payload);
      return data as Project;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["projects", vars.id] });
    },
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/projects/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects"] }),
  });
}
