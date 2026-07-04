import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, Plus, Receipt } from "lucide-react";
import { api } from "@/lib/api";
import { formatDate, formatMoney } from "@/lib/format";
import type { Invoice } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export function InvoicesPage() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");

  const load = useCallback(async () => {
    const params = statusFilter ? `?status=${statusFilter}` : "";
    try {
      const data = await api<{ invoices: Invoice[] }>(`/api/invoices${params}`);
      setInvoices(data.invoices);
    } catch {
      toast.error("Failed to load invoices");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Invoices</h1>
        <Button onClick={() => navigate("/invoices/new")}>
          <Plus className="h-4 w-4" /> New invoice
        </Button>
      </div>

      <Select
        className="w-full sm:w-44"
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value)}
      >
        <option value="">All statuses</option>
        <option value="DRAFT">Draft</option>
        <option value="SENT">Sent</option>
        <option value="PAID">Paid</option>
        <option value="OVERDUE">Overdue</option>
      </Select>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : invoices.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <Receipt className="h-10 w-10 text-muted-foreground/50" />
            <p className="font-medium">No invoices{statusFilter ? " with this status" : " yet"}</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Create a GST-ready invoice with line items, download it as a PDF, and
              send it with a payment link.
            </p>
            <Button onClick={() => navigate("/invoices/new")}>
              <Plus className="h-4 w-4" /> Create invoice
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <th className="px-4 py-3 font-medium">Invoice</th>
                <th className="px-4 py-3 font-medium">Client</th>
                <th className="hidden px-4 py-3 font-medium sm:table-cell">Issued</th>
                <th className="hidden px-4 py-3 font-medium sm:table-cell">Due</th>
                <th className="px-4 py-3 text-right font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr
                  key={inv.id}
                  className="cursor-pointer border-b last:border-0 hover:bg-accent"
                  onClick={() => navigate(`/invoices/${inv.id}`)}
                >
                  <td className="px-4 py-3 font-medium">
                    <Link to={`/invoices/${inv.id}`} className="hover:underline" onClick={(e) => e.stopPropagation()}>
                      {inv.invoiceNumber}
                    </Link>
                    {inv.isRecurring && (
                      <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                        {inv.recurringInterval === "MONTHLY"
                          ? "Monthly"
                          : inv.recurringInterval === "QUARTERLY"
                            ? "Quarterly"
                            : "Yearly"}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">{inv.client.name}</td>
                  <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                    {formatDate(inv.issueDate)}
                  </td>
                  <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                    {formatDate(inv.dueDate)}
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    {formatMoney(inv.total, inv.currency)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={inv.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
