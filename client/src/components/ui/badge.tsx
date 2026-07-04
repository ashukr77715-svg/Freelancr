import { cn } from "@/lib/utils";

const statusStyles: Record<string, string> = {
  // shared status → color mapping across invoices/proposals/clients
  DRAFT: "bg-secondary text-secondary-foreground",
  SENT: "bg-blue-100 text-blue-700",
  PAID: "bg-green-100 text-green-700",
  ACCEPTED: "bg-green-100 text-green-700",
  ACTIVE: "bg-green-100 text-green-700",
  OVERDUE: "bg-red-100 text-red-700",
  REJECTED: "bg-red-100 text-red-700",
  INACTIVE: "bg-gray-200 text-gray-600",
};

export function Badge({
  children,
  status,
  className,
}: {
  children: React.ReactNode;
  status?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        status ? statusStyles[status] ?? "bg-secondary" : "bg-secondary",
        className
      )}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const label = status.charAt(0) + status.slice(1).toLowerCase();
  return <Badge status={status}>{label}</Badge>;
}
