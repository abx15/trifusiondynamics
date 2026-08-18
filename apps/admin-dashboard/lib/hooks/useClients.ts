import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
  gstNumber?: string;
  panNumber?: string;
  notes?: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
  contacts?: ClientContact[];
}

export interface ClientContact {
  id: string;
  clientId: string;
  name: string;
  email?: string;
  phone?: string;
  role?: string;
  isPrimary: boolean;
}

export interface ClientFilters {
  search?: string;
  page?: number;
  limit?: number;
}

export function useClients(filters: ClientFilters = {}) {
  return useQuery({
    queryKey: ["clients", filters],
    queryFn: async () => {
      const { data } = await apiClient.get("/clients", { params: filters });
      return data as { data: Client[]; total: number; page: number; limit: number };
    },
    staleTime: 30_000,
  });
}

export function useClient(id: string) {
  return useQuery({
    queryKey: ["clients", id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/clients/${id}`);
      return data as Client;
    },
    enabled: !!id,
  });
}

export function useCreateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<Client>) => {
      const { data } = await apiClient.post("/clients", payload);
      return data as Client;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clients"] }),
  });
}

export function useUpdateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<Client> & { id: string }) => {
      const { data } = await apiClient.patch(`/clients/${id}`, payload);
      return data as Client;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      qc.invalidateQueries({ queryKey: ["clients", vars.id] });
    },
  });
}

export function useDeleteClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/clients/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clients"] }),
  });
}
