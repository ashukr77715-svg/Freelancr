import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  ExternalLink,
  Loader2,
  Pencil,
  Send,
  Trash2,
} from "lucide-react";
import { api, ApiRequestError } from "@/lib/api";
import { formatDate, formatMoney } from "@/lib/format";
import type { Invoice } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [razorpayConfigured, setRazorpayConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api<{ invoice: Invoice; razorpayConfigured: boolean }>(
        `/api/invoices/${id}`
      );
      setInvoice(data.invoice);
      setRazorpayConfigured(data.razorpayConfigured);
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : "Failed to load invoice");
      navigate("/invoices");
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    load();
  }, [load]);

  async function send() {
    if (!invoice) return;
    setSending(true);
    try {
      const data = await api<{ invoice: Invoice; paymentLinkCreated: boolean }>(
        `/api/invoices/${invoice.id}/send`,
        { method: "POST" }
      );
      setInvoice(data.invoice);
      toast.success(
        data.paymentLinkCreated
          ? "Invoice emailed with payment link"
          : "Invoice emailed (add Razorpay keys for payment links)"
      );
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : "Send failed");
    } finally {
      setSending(false);
    }
  }

  async function markPaid() {
    if (!invoice) return;
    if (!window.confirm("Mark this invoice as paid (offline payment)?")) return;
    try {
      const data = await api<{ invoice: Invoice }>(
        `/api/invoices/${invoice.id}/mark-paid`,
        { method: "POST" }
      );
      setInvoice(data.invoice);
      toast.success("Invoice marked as paid");
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : "Update failed");
    }
  }

  async function remove() {
    if (!invoice) return;
    if (!window.confirm(`Delete invoice ${invoice.invoiceNumber}? This cannot be undone.`)) return;
    try {
      await api(`/api/invoices/${invoice.id}`, { method: "DELETE" });
      toast.success("Invoice deleted");
      navigate("/invoices");
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : "Delete failed");
    }
  }

  if (loading || !invoice) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const gstRate = Number(invoice.gstRate);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/invoices")} aria-label="Back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">
                {invoice.invoiceNumber}
              </h1>
              <StatusBadge status={invoice.status} />
              {invoice.isRecurring && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  {invoice.recurringInterval === "MONTHLY"
                    ? "Monthly"
                    : invoice.recurringInterval === "QUARTERLY"
                      ? "Quarterly"
                      : "Yearly"}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              For{" "}
              <Link to={`/clients/${invoice.client.id}`} className="text-primary hover:underline">
                {invoice.client.name}
              </Link>
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(`/api/invoices/${invoice.id}/pdf`, "_blank")}
          >
            <Download className="h-4 w-4" /> PDF
          </Button>
          {invoice.status !== "PAID" && (
            <>
              <Button variant="outline" size="sm" onClick={() => navigate(`/invoices/${invoice.id}/edit`)}>
                <Pencil className="h-4 w-4" /> Edit
              </Button>
              <Button size="sm" onClick={send} disabled={sending}>
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                {invoice.sentAt ? "Resend" : "Send to client"}
              </Button>
              <Button variant="outline" size="sm" onClick={markPaid}>
                <CheckCircle2 className="h-4 w-4 text-green-600" /> Mark paid
              </Button>
              <Button variant="ghost" size="sm" onClick={remove} aria-label="Delete">
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </>
          )}
        </div>
      </div>

      {invoice.status !== "PAID" && !razorpayConfigured && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          <strong>Razorpay not configured:</strong> add <code>RAZORPAY_KEY_ID</code> and{" "}
          <code>RAZORPAY_KEY_SECRET</code> to <code>server/.env</code> to include payment
          links when sending invoices.
        </div>
      )}

      {invoice.paymentLinkUrl && invoice.status !== "PAID" && (
        <div className="flex items-center justify-between gap-2 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
          <span>Payment link is active for this invoice.</span>
          <a
            href={invoice.paymentLinkUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 font-medium underline"
          >
            Open link <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Issue date</p>
            <p className="font-medium">{formatDate(invoice.issueDate)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Due date</p>
            <p className="font-medium">{formatDate(invoice.dueDate)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">
              {invoice.status === "PAID" ? "Paid on" : "Total due"}
            </p>
            <p className="font-medium">
              {invoice.status === "PAID"
                ? formatDate(invoice.paidAt)
                : formatMoney(invoice.total, invoice.currency)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Line items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                  <th className="py-2 font-medium">Description</th>
                  <th className="py-2 text-right font-medium">Qty</th>
                  <th className="py-2 text-right font-medium">Rate</th>
                  <th className="py-2 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {(invoice.items ?? []).map((item) => (
                  <tr key={item.id} className="border-b last:border-0">
                    <td className="py-2.5">{item.description}</td>
                    <td className="py-2.5 text-right">{Number(item.quantity)}</td>
                    <td className="py-2.5 text-right">{formatMoney(item.rate, invoice.currency)}</td>
                    <td className="py-2.5 text-right font-medium">{formatMoney(item.amount, invoice.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="ml-auto mt-4 max-w-xs space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatMoney(invoice.subtotal, invoice.currency)}</span>
            </div>
            {invoice.gstType === "CGST_SGST" && (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">CGST ({gstRate / 2}%)</span>
                  <span>{formatMoney(invoice.cgstAmount, invoice.currency)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">SGST ({gstRate / 2}%)</span>
                  <span>{formatMoney(invoice.sgstAmount, invoice.currency)}</span>
                </div>
              </>
            )}
            {invoice.gstType === "IGST" && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">IGST ({gstRate}%)</span>
                <span>{formatMoney(invoice.igstAmount, invoice.currency)}</span>
              </div>
            )}
            <div className="flex justify-between border-t pt-2 font-semibold">
              <span>Total</span>
              <span>{formatMoney(invoice.total, invoice.currency)}</span>
            </div>
          </div>

          {invoice.notes && (
            <p className="mt-4 border-t pt-3 text-sm text-muted-foreground">
              {invoice.notes}
            </p>
          )}
        </CardContent>
      </Card>

      {(invoice.payments ?? []).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {invoice.payments!.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-md border p-3 text-sm"
              >
                <div>
                  <p className="font-medium">
                    {formatMoney(p.amount, invoice.currency)}{" "}
                    <span className="font-normal text-muted-foreground">
                      via {p.method === "manual" ? "offline payment" : p.method ?? "Razorpay"}
                    </span>
                  </p>
                  {p.razorpayPaymentId && (
                    <p className="text-xs text-muted-foreground">
                      Txn: {p.razorpayPaymentId}
                    </p>
                  )}
                </div>
                <span className="text-muted-foreground">{formatDate(p.paidAt)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
