import * as React from "react";
import { cn } from "../../lib/utils";


export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
variant?: "default" | "secondary" | "destructive" | "ghost";
size?: "sm" | "default" | "lg";
}
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
({ className, variant = "default", size = "default", ...props }, ref) => {
const base = "inline-flex items-center justify-center rounded-2xl font-medium transition-colors";
const variants = {
default: "bg-indigo-600 text-white hover:bg-indigo-700",
secondary: "bg-gray-100 text-gray-900 hover:bg-gray-200",
destructive: "bg-red-600 text-white hover:bg-red-700",
ghost: "bg-transparent hover:bg-gray-100",
} as const;
const sizes = { sm: "h-8 px-3 text-sm", default: "h-10 px-4 text-sm", lg: "h-12 px-6 text-base" } as const;
return <button ref={ref} className={cn(base, variants[variant], sizes[size], className)} {...props} />;
}
);
Button.displayName = "Button";
