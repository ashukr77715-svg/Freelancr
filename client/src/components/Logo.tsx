import { cn } from "@/lib/utils";

/**
 * freelancr wordmark, recreated as text so it stays crisp at any size.
 * To use the original artwork instead, drop the PNG in client/public/ and
 * swap this for an <img>.
 */
export function Logo({
  className,
  withTagline = false,
}: {
  className?: string;
  withTagline?: boolean;
}) {
  return (
    <span className={cn("inline-flex flex-col leading-none", className)}>
      <span className="text-xl font-extrabold tracking-tight">
        <span className="text-foreground">free</span>
        <span className="text-primary">lancr</span>
      </span>
      {withTagline && (
        <span className="mt-0.5 text-[10px] font-semibold tracking-wide text-muted-foreground">
          Freelance Ka Boss
        </span>
      )}
    </span>
  );
}
