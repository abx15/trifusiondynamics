import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  isActive: boolean;
  createdAt: string;
  lastUsedAt: string | null;
}

export interface Webhook {
  id: string;
  url: string;
  events: string[];
  isActive: boolean;
  createdAt: string;
}

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  statusCode: number;
  payload: string | null;
  response: string | null;
  durationMs: number;
  createdAt: string;
}

export interface RequestLog {
  id: string;
  method: string;
  path: string;
  statusCode: number;
  ipAddress: string | null;
  durationMs: number;
  createdAt: string;
}

export function useApiKeys() {
  return useQuery({
    queryKey: ["developer", "api-keys"],
    queryFn: async () => {
      const { data } = await apiClient.get("/developer/api-keys");
      return data as ApiKey[];
    },
  });
}

export function useCreateApiKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { name: string; scopes: string[] }) => {
      const { data } = await apiClient.post("/developer/api-keys", payload);
      return data as ApiKey & { rawKey: string }; // Returns rawKey on creation only
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["developer", "api-keys"] });
    },
  });
}

export function useRevokeApiKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/developer/api-keys/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["developer", "api-keys"] });
    },
  });
}

export function useWebhooks() {
  return useQuery({
    queryKey: ["developer", "webhooks"],
    queryFn: async () => {
      const { data } = await apiClient.get("/developer/webhooks");
      return data as Webhook[];
    },
  });
}

export function useCreateWebhook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { url: string; events: string[] }) => {
      const { data } = await apiClient.post("/developer/webhooks", payload);
      return data as Webhook;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["developer", "webhooks"] });
    },
  });
}

export function useToggleWebhook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { data } = await apiClient.patch(`/developer/webhooks/${id}/toggle`, { isActive });
      return data as Webhook;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["developer", "webhooks"] });
      qc.invalidateQueries({ queryKey: ["developer", "webhooks", vars.id, "deliveries"] });
    },
  });
}

export function useDeleteWebhook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/developer/webhooks/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["developer", "webhooks"] });
    },
  });
}

export function useWebhookDeliveries(webhookId: string) {
  return useQuery({
    queryKey: ["developer", "webhooks", webhookId, "deliveries"],
    queryFn: async () => {
      const { data } = await apiClient.get(`/developer/webhooks/${webhookId}/deliveries`);
      return data as WebhookDelivery[];
    },
    enabled: !!webhookId,
  });
}

export function useRequestLogs(filters: { method?: string; statusCode?: string } = {}) {
  return useQuery({
    queryKey: ["developer", "request-logs", filters],
    queryFn: async () => {
      const { data } = await apiClient.get("/developer/request-logs", { params: filters });
      return data as RequestLog[];
    },
  });
}
