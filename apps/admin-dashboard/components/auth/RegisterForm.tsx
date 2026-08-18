"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { useAuthStore } from "@/lib/auth-store";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { AlertCircle, Loader2 } from "lucide-react";
import { toast } from "@/lib/toast";

function parseJwt(token: string) {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

export function RegisterForm() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);

  const [orgName, setOrgName] = React.useState("");
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  
  const [error, setError] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Client-side validations
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    setIsLoading(true);

    try {
      // 1. Submit Registration
      await apiClient.post("/auth/register", {
        organizationName: orgName,
        name,
        email,
        password,
      });

      // 2. Auto-Login
      const loginRes = await apiClient.post("/auth/login", { email, password });
      const { accessToken, refreshToken, user: returnedUser } = loginRes.data;

      let finalUser = returnedUser;
      if (!finalUser && accessToken) {
        const decoded = parseJwt(accessToken);
        finalUser = {
          id: decoded?.sub || "admin_id",
          email: decoded?.email || email,
          name: decoded?.name || name || "System Admin",
          isActive: true,
          organizationId: decoded?.orgId || "org_id",
          roles: decoded?.roles || ["admin"],
          permissions: decoded?.permissions || [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }

      setAuth(accessToken, finalUser);

      const tokenToStore = refreshToken || accessToken;
      Cookies.set("refresh_token", tokenToStore, {
        secure: true,
        sameSite: "strict",
        expires: 7,
      });

      toast.success("Organization registered and logged in successfully!");
      router.push("/dashboard");
    } catch (err: any) {
      console.error("Registration error:", err);
      setError(
        err.response?.data?.message ||
          "Failed to register organization. Please verify your fields."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md bg-card border-border">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold tracking-tight">Register Organization</CardTitle>
        <CardDescription>
          Create a new tenant workspace and administrator account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-rose-50 dark:bg-rose-950/20 border border-rose-500/20 p-3 text-sm text-rose-600 dark:text-rose-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Organization Name
            </label>
            <Input
              type="text"
              placeholder="Trifusion Bangalore"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Administrator Name
            </label>
            <Input
              type="text"
              placeholder="Arun Kumar"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Admin Email
            </label>
            <Input
              type="email"
              placeholder="arun@trifusiondynamics.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Password
              </label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Confirm Password
              </label>
              <Input
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <Button type="submit" className="w-full mt-4" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Registering...
              </>
            ) : (
              "Create Workspace"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
