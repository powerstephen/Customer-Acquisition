import * as React from "react";
import { cn } from "../../lib/utils";


export function Tabs({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
return <div className={cn("space-y-3", className)} {...props} />;
}
export function TabsList({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
return <div className={cn("grid grid-cols-5 gap-2", className)} {...props} />;
}
export function TabsTrigger({ className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
return (
<button
className={cn(
"h-10 rounded-2xl border bg-white px-3 text-sm font-medium shadow-sm",
"data-[state=active]:bg-indigo-600 data-[state=active]:text-white",
className
)}
{...props}
/>
);
}
export function TabsContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
return <div className={cn("", className)} {...props} />;
}
