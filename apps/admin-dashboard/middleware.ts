import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export type PrimaryRole =
  | "super_admin"
  | "admin"
  | "sales_agent"
  | "support_agent"
  | "hr_agent"
  | "agent"
  | "employee"
  | "client";

function decodeJwtPayload(token: string) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = atob(base64);
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

function getUserPrimaryRole(roles: string[] = []): PrimaryRole {
  const normalized = roles.map((r) => r.toLowerCase().trim());
  if (normalized.includes("super_admin") || normalized.includes("superadmin")) return "super_admin";
  if (normalized.includes("admin")) return "admin";
  if (normalized.includes("sales_agent") || normalized.includes("sales")) return "sales_agent";
  if (normalized.includes("support_agent") || normalized.includes("support")) return "support_agent";
  if (normalized.includes("hr_agent") || normalized.includes("hr")) return "hr_agent";
  if (normalized.includes("agent")) return "agent";
  if (normalized.includes("employee") || normalized.includes("worker") || normalized.includes("staff")) return "employee";
  if (normalized.includes("client")) return "client";
  return "admin";
}

function getRoleHomeRoute(role: PrimaryRole): string {
  switch (role) {
    case "super_admin":
      return "/super-admin";
    case "admin":
      return "/dashboard";
    case "sales_agent":
      return "/crm";
    case "support_agent":
      return "/tickets";
    case "hr_agent":
      return "/hr";
    case "agent":
      return "/agent/dashboard";
    case "employee":
      return "/attendance";
    case "client":
      return "/client/dashboard";
    default:
      return "/dashboard";
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const accessToken = request.cookies.get("access_token")?.value;
  const refreshToken = request.cookies.get("refresh_token")?.value;
  const token = accessToken || refreshToken;

  const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/register") || pathname.startsWith("/auth/callback");
  const isLogoutPage = pathname === "/logout";

  // Handle explicit logout URL
  if (isLogoutPage) {
    const response = NextResponse.redirect(new URL("/login", request.url));
    // Clear all auth cookies
    response.cookies.delete("access_token");
    response.cookies.delete("refresh_token");
    return response;
  }

  // Route groupings
  const isSuperAdminRoute = pathname.startsWith("/super-admin");
  const isClientRoute     = pathname.startsWith("/client");
  const isAgentRoute      = pathname.startsWith("/agent");
  const isEmployeeRoute   =
    pathname.startsWith("/employee") ||
    pathname.startsWith("/attendance") ||
    pathname.startsWith("/leave") ||
    pathname.startsWith("/payslips");
  const isSalesRoute      = pathname.startsWith("/crm") || pathname.startsWith("/leads-inbox");
  const isHrRoute         = pathname.startsWith("/hr") || pathname.startsWith("/payroll");
  const isAdminDashboardRoute =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/analytics") ||
    pathname.startsWith("/projects") ||
    pathname.startsWith("/billing") ||
    pathname.startsWith("/finance") ||
    pathname.startsWith("/automation") ||
    pathname.startsWith("/ai") ||
    pathname.startsWith("/developer") ||
    pathname.startsWith("/settings");

  const isProtected =
    isSuperAdminRoute ||
    isClientRoute ||
    isAgentRoute ||
    isEmployeeRoute ||
    isSalesRoute ||
    isHrRoute ||
    isAdminDashboardRoute;

  // 1. Unauthenticated users trying to access protected routes -> redirect to /login
  if (!token && isProtected) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 2. If token is present
  if (token) {
    const payload = decodeJwtPayload(token);
    const roles: string[] = payload?.roles || [];
    const primaryRole = getUserPrimaryRole(roles);
    const homeRoute = getRoleHomeRoute(primaryRole);

    // Authenticated user opening /login or /register -> redirect to role home
    if (isAuthPage && !pathname.startsWith("/auth/callback")) {
      return NextResponse.redirect(new URL(homeRoute, request.url));
    }

    // Root / -> redirect to role home
    if (pathname === "/") {
      return NextResponse.redirect(new URL(homeRoute, request.url));
    }

    // Role-based Route Protection
    if (isSuperAdminRoute && primaryRole !== "super_admin") {
      return NextResponse.redirect(new URL(homeRoute, request.url));
    }

    if (isClientRoute && primaryRole !== "client" && primaryRole !== "admin" && primaryRole !== "super_admin") {
      return NextResponse.redirect(new URL(homeRoute, request.url));
    }

    // Client user trying to access non-client internal routes
    if (primaryRole === "client" && !isClientRoute && !isAuthPage) {
      return NextResponse.redirect(new URL("/client/dashboard", request.url));
    }
  } else {
    // Unauthenticated user at root / -> redirect to /login
    if (pathname === "/") {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
