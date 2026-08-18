import * as React from "react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col justify-center bg-zinc-50 dark:bg-zinc-950 font-sans">
      {children}
    </div>
  );
}
