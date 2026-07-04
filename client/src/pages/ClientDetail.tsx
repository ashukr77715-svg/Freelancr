import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, FileText, Loader2, Mail, MapPin, Phone, Plus, Receipt, Trash2 } from "lucide-react";
import { api, ApiRequestError } from "@/lib/api";
import { formatDate, formatMoney } from "@/lib/format";
import type { Client } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ClientDetail extends Client {
  proposals: Array<{ id: string; title: string; status: string; createdAt: string }>;
  invoices: Array<{
    id: string;
    invoiceNumber: string;
    status: string;
    total: string;
    currency: string;
    issueDate: string;
    dueDate: string | null;
  }>;
}

export function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await api<{ client: ClientDetail }>(`/api/clients/${id}`);
      setClient(data.client);
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : "Failed to load client");
      navigate("/clients");
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    load();
  }, [load]);

  async function onDelete() {
    if (!client) return;
    if (!window.confirm(`Delete "${client.name}" and all their proposals/invoices? This cannot be undone.`)) {
      return;
    }
    try {
      await api(`/api/clients/${client.id}`, { method: "DELETE" });
      toast.success("Client deleted");
      navigate("/clients");
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : "Delete failed");
    }
  }

  if (loading || !client) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/clients")} aria-label="Back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">{client.name}</h1>
              <StatusBadge status={client.status} />
            </div>
            {client.company && <p className="text-muted-foreground">{client.company}</p>}
          </div>
        </div>
        <Button variant="destructive" size="sm" onClick={onDelete}>
          <Trash2 className="h-4 w-4" /> Delete
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {client.email && (
              <p className="flex items-center gap-2">
                <Mail className="h-4 w-4 shrink-0 text-muted-foreground" /> {client.email}
              </p>
            )}
            {client.phone && (
              <p className="flex items-center gap-2">
                <Phone className="h-4 w-4 shrink-0 text-muted-foreground" /> {client.phone}
              </p>
            )}
            {client.address && (
              <p className="flex items-start gap-2">
                <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" /> {client.address}
              </p>
            )}
            {!client.email && !client.phone && !client.address && (
              <p className="text-muted-foreground">No contact details</p>
            )}
            {client.notes && (
              <div className="border-t pt-3">
                <p className="mb-1 text-xs font-medium text-muted-foreground">NOTES</p>
                <p className="whitespace-pre-wrap text-muted-foreground">{client.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Proposals</CardTitle>
            <Button size="sm" variant="outline" onClick={() => navigate(`/proposals/new?clientId=${client.id}`)}>
              <Plus className="h-4 w-4" /> New
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {client.proposals.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                <FileText className="mx-auto mb-2 h-6 w-6 opacity-40" />
                No proposals yet
              </p>
            ) : (
              client.proposals.map((p) => (
                <Link
                  key={p.id}
                  to={`/proposals/${p.id}`}
                  className="flex items-center justify-between gap-2 rounded-md border p-3 text-sm hover:bg-accent"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{p.title}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(p.createdAt)}</p>
                  </div>
                  <StatusBadge status={p.status} />
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Invoices</CardTitle>
            <Button size="sm" variant="outline" onClick={() => navigate(`/invoices/new?clientId=${client.id}`)}>
              <Plus className="h-4 w-4" /> New
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {client.invoices.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                <Receipt className="mx-auto mb-2 h-6 w-6 opacity-40" />
                No invoices yet
              </p>
            ) : (
              client.invoices.map((inv) => (
                <Link
                  key={inv.id}
                  to={`/invoices/${inv.id}`}
                  className="flex items-center justify-between gap-2 rounded-md border p-3 text-sm hover:bg-accent"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{inv.invoiceNumber}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(inv.issueDate)} · {formatMoney(inv.total, inv.currency)}
                    </p>
                  </div>
                  <StatusBadge status={inv.status} />
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
