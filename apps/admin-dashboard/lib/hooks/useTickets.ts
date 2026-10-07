import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export interface Ticket {
  id: string;
  ticketNumber: string;
  type: "CLIENT_SUPPORT" | "INTERNAL";
  title: string;
  description: string;
  status: "OPEN" | "ASSIGNED" | "IN_PROGRESS" | "WAITING_FOR_CLIENT" | "WAITING_FOR_EMPLOYEE" | "RESOLUTION_SUBMITTED" | "UNDER_VERIFICATION" | "REOPENED" | "RESOLVED" | "CLOSED" | "CANCELLED";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT" | "CRITICAL";
  category: "TECHNICAL" | "BILLING" | "ACCOUNT" | "FEATURE_REQUEST" | "BUG_REPORT" | "SECURITY" | "PERFORMANCE" | "IT_SUPPORT" | "HR" | "PAYROLL" | "GENERAL";
  source: "CLIENT_PORTAL" | "EMAIL" | "API" | "INTERNAL" | "PHONE" | "SYSTEM";
  organizationId: string;
  requesterId: string;
  requesterName?: string;
  requesterRoleSnapshot: string;
  clientId?: string;
  clientName?: string;
  projectId?: string;
  projectName?: string;
  departmentId?: string;
  departmentName?: string;
  assignedAgentId?: string;
  assignedAgentName?: string;
  slaPolicyId?: string;
  firstResponseDeadline?: string;
  firstRespondedAt?: string;
  resolutionDeadline?: string;
  resolvedAt?: string;
  closedAt?: string;
  escalationLevel: "NONE" | "ADMIN" | "SUPER_ADMIN";
  createdAt: string;
  updatedAt: string;
  lastActivityAt: string;
}

export interface TicketFilters {
  status?: string;
  priority?: string;
  category?: string;
  assignedToMe?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export function useTickets(filters: TicketFilters = {}) {
  return useQuery({
    queryKey: ["tickets", filters],
    queryFn: async () => {
      const { data } = await apiClient.get("/tickets", { params: filters });
      return data as { data: Ticket[]; total: number; page: number; limit: number };
    },
    staleTime: 30_000,
  });
}

export function useTicket(id: string) {
  return useQuery({
    queryKey: ["tickets", id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/tickets/${id}`);
      return data as Ticket;
    },
    enabled: !!id,
  });
}

export function useCreateTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<Ticket>) => {
      const { data } = await apiClient.post("/tickets", payload);
      return data as Ticket;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tickets"] }),
  });
}

export function useUpdateTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<Ticket> & { id: string }) => {
      const { data } = await apiClient.patch(`/tickets/${id}`, payload);
      return data as Ticket;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["tickets"] });
      qc.invalidateQueries({ queryKey: ["tickets", vars.id] });
    },
  });
}

export function useAssignTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, employeeId, type }: { id: string; employeeId: string; type?: "PRIMARY" | "SUPPORTING" }) => {
      const { data } = await apiClient.post(`/tickets/${id}/assign`, { employeeId, type });
      return data as Ticket;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["tickets"] });
      qc.invalidateQueries({ queryKey: ["tickets", vars.id] });
    },
  });
}

export function useUnassignTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, employeeId }: { id: string; employeeId: string }) => {
      const { data } = await apiClient.post(`/tickets/${id}/unassign`, { employeeId });
      return data as Ticket;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["tickets"] });
      qc.invalidateQueries({ queryKey: ["tickets", vars.id] });
    },
  });
}

export function useStartWork() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await apiClient.post(`/tickets/${id}/start-work`);
      return data as Ticket;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["tickets"] });
      qc.invalidateQueries({ queryKey: ["tickets", vars] });
    },
  });
}

export function useSubmitResolution() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, resolution }: { id: string; resolution: string }) => {
      const { data } = await apiClient.post(`/tickets/${id}/submit-resolution`, { resolution });
      return data as Ticket;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["tickets"] });
      qc.invalidateQueries({ queryKey: ["tickets", vars.id] });
    },
  });
}

export function useVerifyResolution() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, approved }: { id: string; approved: boolean }) => {
      const { data } = await apiClient.post(`/tickets/${id}/verify-resolution`, { approved });
      return data as Ticket;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["tickets"] });
      qc.invalidateQueries({ queryKey: ["tickets", vars.id] });
    },
  });
}

export function useCloseTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const { data } = await apiClient.post(`/tickets/${id}/close`, { reason });
      return data as Ticket;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["tickets"] });
      qc.invalidateQueries({ queryKey: ["tickets", vars.id] });
    },
  });
}

export function useReopenTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const { data } = await apiClient.post(`/tickets/${id}/reopen`, { reason });
      return data as Ticket;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["tickets"] });
      qc.invalidateQueries({ queryKey: ["tickets", vars.id] });
    },
  });
}

export interface TicketComment {
  id: string;
  ticketId: string;
  userId: string;
  content: string;
  isInternal: boolean;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email?: string;
  };
}

export function useTicketComments(ticketId: string) {
  return useQuery({
    queryKey: ["ticket-comments", ticketId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/tickets/${ticketId}/comments`, {
        params: { limit: 100 },
      });
      return data as { data: TicketComment[]; total: number; page: number; limit: number };
    },
    enabled: !!ticketId,
    staleTime: 10_000,
  });
}

export function useAddComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, content, isInternal }: { id: string; content: string; isInternal?: boolean }) => {
      const { data } = await apiClient.post(`/tickets/${id}/comments`, { content, isInternal });
      return data as TicketComment;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["ticket-comments", vars.id] });
      qc.invalidateQueries({ queryKey: ["tickets", vars.id] });
    },
  });
}

export interface TicketSummary {
  total: number;
  open: number;
  assigned: number;
  inProgress: number;
  waitingForClient: number;
  waitingForEmployee: number;
  resolutionSubmitted: number;
  underVerification: number;
  reopened: number;
  resolved: number;
  closed: number;
  cancelled: number;
  escalated: number;
  slaBreached: number;
  unassigned: number;
}

export function useTicketSummary() {
  return useQuery({
    queryKey: ["tickets-summary"],
    queryFn: async () => {
      const { data } = await apiClient.get("/tickets/summary");
      return data as TicketSummary;
    },
    staleTime: 30_000,
  });
}

