import * as React from "react";
import { cn } from "../../lib/utils";


export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}
export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => (
<input
type={type}
className={cn(
"flex h-10 w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm",
"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
className
)}
ref={ref}
{...props}
/>
));
Input.displayName = "Input";
