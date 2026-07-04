import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { FileText, Loader2, Plus, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { Proposal } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export function ProposalsPage() {
  const navigate = useNavigate();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiConfigured, setAiConfigured] = useState(true);

  useEffect(() => {
    api<{ proposals: Proposal[]; aiConfigured: boolean }>("/api/proposals")
      .then((data) => {
        setProposals(data.proposals);
        setAiConfigured(data.aiConfigured);
      })
      .catch(() => toast.error("Failed to load proposals"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Proposals</h1>
        <Button onClick={() => navigate("/proposals/new")}>
          <Sparkles className="h-4 w-4" /> New AI proposal
        </Button>
      </div>

      {!aiConfigured && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          <strong>AI not configured:</strong> set <code>ANTHROPIC_API_KEY</code> in{" "}
          <code>server/.env</code> to generate proposals with Claude. Until then a
          built-in template is used.
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : proposals.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <FileText className="h-10 w-10 text-muted-foreground/50" />
            <p className="font-medium">No proposals yet</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Describe a project brief and get a polished, client-ready proposal in
              seconds.
            </p>
            <Button onClick={() => navigate("/proposals/new")}>
              <Plus className="h-4 w-4" /> Create your first proposal
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {proposals.map((p) => (
            <Link
              key={p.id}
              to={`/proposals/${p.id}`}
              className="flex items-center justify-between gap-3 rounded-lg border bg-card p-4 transition-shadow hover:shadow-md"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{p.title}</p>
                <p className="truncate text-sm text-muted-foreground">
                  {p.client.name}
                  {p.client.company ? ` · ${p.client.company}` : ""} ·{" "}
                  {formatDate(p.createdAt)}
                </p>
              </div>
              <StatusBadge status={p.status} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
