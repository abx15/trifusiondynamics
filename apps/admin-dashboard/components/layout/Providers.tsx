"use client";

import * as React from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";
import { Toaster } from "@/components/ui/toaster";
import { useAuthStore } from "@/lib/auth-store";

export function Providers({ children }: { children: React.ReactNode }) {
  const hasHydrated = React.useRef(false);

  React.useEffect(() => {
    if (!hasHydrated.current) {
      useAuthStore.getState().hydrateFromStorage();
      hasHydrated.current = true;
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster />
    </QueryClientProvider>
  );
}

export default Providers;
