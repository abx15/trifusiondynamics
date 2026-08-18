"use client";

import * as React from "react";

interface DropdownContextProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const DropdownContext = React.createContext<DropdownContextProps | undefined>(undefined);

export function DropdownMenu({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <DropdownContext.Provider value={{ isOpen, setIsOpen }}>
      <div className="relative inline-block text-left" ref={ref}>
        {children}
      </div>
    </DropdownContext.Provider>
  );
}

export function DropdownMenuTrigger({ children, asChild, ...props }: any) {
  const context = React.useContext(DropdownContext);
  if (!context) throw new Error("DropdownMenuTrigger must be used inside DropdownMenu");

  return (
    <div
      onClick={() => context.setIsOpen(!context.isOpen)}
      className="cursor-pointer inline-flex"
      {...props}
    >
      {children}
    </div>
  );
}

export function DropdownMenuContent({ children, className = "", ...props }: any) {
  const context = React.useContext(DropdownContext);
  if (!context) throw new Error("DropdownMenuContent must be used inside DropdownMenu");
  if (!context.isOpen) return null;

  return (
    <div
      onClick={() => context.setIsOpen(false)}
      className={`absolute right-0 z-50 mt-2 w-56 origin-top-right rounded-md border border-border bg-card p-1 text-card-foreground shadow-md focus:outline-none ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function DropdownMenuItem({ children, className = "", onClick, ...props }: any) {
  return (
    <button
      onClick={onClick}
      className={`relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm text-foreground outline-none transition-colors hover:bg-secondary hover:text-secondary-foreground text-left ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function DropdownMenuLabel({ children, className = "", ...props }: any) {
  return (
    <div
      className={`px-2 py-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function DropdownMenuSeparator({ className = "", ...props }: any) {
  return <div className={`-mx-1 my-1 h-px bg-border ${className}`} {...props} />;
}
