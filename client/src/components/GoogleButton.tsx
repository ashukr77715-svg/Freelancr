import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";

function GoogleG() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path
        fill="#4285F4"
        d="M23.5 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.45a5.52 5.52 0 0 1-2.39 3.62v3h3.87c2.26-2.09 3.57-5.17 3.57-8.81Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.93-2.91l-3.87-3c-1.07.72-2.44 1.14-4.06 1.14-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.27a7.2 7.2 0 0 1 0-4.54V6.64H1.29a12 12 0 0 0 0 10.72l3.98-3.09Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.76 0 3.34.61 4.59 1.8l3.44-3.44A11.97 11.97 0 0 0 1.29 6.64l3.98 3.09C6.22 6.88 8.87 4.77 12 4.77Z"
      />
    </svg>
  );
}

/**
 * Brand-styled Google sign-in. Redirects into the server-side OAuth flow;
 * if GOOGLE_CLIENT_ID/SECRET aren't configured yet, explains instead.
 */
export function GoogleButton({ label = "Continue with Google" }: { label?: string }) {
  const [available, setAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    api<{ google: boolean }>("/api/auth/providers")
      .then((d) => setAvailable(d.google))
      .catch(() => setAvailable(false));
  }, []);

  function onClick() {
    if (available === false) {
      toast.info(
        "Google login needs GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in the server config."
      );
      return;
    }
    window.location.href = "/api/auth/google";
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="w-full gap-2.5 bg-card font-medium transition-transform hover:scale-[1.01]"
        onClick={onClick}
      >
        <GoogleG />
        {label}
      </Button>
      <div className="my-4 flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">ya phir email se</span>
        <span className="h-px flex-1 bg-border" />
      </div>
    </>
  );
}
