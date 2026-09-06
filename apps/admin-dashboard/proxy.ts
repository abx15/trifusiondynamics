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

function isTokenExpired(payload: any): boolean {
  if (!payload?.exp) return false;
  return Date.now() >= payload.exp * 1000;
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
  return "employee";
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
      return "/login";
  }
}

function getAccessToken(request: NextRequest): string | null {
  const accessToken = request.cookies.get("access_token")?.value;
  if (accessToken) return accessToken;

  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }
  return null;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const accessToken = getAccessToken(request);
  let token: string | null = null;
  let tokenExpired = false;

  if (accessToken) {
    token = accessToken;
    const payload = decodeJwtPayload(accessToken);
    if (payload) {
      tokenExpired = isTokenExpired(payload);
      if (tokenExpired) {
        token = null;
      }
    }
  }

  const isAuthPage =
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/auth/callback");
  const isLogoutPage = pathname === "/logout";

  if (isLogoutPage) {
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete("access_token");
    response.cookies.delete("refresh_token");
    return response;
  }

  const isSuperAdminRoute = pathname.startsWith("/super-admin");
  const isClientRoute = pathname.startsWith("/client");
  const isAgentRoute = pathname.startsWith("/agent");
  const isEmployeeRoute =
    pathname.startsWith("/employee") ||
    pathname.startsWith("/attendance") ||
    pathname.startsWith("/leave") ||
    pathname.startsWith("/payslips");
  const isSalesRoute = pathname.startsWith("/crm") || pathname.startsWith("/leads-inbox");
  const isSupportRoute = pathname.startsWith("/tickets");
  const isHrRoute = pathname.startsWith("/hr") || pathname.startsWith("/payroll");
  const isAdminDashboardRoute =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/analytics") ||
    pathname.startsWith("/projects") ||
    pathname.startsWith("/clients") ||
    pathname.startsWith("/billing") ||
    pathname.startsWith("/finance") ||
    pathname.startsWith("/automation") ||
    pathname.startsWith("/ai") ||
    pathname.startsWith("/developer") ||
    pathname.startsWith("/erp") ||
    pathname.startsWith("/settings");

  const isProtected =
    isSuperAdminRoute ||
    isClientRoute ||
    isAgentRoute ||
    isEmployeeRoute ||
    isSalesRoute ||
    isSupportRoute ||
    isHrRoute ||
    isAdminDashboardRoute;

  if (!token && isProtected) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (token && !tokenExpired) {
    const payload = decodeJwtPayload(token);
    const roles: string[] = payload?.roles || [];
    const primaryRole = getUserPrimaryRole(roles);
    const homeRoute = getRoleHomeRoute(primaryRole);

    if (isAuthPage && !pathname.startsWith("/auth/callback")) {
      return NextResponse.redirect(new URL(homeRoute, request.url));
    }

    if (pathname === "/") {
      return NextResponse.redirect(new URL(homeRoute, request.url));
    }

    if (primaryRole === "super_admin") {
      return NextResponse.next();
    }

    if (isSuperAdminRoute) {
      return NextResponse.redirect(new URL(homeRoute, request.url));
    }

    if (primaryRole === "admin") {
      return NextResponse.next();
    }

    if (primaryRole === "client") {
      if (!isClientRoute) {
        return NextResponse.redirect(new URL("/client/dashboard", request.url));
      }
      return NextResponse.next();
    }

    if (primaryRole === "employee") {
      if (!isEmployeeRoute) {
        return NextResponse.redirect(new URL("/attendance", request.url));
      }
      return NextResponse.next();
    }

    if (primaryRole === "sales_agent") {
      if (!isSalesRoute && !isAgentRoute) {
        return NextResponse.redirect(new URL("/crm", request.url));
      }
      return NextResponse.next();
    }

    if (primaryRole === "support_agent") {
      if (!isSupportRoute && !isAgentRoute) {
        return NextResponse.redirect(new URL("/tickets", request.url));
      }
      return NextResponse.next();
    }

    if (primaryRole === "hr_agent") {
      if (!isHrRoute && !isAgentRoute) {
        return NextResponse.redirect(new URL("/hr", request.url));
      }
      return NextResponse.next();
    }

    if (primaryRole === "agent") {
      if (!isAgentRoute && !isSupportRoute && !isSalesRoute) {
        return NextResponse.redirect(new URL("/agent/dashboard", request.url));
      }
      return NextResponse.next();
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
    "/((?!api|_next/static|_next/image|favicon.ico|favicon.png|.*\\..*).*)",
  ],
};
