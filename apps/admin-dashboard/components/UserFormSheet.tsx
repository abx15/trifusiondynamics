"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { toast } from "@/lib/toast";
import { apiClient } from "@/lib/api-client";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, UserPlus, Trash2, Edit3 } from "lucide-react";

const ROLES = [
  { value: "superadmin", label: "Super Admin" },
  { value: "admin", label: "Admin" },
  { value: "sales_agent", label: "Sales Agent" },
  { value: "support_agent", label: "Support Agent" },
  { value: "hr_agent", label: "HR Agent" },
  { value: "employee", label: "Employee" },
  { value: "client", label: "Client" },
];

interface UserFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: any;
  onSuccess: () => void;
}

export function UserFormSheet({ open, onOpenChange, user, onSuccess }: UserFormSheetProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const isEditing = !!user;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isValid },
  } = useForm({
    defaultValues: {
      name: user?.name || "",
      email: user?.email || "",
      phone: user?.phone || "",
      role: user?.roles?.[0]?.role?.name || "employee",
      isActive: user?.isActive ?? true,
      mustChangePassword: user?.mustChangePassword ?? true,
    },
  });

  React.useEffect(() => {
    if (open) {
      reset({
        name: user?.name || "",
        email: user?.email || "",
        phone: user?.phone || "",
        role: user?.roles?.[0]?.role?.name || "employee",
        isActive: user?.isActive ?? true,
        mustChangePassword: user?.mustChangePassword ?? true,
      });
    }
  }, [open, user, reset]);

  const onSubmit = async (data: any) => {
    setIsSubmitting(true);
    try {
      if (isEditing && user) {
        await apiClient.patch(`/api/users/${user.id}`, data);
        toast.success("User updated successfully");
      } else {
        await apiClient.post("/api/users", data);
        toast.success("User invited successfully");
      }
      onSuccess();
      onOpenChange(false);
      reset();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Operation failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!user) return;
    if (!confirm(`Are you sure you want to delete ${user.name}? This action cannot be undone.`)) {
      return;
    }
    setIsSubmitting(true);
    try {
      await apiClient.delete(`/api/users/${user.id}`);
      toast.success("User deleted successfully");
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Delete failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Edit3 className="h-4 w-4" />
                Edit Team Member
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4" />
                Invite Team Member
              </>
            )}
          </SheetTitle>
          <SheetDescription>
            {isEditing
              ? "Update user details and role assignment."
              : "Create a new team member account with role-based access."}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Full Name *
            </label>
            <Input
              placeholder="John Doe"
              {...register("name", { required: "Name is required" })}
              className={errors.name ? "border-red-500" : ""}
            />
            {errors.name && (
              <p className="text-xs text-red-500">{String(errors.name.message)}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Email Address *
            </label>
            <Input
              type="email"
              placeholder="john@company.com"
              {...register("email", { required: "Email is required" })}
              disabled={isEditing}
              className={errors.email ? "border-red-500" : ""}
            />
            {errors.email && (
              <p className="text-xs text-red-500">{String(errors.email.message)}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Phone (Optional)
            </label>
            <Input
              placeholder="+1 234 567 8900"
              {...register("phone")}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Role *
            </label>
            <select
              {...register("role", { required: "Role is required" })}
              className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
            >
              {ROLES.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </div>

          {isEditing && (
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  {...register("isActive")}
                  className="h-4 w-4 rounded border-border text-purple-600 focus:ring-purple-500"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">Active</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  {...register("mustChangePassword")}
                  className="h-4 w-4 rounded border-border text-purple-600 focus:ring-purple-500"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">Require password change</span>
              </label>
            </div>
          )}

          <div className="flex items-center gap-2 pt-4">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {isEditing ? "Saving..." : "Inviting..."}
                </>
              ) : isEditing ? (
                "Save Changes"
              ) : (
                "Send Invitation"
              )}
            </Button>
            {isEditing && (
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={isSubmitting}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
