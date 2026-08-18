import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { LineItem } from "./useInvoices";

export interface Quote {
  id: string;
  number: string;
  leadId?: string;
  clientId?: string;
  status: "DRAFT" | "SENT" | "ACCEPTED" | "REJECTED" | "EXPIRED";
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
  lead?: { id: string; name: string };
}

export interface QuoteFilters {
  status?: string;
  leadId?: string;
  clientId?: string;
  page?: number;
  limit?: number;
}

export function useQuotes(filters: QuoteFilters = {}) {
  return useQuery({
    queryKey: ["quotes", filters],
    queryFn: async () => {
      const { data } = await apiClient.get("/crm/quotes", { params: filters });
      return data as { data: Quote[]; total: number; page: number; limit: number };
    },
    staleTime: 30_000,
  });
}

export function useQuote(id: string) {
  return useQuery({
    queryKey: ["quotes", id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/crm/quotes/${id}`);
      return data as Quote;
    },
    enabled: !!id,
  });
}

export function useCreateQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<Quote>) => {
      const { data } = await apiClient.post("/crm/quotes", payload);
      return data as Quote;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quotes"] }),
  });
}

export function useUpdateQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<Quote> & { id: string }) => {
      const { data } = await apiClient.patch(`/crm/quotes/${id}`, payload);
      return data as Quote;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["quotes"] });
      qc.invalidateQueries({ queryKey: ["quotes", vars.id] });
    },
  });
}

export function useDeleteQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/crm/quotes/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quotes"] }),
  });
}
