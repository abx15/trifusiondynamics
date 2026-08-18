"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCreateEmployee, useUnlinkedUsers } from "@/lib/hooks/useHR";
import { toast } from "@/lib/toast";
import { Search, Loader2 } from "lucide-react";

export default function NewEmployeePage() {
  const router = useRouter();
  const createEmployee = useCreateEmployee();
  const { data: users = [], isLoading: isLoadingUsers } = useUnlinkedUsers();

  const [selectedUserId, setSelectedUserId] = React.useState<string>("");
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [department, setDepartment] = React.useState<string>("");
  const [designation, setDesignation] = React.useState<string>("");
  const [joiningDate, setJoiningDate] = React.useState<string>("");
  const [employmentType, setEmploymentType] = React.useState<string>("FULL_TIME");

  // Filter users based on search query
  const filteredUsers = React.useMemo(() => {
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [users, searchQuery]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedUserId) {
      toast.error("Please select a user to link.");
      return;
    }
    if (!joiningDate) {
      toast.error("Please specify a joining date.");
      return;
    }

    createEmployee.mutate(
      {
        userId: selectedUserId,
        department: department || undefined,
        designation: designation || undefined,
        joiningDate: new Date(joiningDate).toISOString(),
        employmentType: employmentType as any,
      },
      {
        onSuccess: (data) => {
          toast.success(`Successfully created employee profile ${data.employeeCode}!`);
          router.push("/hr/employees");
        },
        onError: (err: any) => {
          console.error(err);
          toast.error(err.response?.data?.message || "Failed to create employee profile.");
        },
      }
    );
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader
        title="Link New Employee"
        breadcrumbs={[
          { label: "Operations" },
          { label: "HR Portal", href: "/hr/employees" },
          { label: "Employees", href: "/hr/employees" },
          { label: "New" },
        ]}
      />

      <Card className="bg-white dark:bg-zinc-900 border border-border shadow-md">
        <CardHeader>
          <CardTitle>Create Employee Profile</CardTitle>
          <CardDescription>
            Link an existing workspace user account to an employee profile to enable HR and payroll tracking.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            
            {/* Searchable User Dropdown */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                Select Workspace User <span className="text-destructive">*</span>
              </label>
              
              {isLoadingUsers ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground p-3 border border-border rounded-lg">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading available user accounts...
                </div>
              ) : users.length === 0 ? (
                <div className="text-xs text-amber-600 dark:text-amber-400 p-3 border border-dashed border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 rounded-lg">
                  No unlinked user accounts found. Ensure a user exists in settings and is not already linked.
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Search users by name or email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 text-xs"
                    />
                  </div>
                  
                  <div className="max-h-40 overflow-y-auto border border-border rounded-lg divide-y divide-border bg-card">
                    {filteredUsers.length === 0 ? (
                      <div className="p-3 text-xs text-muted-foreground text-center">
                        No users match your query.
                      </div>
                    ) : (
                      filteredUsers.map((u) => (
                        <div
                          key={u.id}
                          onClick={() => setSelectedUserId(u.id)}
                          className={`flex items-center justify-between p-2.5 text-xs cursor-pointer hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors ${
                            selectedUserId === u.id
                              ? "bg-slate-100/70 dark:bg-zinc-800/80 border-l-2 border-primary"
                              : ""
                          }`}
                        >
                          <div>
                            <p className="font-semibold text-foreground">{u.name}</p>
                            <p className="text-muted-foreground font-mono text-[10px]">{u.email}</p>
                          </div>
                          {selectedUserId === u.id && (
                            <span className="text-[10px] bg-primary text-primary-foreground px-2 py-0.5 rounded font-medium">
                              Selected
                            </span>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Department & Designation */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                  Department
                </label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full text-xs border border-border bg-card text-foreground rounded-lg p-2.5 outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">Select Department</option>
                  <option value="Engineering">Engineering</option>
                  <option value="Design">Design</option>
                  <option value="Product">Product</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Sales">Sales</option>
                  <option value="HR">HR</option>
                  <option value="Finance">Finance</option>
                  <option value="Management">Management</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                  Designation
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Senior Frontend Engineer"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>

            {/* Joining Date & Employment Type */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                  Joining Date <span className="text-destructive">*</span>
                </label>
                <Input
                  type="date"
                  value={joiningDate}
                  onChange={(e) => setJoiningDate(e.target.value)}
                  className="text-xs"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                  Employment Type
                </label>
                <select
                  value={employmentType}
                  onChange={(e) => setEmploymentType(e.target.value)}
                  className="w-full text-xs border border-border bg-card text-foreground rounded-lg p-2.5 outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="FULL_TIME">Full Time</option>
                  <option value="PART_TIME">Part Time</option>
                  <option value="CONTRACT">Contract</option>
                  <option value="INTERN">Intern</option>
                </select>
              </div>
            </div>

            <div className="pt-4 flex items-center justify-end gap-3 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => router.push("/hr/employees")}
                disabled={createEmployee.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={createEmployee.isPending || !selectedUserId || !joiningDate}
                className="gap-2"
              >
                {createEmployee.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Create Profile
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
