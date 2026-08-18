import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export interface Employee {
  id: string;
  userId: string;
  employeeCode: string;
  department: string | null;
  designation: string | null;
  joiningDate: string;
  employmentType: "FULL_TIME" | "PART_TIME" | "CONTRACT" | "INTERN";
  status: "ACTIVE" | "ON_LEAVE" | "RESIGNED" | "TERMINATED";
  reportingToId: string | null;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
  leaves?: Leave[];
  documents?: EmployeeDocument[];
  user?: {
    name: string;
    email: string;
  };
  salaryStructure?: {
    id: string;
  } | null;
}

export interface EmployeeDocument {
  id: string;
  employeeId: string;
  type: string;
  fileUrl: string;
  uploadedAt: string;
}

export interface Leave {
  id: string;
  employeeId: string;
  type: "SICK" | "CASUAL" | "EARNED" | "UNPAID";
  startDate: string;
  endDate: string;
  reason: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  approvedById: string | null;
  createdAt: string;
  employee?: {
    employeeCode: string;
    user?: {
      name: string;
      email: string;
    };
  };
}

export interface Candidate {
  id: string;
  position: string;
  department: string | null;
  candidateName: string;
  candidateEmail: string;
  resumeUrl: string | null;
  stage: "APPLIED" | "SCREENING" | "INTERVIEW" | "OFFERED" | "HIRED" | "REJECTED";
  notes: string | null;
  organizationId: string;
  createdAt: string;
}

export interface AttendanceSummary {
  month: number;
  year: number;
  hoursWorked: number;
  lateCount: number;
  totalPunches: number;
  punches: any[];
}

export function useEmployees(filters: { department?: string; status?: string } = {}) {
  return useQuery({
    queryKey: ["employees", filters],
    queryFn: async () => {
      const { data } = await apiClient.get("/hr/employees", { params: filters });
      return data as Employee[];
    },
  });
}

export function useEmployee(id: string) {
  return useQuery({
    queryKey: ["employees", id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/hr/employees/${id}`);
      return data as Employee;
    },
    enabled: !!id,
  });
}

export function useUnlinkedUsers() {
  return useQuery({
    queryKey: ["unlinked-users"],
    queryFn: async () => {
      const { data } = await apiClient.get("/hr/employees/users");
      return data as { id: string; name: string; email: string }[];
    },
  });
}

export function useCreateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<Employee>) => {
      const { data } = await apiClient.post("/hr/employees", payload);
      return data as Employee;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employees"] });
      qc.invalidateQueries({ queryKey: ["unlinked-users"] });
    },
  });
}

export function useUpdateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<Employee> & { id: string }) => {
      const { data } = await apiClient.patch(`/hr/employees/${id}`, payload);
      return data as Employee;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["employees"] });
      qc.invalidateQueries({ queryKey: ["employees", vars.id] });
    },
  });
}

export function useLeaves(employeeId?: string) {
  return useQuery({
    queryKey: ["leaves", { employeeId }],
    queryFn: async () => {
      const { data } = await apiClient.get("/hr/leaves", { params: { employeeId } });
      return data as Leave[];
    },
  });
}

export function useCreateLeave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { type: string; startDate: string; endDate: string; reason: string }) => {
      const { data } = await apiClient.post("/hr/leaves", payload);
      return data as Leave;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leaves"] });
    },
  });
}

export function useReviewLeave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, reason }: { id: string; status: "APPROVED" | "REJECTED"; reason?: string }) => {
      const { data } = await apiClient.patch(`/hr/leaves/${id}/review`, { status, reason });
      return data as Leave;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leaves"] });
    },
  });
}

export function useCandidates() {
  return useQuery({
    queryKey: ["candidates"],
    queryFn: async () => {
      const { data } = await apiClient.get("/hr/recruitment");
      return data as Candidate[];
    },
  });
}

export function useCreateCandidate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<Candidate>) => {
      const { data } = await apiClient.post("/hr/recruitment", payload);
      return data as Candidate;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["candidates"] });
    },
  });
}

export function useUpdateCandidateStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, stage }: { id: string; stage: string }) => {
      const { data } = await apiClient.patch(`/hr/recruitment/${id}/stage`, { stage });
      return data as Candidate;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["candidates"] });
    },
  });
}

export function useEmployeeAttendanceSummary(employeeId: string, month?: number, year?: number) {
  return useQuery({
    queryKey: ["attendance-summary", employeeId, { month, year }],
    queryFn: async () => {
      const { data } = await apiClient.get(`/hr/attendance/${employeeId}/summary`, {
        params: { month, year },
      });
      return data as AttendanceSummary;
    },
    enabled: !!employeeId,
  });
}

export function useEmployeeMe() {
  return useQuery({
    queryKey: ["employees", "me"],
    queryFn: async () => {
      const { data } = await apiClient.get("/hr/employees/me");
      return data as Employee;
    },
    retry: false,
  });
}

