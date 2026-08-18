"use client";

import { useToastStore } from "@/lib/toast";
import { X, CheckCircle, AlertCircle, Info } from "lucide-react";

export function Toaster() {
  const { toasts, dismissToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-full max-w-sm">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-start justify-between gap-3 rounded-lg border p-4 shadow-lg bg-[#ffffff] dark:bg-[#09090b] text-sm animate-in fade-in slide-in-from-bottom-5 duration-200 ${
            t.type === "success"
              ? "border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
              : t.type === "error"
              ? "border-rose-500/20 text-rose-600 dark:text-rose-400"
              : "border-border text-foreground"
          }`}
        >
          <div className="flex gap-2">
            {t.type === "success" && <CheckCircle className="h-5 w-5 shrink-0" />}
            {t.type === "error" && <AlertCircle className="h-5 w-5 shrink-0" />}
            {t.type === "info" && <Info className="h-5 w-5 shrink-0" />}
            <span>{t.message}</span>
          </div>
          <button
            onClick={() => dismissToast(t.id)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
