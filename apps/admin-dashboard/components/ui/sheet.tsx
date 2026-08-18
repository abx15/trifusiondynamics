"use client";

import * as React from "react";

interface SheetContextProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const SheetContext = React.createContext<SheetContextProps | undefined>(undefined);

export function Sheet({
  children,
  open,
  onOpenChange,
}: {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [isOpen, setIsOpen] = React.useState(open || false);

  React.useEffect(() => {
    if (open !== undefined) setIsOpen(open);
  }, [open]);

  const handleOpenChange = (val: boolean) => {
    setIsOpen(val);
    if (onOpenChange) onOpenChange(val);
  };

  return (
    <SheetContext.Provider value={{ isOpen, setIsOpen: handleOpenChange }}>
      {children}
    </SheetContext.Provider>
  );
}

export function SheetTrigger({ children }: any) {
  const context = React.useContext(SheetContext);
  if (!context) throw new Error("SheetTrigger must be used inside Sheet");

  return (
    <div onClick={() => context.setIsOpen(true)} className="cursor-pointer inline-flex">
      {children}
    </div>
  );
}

export function SheetContent({ children, className = "", ...props }: any) {
  const context = React.useContext(SheetContext);
  if (!context) throw new Error("SheetContent must be used inside Sheet");
  if (!context.isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex bg-black/40 backdrop-blur-xs">
      {/* Overlay Backdrop click close */}
      <div className="fixed inset-0" onClick={() => context.setIsOpen(false)} />
      <div
        className={`fixed inset-y-0 left-0 z-50 h-full w-[280px] border-r border-border bg-[#ffffff] dark:bg-[#09090b] p-6 shadow-xl transition-all duration-200 flex flex-col justify-between ${className}`}
        {...props}
      >
        {children}
      </div>
    </div>
  );
}

export function SheetHeader({ className = "", children, ...props }: any) {
  return (
    <div className={`flex flex-col space-y-2 text-left ${className}`} {...props}>
      {children}
    </div>
  );
}

export function SheetTitle({ className = "", children, ...props }: any) {
  return (
    <h2 className={`text-base font-semibold text-foreground ${className}`} {...props}>
      {children}
    </h2>
  );
}

export function SheetDescription({ className = "", children, ...props }: any) {
  return (
    <p className={`text-xs text-slate-500 leading-normal ${className}`} {...props}>
      {children}
    </p>
  );
}
