import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { api, ApiRequestError } from "@/lib/api";
import { CURRENCIES, CURRENCY_SYMBOL, formatMoney, type Currency } from "@/lib/format";
import type { Client, Invoice } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ItemRow {
  description: string;
  quantity: string;
  rate: string;
}

const emptyItem: ItemRow = { description: "", quantity: "1", rate: "" };

function toDateInput(value: string | Date | null | undefined): string {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

/** Create + edit form. Edit mode when the route has an :id param. */
export function InvoiceFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const [searchParams] = useSearchParams();
  const editing = Boolean(id);

  const [clients, setClients] = useState<Client[]>([]);
  const [clientId, setClientId] = useState(searchParams.get("clientId") ?? "");
  const [issueDate, setIssueDate] = useState(toDateInput(new Date()));
  const [dueDate, setDueDate] = useState("");
  const [currency, setCurrency] = useState<Currency>("INR");
  const [recurringInterval, setRecurringInterval] = useState("");
  const [gstType, setGstType] = useState<"NONE" | "CGST_SGST" | "IGST">("NONE");
  const [gstRate, setGstRate] = useState("18");
  const [clientGstin, setClientGstin] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<ItemRow[]>([{ ...emptyItem }]);
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api<{ clients: Client[] }>("/api/clients")
      .then((data) => setClients(data.clients))
      .catch(() => toast.error("Failed to load clients"));
  }, []);

  useEffect(() => {
    if (!editing) return;
    api<{ invoice: Invoice }>(`/api/invoices/${id}`)
      .then(({ invoice }) => {
        if (invoice.status === "PAID") {
          toast.error("Paid invoices cannot be edited");
          navigate(`/invoices/${id}`);
          return;
        }
        setClientId(invoice.client.id);
        setIssueDate(toDateInput(invoice.issueDate));
        setDueDate(toDateInput(invoice.dueDate));
        setCurrency((invoice.currency as Currency) || "INR");
        setRecurringInterval(invoice.isRecurring ? invoice.recurringInterval ?? "" : "");
        setGstType(invoice.gstType);
        setGstRate(String(Number(invoice.gstRate) || 18));
        setClientGstin(invoice.clientGstin ?? "");
        setNotes(invoice.notes ?? "");
        setItems(
          (invoice.items ?? []).map((i) => ({
            description: i.description,
            quantity: String(Number(i.quantity)),
            rate: String(Number(i.rate)),
          }))
        );
      })
      .catch(() => {
        toast.error("Failed to load invoice");
        navigate("/invoices");
      })
      .finally(() => setLoading(false));
  }, [editing, id, navigate]);

  const totals = useMemo(() => {
    const subtotal = items.reduce(
      (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.rate) || 0),
      0
    );
    const rate = gstType === "NONE" ? 0 : Number(gstRate) || 0;
    const gst = (subtotal * rate) / 100;
    return {
      subtotal,
      cgst: gstType === "CGST_SGST" ? gst / 2 : 0,
      sgst: gstType === "CGST_SGST" ? gst / 2 : 0,
      igst: gstType === "IGST" ? gst : 0,
      total: subtotal + gst,
    };
  }, [items, gstType, gstRate]);

  function setItem(index: number, patch: Partial<ItemRow>) {
    setItems((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const validItems = items.filter((i) => i.description.trim());
    if (validItems.length === 0) {
      toast.error("Add at least one line item with a description");
      return;
    }
    setSaving(true);
    try {
      const body = {
        clientId,
        issueDate: issueDate || undefined,
        dueDate: dueDate || null,
        currency,
        isRecurring: Boolean(recurringInterval),
        recurringInterval: recurringInterval || null,
        gstType,
        gstRate: gstType === "NONE" ? 0 : Number(gstRate),
        clientGstin: clientGstin || null,
        notes: notes || null,
        items: validItems.map((i) => ({
          description: i.description.trim(),
          quantity: Number(i.quantity) || 1,
          rate: Number(i.rate) || 0,
        })),
      };
      if (editing) {
        await api(`/api/invoices/${id}`, { method: "PUT", body });
        toast.success("Invoice updated");
        navigate(`/invoices/${id}`);
      } else {
        const data = await api<{ invoice: { id: string } }>("/api/invoices", {
          method: "POST",
          body,
        });
        toast.success("Invoice created");
        navigate(`/invoices/${data.invoice.id}`);
      }
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/invoices")} aria-label="Back">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">
          {editing ? "Edit invoice" : "New invoice"}
        </h1>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="i-client">Client *</Label>
              <Select
                id="i-client"
                required
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
              >
                <option value="">Select a client…</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.company ? ` (${c.company})` : ""}
                  </option>
                ))}
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="i-issue">Issue date</Label>
                <Input
                  id="i-issue"
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="i-due">Due date</Label>
                <Input
                  id="i-due"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="i-currency">Currency</Label>
                <Select
                  id="i-currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as Currency)}
                >
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c} ({CURRENCY_SYMBOL[c]})
                    </option>
                  ))}
                </Select>
                {currency !== "INR" && (
                  <p className="text-xs text-muted-foreground">
                    Razorpay payment links are added for INR invoices only.
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="i-recurring">Repeat</Label>
                <Select
                  id="i-recurring"
                  value={recurringInterval}
                  onChange={(e) => setRecurringInterval(e.target.value)}
                >
                  <option value="">One-time invoice</option>
                  <option value="MONTHLY">Monthly (retainer)</option>
                  <option value="QUARTERLY">Quarterly</option>
                  <option value="YEARLY">Yearly</option>
                </Select>
                {recurringInterval && (
                  <p className="text-xs text-muted-foreground">
                    The next invoice is auto-created as a draft when the period
                    starts — perfect for monthly services.
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Line items</CardTitle>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setItems((rows) => [...rows, { ...emptyItem }])}
            >
              <Plus className="h-4 w-4" /> Add item
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="hidden gap-2 text-xs font-medium uppercase text-muted-foreground sm:grid sm:grid-cols-[1fr_90px_130px_110px_36px]">
              <span>Description</span>
              <span>Qty</span>
              <span>Rate ({CURRENCY_SYMBOL[currency]})</span>
              <span className="text-right">Amount</span>
              <span />
            </div>
            {items.map((item, i) => {
              const amount = (Number(item.quantity) || 0) * (Number(item.rate) || 0);
              return (
                <div
                  key={i}
                  className="grid gap-2 rounded-md border p-3 sm:grid-cols-[1fr_90px_130px_110px_36px] sm:items-center sm:border-0 sm:p-0"
                >
                  <Input
                    placeholder="e.g. Homepage design"
                    value={item.description}
                    onChange={(e) => setItem(i, { description: e.target.value })}
                  />
                  <Input
                    type="number"
                    min="0.01"
                    step="any"
                    placeholder="Qty"
                    value={item.quantity}
                    onChange={(e) => setItem(i, { quantity: e.target.value })}
                  />
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="Rate"
                    value={item.rate}
                    onChange={(e) => setItem(i, { rate: e.target.value })}
                  />
                  <span className="text-sm font-medium sm:text-right">
                    {formatMoney(amount, currency)}
                  </span>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label="Remove item"
                    disabled={items.length === 1}
                    onClick={() => setItems((rows) => rows.filter((_, j) => j !== i))}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">GST</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="i-gsttype">GST type</Label>
                <Select
                  id="i-gsttype"
                  value={gstType}
                  onChange={(e) => setGstType(e.target.value as typeof gstType)}
                >
                  <option value="NONE">No GST</option>
                  <option value="CGST_SGST">CGST + SGST (same state)</option>
                  <option value="IGST">IGST (inter-state)</option>
                </Select>
              </div>
              {gstType !== "NONE" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="i-gstrate">GST rate (%)</Label>
                    <Select
                      id="i-gstrate"
                      value={gstRate}
                      onChange={(e) => setGstRate(e.target.value)}
                    >
                      <option value="5">5%</option>
                      <option value="12">12%</option>
                      <option value="18">18%</option>
                      <option value="28">28%</option>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="i-gstin">Client GSTIN</Label>
                    <Input
                      id="i-gstin"
                      placeholder="e.g. 27AAPFU0939F1ZV"
                      maxLength={15}
                      value={clientGstin}
                      onChange={(e) => setClientGstin(e.target.value.toUpperCase())}
                    />
                  </div>
                </>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="i-notes">Notes (shown on invoice)</Label>
              <Textarea
                id="i-notes"
                rows={2}
                maxLength={1000}
                placeholder="e.g. Payment via UPI/bank transfer accepted"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-1.5 p-6">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatMoney(totals.subtotal, currency)}</span>
            </div>
            {gstType === "CGST_SGST" && (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">CGST ({Number(gstRate) / 2}%)</span>
                  <span>{formatMoney(totals.cgst, currency)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">SGST ({Number(gstRate) / 2}%)</span>
                  <span>{formatMoney(totals.sgst, currency)}</span>
                </div>
              </>
            )}
            {gstType === "IGST" && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">IGST ({gstRate}%)</span>
                <span>{formatMoney(totals.igst, currency)}</span>
              </div>
            )}
            <div className="flex justify-between border-t pt-2 text-base font-semibold">
              <span>Total</span>
              <span>{formatMoney(totals.total, currency)}</span>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => navigate("/invoices")}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {editing ? "Save changes" : "Create invoice"}
          </Button>
        </div>
      </form>
    </div>
  );
}
