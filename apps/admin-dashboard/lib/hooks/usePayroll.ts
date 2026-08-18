import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export interface SalaryStructure {
  id: string;
  employeeId: string;
  basicSalary: number;
  hra: number;
  allowances: number;
  deductions: number;
  effectiveFrom: string;
}

export interface Payslip {
  id: string;
  employeeId: string;
  month: number;
  year: number;
  grossAmount: number;
  deductions: number;
  tax: number;
  netAmount: number;
  status: "GENERATED" | "PAID";
  paidAt: string | null;
  pdfUrl: string | null;
  createdAt: string;
  employee?: {
    employeeCode: string;
    department: string | null;
    designation: string | null;
    user?: {
      name: string;
      email: string;
    };
  };
}

export function useSalaryStructure(employeeId: string) {
  return useQuery({
    queryKey: ["salary-structure", employeeId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/payroll/salary-structure/${employeeId}`);
      return data as SalaryStructure;
    },
    enabled: !!employeeId,
    retry: false, // Don't retry if not configured yet
  });
}

export function useSaveSalaryStructure() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<SalaryStructure> & { employeeId: string }) => {
      const { data } = await apiClient.post("/payroll/salary-structure", payload);
      return data as SalaryStructure;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["salary-structure", vars.employeeId] });
      qc.invalidateQueries({ queryKey: ["employees"] }); // Invalidate employees list to refresh status
    },
  });
}

export function usePayslips(employeeId?: string) {
  return useQuery({
    queryKey: ["payslips", { employeeId }],
    queryFn: async () => {
      const { data } = await apiClient.get("/payroll/payslips", { params: { employeeId } });
      return data as Payslip[];
    },
  });
}

export function usePayslip(id: string) {
  return useQuery({
    queryKey: ["payslips", id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/payroll/payslips/${id}`);
      return data as Payslip;
    },
    enabled: !!id,
  });
}

export function useGeneratePayslipsBulk() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ month, year }: { month: number; year: number }) => {
      const { data } = await apiClient.post("/payroll/payslips/generate-bulk", { month, year });
      return data as { generated: number; skipped: number };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payslips"] });
    },
  });
}

export function useMarkPayslipPaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await apiClient.patch(`/payroll/payslips/${id}/pay`);
      return data as Payslip;
    },
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: ["payslips"] });
      qc.invalidateQueries({ queryKey: ["payslips", id] });
    },
  });
}
