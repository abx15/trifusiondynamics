import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export interface Lead {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  source?: string;
  stage: "NEW" | "CONTACTED" | "QUALIFIED" | "PROPOSAL" | "NEGOTIATION" | "WON" | "LOST";
  value?: number;
  notes?: string;
  assignedToId?: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
  followUps?: FollowUp[];
}

export interface FollowUp {
  id: string;
  leadId: string;
  note: string;
  method: string;
  scheduledAt?: string;
  completedAt?: string;
  createdAt: string;
}

export interface LeadFilters {
  stage?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export function useLeads(filters: LeadFilters = {}) {
  return useQuery({
    queryKey: ["leads", filters],
    queryFn: async () => {
      const { data } = await apiClient.get("/crm/leads", { params: filters });
      return data as { data: Lead[]; total: number; page: number; limit: number };
    },
    staleTime: 30_000,
  });
}

export function useLead(id: string) {
  return useQuery({
    queryKey: ["leads", id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/crm/leads/${id}`);
      return data as Lead;
    },
    enabled: !!id,
  });
}

export function useCreateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<Lead>) => {
      const { data } = await apiClient.post("/crm/leads", payload);
      return data as Lead;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leads"] }),
  });
}

export function useUpdateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<Lead> & { id: string }) => {
      const { data } = await apiClient.patch(`/crm/leads/${id}`, payload);
      return data as Lead;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["leads", vars.id] });
    },
  });
}

export function useUpdateLeadStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, stage }: { id: string; stage: Lead["stage"] }) => {
      const { data } = await apiClient.patch(`/crm/leads/${id}/stage`, { stage });
      return data as Lead;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leads"] }),
  });
}

export function useDeleteLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/crm/leads/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leads"] }),
  });
}

export function useConvertLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await apiClient.post(`/crm/leads/${id}/convert`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["clients"] });
    },
  });
}

export function useCreateFollowUp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ leadId, ...payload }: Partial<FollowUp> & { leadId: string }) => {
      const { data } = await apiClient.post(`/crm/leads/${leadId}/followups`, payload);
      return data as FollowUp;
    },
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ["leads", vars.leadId] }),
  });
}
