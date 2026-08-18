import * as React from "react";

const Avatar = ({
  className = "",
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={`relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full border border-border bg-muted ${className}`}
    {...props}
  >
    {children}
  </div>
);

const AvatarImage = ({
  className = "",
  src,
  alt = "",
  ...props
}: React.ImgHTMLAttributes<HTMLImageElement>) => (
  // eslint-disable-next-line @next/next/no-img-element
  <img
    src={src}
    alt={alt}
    className={`aspect-square h-full w-full object-cover ${className}`}
    {...props}
  />
);

const AvatarFallback = ({
  className = "",
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={`flex h-full w-full items-center justify-center rounded-full bg-[#f4f4f5] dark:bg-[#27272a] text-xs font-medium text-slate-500 uppercase ${className}`}
    {...props}
  >
    {children}
  </div>
);

export { Avatar, AvatarImage, AvatarFallback };
