import * as React from "react";
import { cn } from "../../lib/utils";

export function Button({ className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-xl bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800 active:scale-[0.99] transition",
        className
      )}
      {...props}
    />
  );
}
