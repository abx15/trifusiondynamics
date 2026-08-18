import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate?: number;
  amount: number;
}

export interface Invoice {
  id: string;
  number: string;
  clientId: string;
  projectId?: string;
  status: "DRAFT" | "SENT" | "VIEWED" | "PAID" | "OVERDUE" | "CANCELLED";
  issueDate: string;
  dueDate: string;
  lineItems: LineItem[];
  subtotal: number;
  taxAmount: number;
  total: number;
  notes?: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
  client?: { id: string; name: string };
  payments?: Payment[];
}

export interface Payment {
  id: string;
  invoiceId: string;
  amount: number;
  method: string;
  reference?: string;
  paidAt: string;
  createdAt: string;
}

export interface InvoiceFilters {
  status?: string;
  clientId?: string;
  page?: number;
  limit?: number;
}

export function useInvoices(filters: InvoiceFilters = {}) {
  return useQuery({
    queryKey: ["invoices", filters],
    queryFn: async () => {
      const { data } = await apiClient.get("/billing/invoices", { params: filters });
      return data as { data: Invoice[]; total: number; page: number; limit: number };
    },
    staleTime: 30_000,
  });
}

export function useInvoice(id: string) {
  return useQuery({
    queryKey: ["invoices", id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/billing/invoices/${id}`);
      return data as Invoice;
    },
    enabled: !!id,
  });
}

export function useCreateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<Invoice>) => {
      const { data } = await apiClient.post("/billing/invoices", payload);
      return data as Invoice;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invoices"] }),
  });
}

export function useUpdateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<Invoice> & { id: string }) => {
      const { data } = await apiClient.patch(`/billing/invoices/${id}`, payload);
      return data as Invoice;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["invoices", vars.id] });
    },
  });
}

export function useRecordPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      invoiceId,
      ...payload
    }: Partial<Payment> & { invoiceId: string }) => {
      const { data } = await apiClient.post(
        `/billing/invoices/${invoiceId}/payments`,
        payload
      );
      return data as Payment;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["invoices", vars.invoiceId] });
    },
  });
}

export function useDeleteInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/billing/invoices/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invoices"] }),
  });
}
