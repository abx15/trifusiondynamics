import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { LineItem } from "./useInvoices";

export interface Estimate {
  id: string;
  number: string;
  clientId?: string;
  status: "DRAFT" | "SENT" | "APPROVED" | "REJECTED";
  validUntil?: string;
  lineItems: LineItem[];
  subtotal: number;
  taxAmount: number;
  total: number;
  notes?: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
  client?: { id: string; name: string };
}

export interface EstimateFilters {
  status?: string;
  clientId?: string;
  page?: number;
  limit?: number;
}

export function useEstimates(filters: EstimateFilters = {}) {
  return useQuery({
    queryKey: ["estimates", filters],
    queryFn: async () => {
      const { data } = await apiClient.get("/billing/estimates", { params: filters });
      return data as { data: Estimate[]; total: number; page: number; limit: number };
    },
    staleTime: 30_000,
  });
}

export function useEstimate(id: string) {
  return useQuery({
    queryKey: ["estimates", id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/billing/estimates/${id}`);
      return data as Estimate;
    },
    enabled: !!id,
  });
}

export function useCreateEstimate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<Estimate>) => {
      const { data } = await apiClient.post("/billing/estimates", payload);
      return data as Estimate;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["estimates"] }),
  });
}

export function useUpdateEstimate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<Estimate> & { id: string }) => {
      const { data } = await apiClient.patch(`/billing/estimates/${id}`, payload);
      return data as Estimate;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["estimates"] });
      qc.invalidateQueries({ queryKey: ["estimates", vars.id] });
    },
  });
}

export function useDeleteEstimate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/billing/estimates/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["estimates"] }),
  });
}
