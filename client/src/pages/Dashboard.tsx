import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  CheckCircle2,
  FileText,
  IndianRupee,
  Loader2,
  Receipt,
  Send,
  UserPlus,
  Users,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { formatMoney, formatMoneyList, formatRelative } from "@/lib/format";
import type { DashboardSummary } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

function activityIcon(type: string) {
  if (type.startsWith("invoice.paid")) return <CheckCircle2 className="h-4 w-4 text-green-600" />;
  if (type.startsWith("invoice.sent") || type.startsWith("proposal.sent"))
    return <Send className="h-4 w-4 text-blue-600" />;
  if (type.startsWith("invoice")) return <Receipt className="h-4 w-4 text-muted-foreground" />;
  if (type.startsWith("proposal")) return <FileText className="h-4 w-4 text-muted-foreground" />;
  if (type.startsWith("client")) return <UserPlus className="h-4 w-4 text-muted-foreground" />;
  return <FileText className="h-4 w-4 text-muted-foreground" />;
}

function RevenueChart({
  data,
  currency,
}: {
  data: Array<{ month: string; amount: number }>;
  currency: string;
}) {
  const max = Math.max(...data.map((d) => d.amount), 1);
  const hasData = data.some((d) => d.amount > 0);

  if (!hasData) {
    return (
      <div className="flex h-48 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
        Chart appears once you have paid invoices
      </div>
    );
  }

  return (
    <div className="flex h-48 items-end justify-between gap-2 pt-4">
      {data.map((d) => (
        <div key={d.month} className="flex flex-1 flex-col items-center gap-1.5">
          <span className="text-[10px] font-medium text-muted-foreground">
            {d.amount > 0 ? formatMoney(d.amount, currency) : ""}
          </span>
          <div
            className="w-full max-w-12 rounded-t-md bg-primary/80 transition-all"
            style={{ height: `${Math.max((d.amount / max) * 140, d.amount > 0 ? 6 : 2)}px` }}
            title={`${d.month}: ${formatMoney(d.amount, currency)}`}
          />
          <span className="text-xs text-muted-foreground">{d.month}</span>
        </div>
      ))}
    </div>
  );
}

export function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<DashboardSummary>("/api/dashboard/summary")
      .then(setSummary)
      .catch(() => toast.error("Failed to load dashboard"))
      .finally(() => setLoading(false));
  }, []);

  const firstName = user?.name?.split(" ")[0] ?? "there";

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const cards = [
    {
      label: "Revenue (this month)",
      value: formatMoneyList(summary?.revenue.thisMonth),
      sub: `${formatMoneyList(summary?.revenue.allTime)} all-time`,
      icon: IndianRupee,
    },
    {
      label: "Pending invoices",
      value: String(summary?.pendingInvoices.count ?? 0),
      sub: `${formatMoneyList(summary?.pendingInvoices.amounts)} outstanding`,
      icon: Receipt,
    },
    {
      label: "Active clients",
      value: String(summary?.activeClients ?? 0),
      sub: summary?.activeClients ? "across your business" : "No clients yet",
      icon: Users,
    },
    {
      label: "Proposals this month",
      value: String(summary?.proposalsThisMonth ?? 0),
      sub: summary?.proposalsThisMonth ? "keep them coming" : "No proposals yet",
      icon: FileText,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Hey {firstName} 👋</h1>
          <p className="text-muted-foreground">
            Here's what's happening with {user?.businessName ?? "your business"}.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate("/proposals/new")}>
            New proposal
          </Button>
          <Button size="sm" onClick={() => navigate("/invoices/new")}>
            New invoice
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.label}
              </CardTitle>
              <card.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground">{card.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Revenue — last 6 months
              {summary && summary.revenue.allTime.length > 1 && (
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  ({summary.chartCurrency})
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RevenueChart
              data={summary?.revenueByMonth ?? []}
              currency={summary?.chartCurrency ?? "INR"}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent activity</CardTitle>
          </CardHeader>
          <CardContent>
            {!summary?.activity.length ? (
              <div className="flex h-48 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
                Activity shows up here as you work
              </div>
            ) : (
              <ul className="space-y-3">
                {summary.activity.map((entry) => (
                  <li key={entry.id} className="flex items-start gap-3 text-sm">
                    <span className="mt-0.5">{activityIcon(entry.type)}</span>
                    <span className="flex-1">{entry.message}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatRelative(entry.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {summary?.activeClients === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-8 text-center">
            <p className="font-medium">Get started in 3 steps</p>
            <p className="max-w-md text-sm text-muted-foreground">
              1. <Link to="/clients" className="text-primary underline">Add a client</Link> · 2.{" "}
              <Link to="/proposals/new" className="text-primary underline">Generate a proposal</Link> · 3.{" "}
              <Link to="/invoices/new" className="text-primary underline">Send your first invoice</Link>
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
