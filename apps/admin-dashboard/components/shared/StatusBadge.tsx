"use client";

import * as React from "react";

type StatusVariant =
  | "NEW"
  | "CONTACTED"
  | "QUALIFIED"
  | "PROPOSAL"
  | "NEGOTIATION"
  | "WON"
  | "LOST"
  | "DRAFT"
  | "SENT"
  | "VIEWED"
  | "PAID"
  | "OVERDUE"
  | "CANCELLED"
  | "ACCEPTED"
  | "REJECTED"
  | "EXPIRED"
  | "APPROVED"
  | "PLANNING"
  | "ACTIVE"
  | "ON_HOLD"
  | "COMPLETED"
  | "TODO"
  | "IN_PROGRESS"
  | "IN_REVIEW"
  | "DONE"
  | "LOW"
  | "MEDIUM"
  | "HIGH"
  | "URGENT"
  | string;

const VARIANT_MAP: Record<string, string> = {
  // Lead stages
  NEW: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  CONTACTED: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  QUALIFIED: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300",
  PROPOSAL: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  NEGOTIATION: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  WON: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  LOST: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  // Invoice / Quote / Estimate statuses
  DRAFT: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  SENT: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  VIEWED: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  PAID: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  OVERDUE: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  CANCELLED: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-500",
  ACCEPTED: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  APPROVED: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  REJECTED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  EXPIRED: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  // Project statuses
  PLANNING: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  ACTIVE: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  ON_HOLD: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  COMPLETED: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
  // Task statuses
  TODO: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  IN_PROGRESS: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  IN_REVIEW: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  DONE: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  // Priority
  LOW: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  MEDIUM: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  HIGH: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  URGENT: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

const LABEL_MAP: Record<string, string> = {
  ON_HOLD: "On Hold",
  IN_PROGRESS: "In Progress",
  IN_REVIEW: "In Review",
};

interface StatusBadgeProps {
  status: StatusVariant;
  size?: "sm" | "md";
}

export function StatusBadge({ status, size = "sm" }: StatusBadgeProps) {
  const colorClass =
    VARIANT_MAP[status] ??
    "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400";
  const label = LABEL_MAP[status] ?? status.replace(/_/g, " ");

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full tracking-wide ${
        size === "sm"
          ? "text-[10px] px-2 py-0.5"
          : "text-xs px-2.5 py-1"
      } ${colorClass}`}
    >
      {label}
    </span>
  );
}

export default StatusBadge;
