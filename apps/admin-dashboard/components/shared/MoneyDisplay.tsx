"use client";

import * as React from "react";

interface MoneyDisplayProps {
  amount: number | undefined | null;
  currency?: string;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

export function MoneyDisplay({
  amount,
  currency = "INR",
  className = "",
  size = "md",
}: MoneyDisplayProps) {
  const formatted = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(amount ?? 0);

  const sizeClass = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base font-semibold",
    xl: "text-xl font-bold",
  }[size];

  return (
    <span className={`font-mono tabular-nums ${sizeClass} ${className}`}>
      {formatted}
    </span>
  );
}

export default MoneyDisplay;
