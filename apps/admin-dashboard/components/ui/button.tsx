import * as React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "default", size = "default", ...props }, ref) => {
    let baseStyles = "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0";
    
    let variantStyles = "";
    switch (variant) {
      case "default":
        variantStyles = "bg-primary text-primary-foreground shadow hover:bg-primary/90";
        break;
      case "destructive":
        variantStyles = "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90";
        break;
      case "outline":
        variantStyles = "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground";
        break;
      case "secondary":
        variantStyles = "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80";
        break;
      case "ghost":
        variantStyles = "hover:bg-accent hover:text-accent-foreground";
        break;
      case "link":
        variantStyles = "text-primary underline-offset-4 hover:underline";
        break;
    }

    let sizeStyles = "";
    switch (size) {
      case "default":
        sizeStyles = "h-9 px-4 py-2";
        break;
      case "sm":
        sizeStyles = "h-8 rounded-md px-3 text-xs";
        break;
      case "lg":
        sizeStyles = "h-10 rounded-md px-8";
        break;
      case "icon":
        sizeStyles = "h-9 w-9";
        break;
    }

    return (
      <button
        className={`${baseStyles} ${variantStyles} ${sizeStyles} ${className}`}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };
