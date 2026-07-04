import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { BadgeCheck, Check, Crown, ExternalLink, Loader2, RefreshCw } from "lucide-react";
import { api, ApiRequestError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type PlanId = "STARTER" | "PRO" | "AGENCY";
type Cycle = "MONTHLY" | "YEARLY";

interface BillingInfo {
  plan: PlanId;
  cycle: Cycle | null;
  renewsAt: string | null;
  limits: {
    clients: number | null;
    proposalsPerMonth: number | null;
    invoicesPerMonth: number | null;
    paymentLinks: boolean;
  };
  usage: { clients: number; proposalsThisMonth: number; invoicesThisMonth: number };
  razorpayConfigured: boolean;
  pendingOrder: {
    id: string;
    plan: PlanId;
    cycle: Cycle;
    amount: string;
    linkUrl: string | null;
  } | null;
}

const planCatalog: Array<{
  id: PlanId;
  name: string;
  monthly: number;
  yearlyPerMonth: number;
  features: string[];
  highlighted?: boolean;
}> = [
  {
    id: "STARTER",
    name: "Starter",
    monthly: 0,
    yearlyPerMonth: 0,
    features: ["Up to 3 clients", "5 AI proposals/month", "5 invoices/month", "Basic dashboard"],
  },
  {
    id: "PRO",
    name: "Pro",
    monthly: 499,
    yearlyPerMonth: 399,
    features: [
      "Unlimited clients",
      "50 AI proposals/month",
      "Unlimited invoices",
      "Razorpay payment collection",
      "Priority support",
    ],
    highlighted: true,
  },
  {
    id: "AGENCY",
    name: "Agency",
    monthly: 1499,
    yearlyPerMonth: 1199,
    features: [
      "Everything in Pro",
      "Unlimited AI proposals",
      "Team members (up to 5 seats)",
      "Custom branding on documents",
      "Dedicated account support",
    ],
  },
];

function UsageBar({
  label,
  used,
  limit,
}: {
  label: string;
  used: number;
  limit: number | null;
}) {
  const pct = limit === null ? 0 : Math.min((used / limit) * 100, 100);
  const near = limit !== null && used >= limit;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className={cn("font-medium", near && "text-destructive")}>
          {used} / {limit === null ? "∞" : limit}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-secondary">
        <div
          className={cn("h-full rounded-full bg-primary transition-all", near && "bg-destructive")}
          style={{ width: limit === null ? "4%" : `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function BillingPage() {
  const { refreshUser } = useAuth();
  const [searchParams] = useSearchParams();
  const [info, setInfo] = useState<BillingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [yearly, setYearly] = useState(searchParams.get("cycle") === "YEARLY");
  const [upgrading, setUpgrading] = useState<PlanId | null>(null);
  const [verifying, setVerifying] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api<BillingInfo>("/api/billing/me");
      setInfo(data);
    } catch {
      toast.error("Failed to load billing info");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Deep-link from the landing pricing section (?plan=PRO&cycle=YEARLY)
  useEffect(() => {
    const plan = searchParams.get("plan");
    if (plan === "PRO" || plan === "AGENCY") {
      toast.info(`Upgrade to ${plan === "PRO" ? "Pro" : "Agency"} — pick your billing cycle below.`);
    }
  }, [searchParams]);

  async function upgrade(plan: PlanId) {
    if (plan === "STARTER") return;
    setUpgrading(plan);
    try {
      const data = await api<{ order: { id: string; linkUrl: string } }>(
        "/api/billing/upgrade",
        { method: "POST", body: { plan, cycle: yearly ? "YEARLY" : "MONTHLY" } }
      );
      window.open(data.order.linkUrl, "_blank");
      await load();
      toast.info("Complete the payment in the new tab, then click 'Verify payment' here.");
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : "Could not start upgrade");
    } finally {
      setUpgrading(null);
    }
  }

  async function verify() {
    if (!info?.pendingOrder) return;
    setVerifying(true);
    try {
      const result = await api<{ activated: boolean; linkStatus?: string }>(
        `/api/billing/verify/${info.pendingOrder.id}`,
        { method: "POST" }
      );
      if (result.activated) {
        toast.success("Plan activated — welcome aboard! 🎉");
        await refreshUser();
        await load();
      } else {
        toast.info(
          `Payment abhi ${result.linkStatus === "created" ? "pending" : result.linkStatus} hai — pay karne ke baad dobara verify karo.`
        );
      }
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : "Verification failed");
    } finally {
      setVerifying(false);
    }
  }

  if (loading || !info) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const currentPlanName = planCatalog.find((p) => p.id === info.plan)?.name ?? info.plan;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Plan &amp; Billing</h1>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Crown className="h-4 w-4 text-primary" /> Current plan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-display text-2xl font-bold">
              {currentPlanName}
              {info.cycle && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({info.cycle.toLowerCase()})
                </span>
              )}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {info.plan === "STARTER"
                ? "Free forever — upgrade jab ready ho."
                : `Renews on ${formatDate(info.renewsAt)}`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Usage this month</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <UsageBar label="Clients" used={info.usage.clients} limit={info.limits.clients} />
            <UsageBar
              label="AI proposals"
              used={info.usage.proposalsThisMonth}
              limit={info.limits.proposalsPerMonth}
            />
            <UsageBar
              label="Invoices"
              used={info.usage.invoicesThisMonth}
              limit={info.limits.invoicesPerMonth}
            />
          </CardContent>
        </Card>
      </div>

      {info.pendingOrder && (
        <Card className="border-primary/40 bg-primary/5">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
            <div>
              <p className="text-sm font-semibold">
                Pending upgrade: {info.pendingOrder.plan} ({info.pendingOrder.cycle.toLowerCase()})
                — ₹{Number(info.pendingOrder.amount).toLocaleString("en-IN")}
              </p>
              <p className="text-xs text-muted-foreground">
                Payment complete kiya? Verify karo aur plan turant activate ho jayega.
              </p>
            </div>
            <div className="flex gap-2">
              {info.pendingOrder.linkUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(info.pendingOrder!.linkUrl!, "_blank")}
                >
                  <ExternalLink className="h-4 w-4" /> Pay now
                </Button>
              )}
              <Button size="sm" onClick={verify} disabled={verifying}>
                {verifying ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Verify payment
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All plans</CardTitle>
          <CardDescription className="flex items-center gap-3">
            <span>Billing:</span>
            <button
              role="switch"
              aria-checked={yearly}
              onClick={() => setYearly((y) => !y)}
              className={cn(
                "relative h-5 w-9 rounded-full transition-colors",
                yearly ? "bg-primary" : "bg-muted-foreground/25"
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all",
                  yearly ? "left-[18px]" : "left-0.5"
                )}
              />
            </button>
            <span>
              {yearly ? "Yearly" : "Monthly"}
              {yearly && (
                <span className="ml-1.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                  Save 20%
                </span>
              )}
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-3">
          {planCatalog.map((plan) => {
            const isCurrent = info.plan === plan.id;
            const perMonth = yearly ? plan.yearlyPerMonth : plan.monthly;
            const isDowngrade =
              planCatalog.findIndex((p) => p.id === plan.id) <
              planCatalog.findIndex((p) => p.id === info.plan);
            return (
              <div
                key={plan.id}
                className={cn(
                  "relative flex flex-col rounded-xl border p-5",
                  plan.highlighted && !isCurrent && "border-primary/40 ring-1 ring-primary/20",
                  isCurrent && "border-primary bg-primary/5"
                )}
              >
                {isCurrent && (
                  <span className="absolute -top-2.5 left-4 inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                    <BadgeCheck className="h-3 w-3" /> CURRENT
                  </span>
                )}
                <p className="font-display font-bold">{plan.name}</p>
                <p className="mt-1">
                  <span className="font-display text-2xl font-bold">
                    {perMonth === 0 ? "Free" : `₹${perMonth}`}
                  </span>
                  {perMonth > 0 && <span className="text-xs text-muted-foreground">/month</span>}
                </p>
                {perMonth > 0 && yearly && (
                  <p className="text-[11px] text-muted-foreground">
                    ₹{(perMonth * 12).toLocaleString("en-IN")} billed yearly
                  </p>
                )}
                <ul className="mt-4 flex-1 space-y-1.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" /> {f}
                    </li>
                  ))}
                </ul>
                <Button
                  className="mt-5 w-full"
                  size="sm"
                  variant={plan.highlighted && !isCurrent ? "default" : "outline"}
                  disabled={isCurrent || isDowngrade || plan.id === "STARTER" || upgrading !== null}
                  onClick={() => upgrade(plan.id)}
                >
                  {upgrading === plan.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : isCurrent ? (
                    "Current plan"
                  ) : isDowngrade || plan.id === "STARTER" ? (
                    "Included below your plan"
                  ) : (
                    `Upgrade to ${plan.name}`
                  )}
                </Button>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground">
        Payments are processed securely by Razorpay. Plan activates instantly after payment
        verification. Prices in INR, GST extra.
      </p>
    </div>
  );
}
