import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "success" | "warning" | "danger" | "info" | "purple";
}

const variantClasses = {
  default: "bg-gray-800 text-gray-300 border-gray-700",
  success: "bg-green-950 text-green-400 border-green-800",
  warning: "bg-yellow-950 text-yellow-400 border-yellow-800",
  danger: "bg-red-950 text-red-400 border-red-800",
  info: "bg-blue-950 text-blue-400 border-blue-800",
  purple: "bg-purple-950 text-purple-400 border-purple-800",
};

export function Badge({
  children,
  className,
  variant = "default",
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border",
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
