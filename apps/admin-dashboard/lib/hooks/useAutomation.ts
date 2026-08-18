import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export interface WorkflowStep {
  id: string;
  type: string; // "WEBHOOK" | "EMAIL" | "LOG"
  config: any;
  sequence: number;
}

export interface Workflow {
  id: string;
  name: string;
  description: string | null;
  triggerType: "CRON" | "WEBHOOK" | "EVENT";
  triggerConfig: any;
  isActive: boolean;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
  steps: WorkflowStep[];
}

export interface WorkflowRun {
  id: string;
  workflowId: string;
  status: "SUCCESS" | "FAILED" | "RUNNING";
  triggeredAt: string;
  logs: string | null;
}

export function useWorkflows() {
  return useQuery({
    queryKey: ["workflows"],
    queryFn: async () => {
      const { data } = await apiClient.get("/automation/workflows");
      return data as Workflow[];
    },
  });
}

export function useWorkflow(id: string) {
  return useQuery({
    queryKey: ["workflows", id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/automation/workflows/${id}`);
      return data as Workflow;
    },
    enabled: !!id,
  });
}

export function useCreateWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<Workflow> & { name: string; triggerType: string; steps: any[] }) => {
      const { data } = await apiClient.post("/automation/workflows", payload);
      return data as Workflow;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workflows"] });
    },
  });
}

export function useToggleWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { data } = await apiClient.patch(`/automation/workflows/${id}/toggle`, { isActive });
      return data as Workflow;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["workflows"] });
      qc.invalidateQueries({ queryKey: ["workflows", vars.id] });
    },
  });
}

export function useTriggerWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await apiClient.post(`/automation/workflows/${id}/trigger`);
      return data as { success: boolean; runId: string };
    },
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: ["workflows", id, "runs"] });
    },
  });
}

export function useWorkflowRuns(workflowId: string) {
  return useQuery({
    queryKey: ["workflows", workflowId, "runs"],
    queryFn: async () => {
      const { data } = await apiClient.get(`/automation/workflows/${workflowId}/runs`);
      return data as WorkflowRun[];
    },
    enabled: !!workflowId,
  });
}
