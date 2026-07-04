import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft,
  Check,
  Download,
  Loader2,
  Presentation,
  RotateCcw,
  Save,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { api, ApiRequestError } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { Proposal, ProposalContent } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { ProposalEditor } from "@/components/ProposalEditor";

export function ProposalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [content, setContent] = useState<ProposalContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [dirty, setDirty] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api<{ proposal: Proposal }>(`/api/proposals/${id}`);
      setProposal(data.proposal);
      setContent(data.proposal.content);
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : "Failed to load proposal");
      navigate("/proposals");
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    load();
  }, [load]);

  async function save() {
    if (!proposal || !content) return;
    setSaving(true);
    try {
      const data = await api<{ proposal: Proposal }>(`/api/proposals/${proposal.id}`, {
        method: "PUT",
        body: { title: content.title, content },
      });
      setProposal(data.proposal);
      setDirty(false);
      toast.success("Changes saved");
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function setStatus(status: Proposal["status"]) {
    if (!proposal) return;
    try {
      const data = await api<{ proposal: Proposal }>(`/api/proposals/${proposal.id}`, {
        method: "PUT",
        body: { status },
      });
      setProposal(data.proposal);
      toast.success(`Marked as ${status.toLowerCase()}`);
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : "Update failed");
    }
  }

  async function regenerate() {
    if (!proposal) return;
    if (dirty && !window.confirm("Regenerating will replace your unsaved edits. Continue?")) {
      return;
    }
    setRegenerating(true);
    try {
      const data = await api<{ proposal: Proposal }>(
        `/api/proposals/${proposal.id}/regenerate`,
        { method: "POST" }
      );
      setProposal(data.proposal);
      setContent(data.proposal.content);
      setDirty(false);
      toast.success("Proposal regenerated");
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : "Regeneration failed");
    } finally {
      setRegenerating(false);
    }
  }

  async function remove() {
    if (!proposal) return;
    if (!window.confirm("Delete this proposal? This cannot be undone.")) return;
    try {
      await api(`/api/proposals/${proposal.id}`, { method: "DELETE" });
      toast.success("Proposal deleted");
      navigate("/proposals");
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : "Delete failed");
    }
  }

  function downloadPdf() {
    // Cookie auth means a plain link works; open in a new tab to trigger download.
    window.open(`/api/proposals/${id}/pdf`, "_blank");
  }

  if (loading || !proposal) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/proposals")} aria-label="Back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-xl font-semibold tracking-tight">
                {proposal.title}
              </h1>
              <StatusBadge status={proposal.status} />
            </div>
            <p className="text-sm text-muted-foreground">
              For{" "}
              <Link to={`/clients/${proposal.client.id}`} className="text-primary hover:underline">
                {proposal.client.name}
              </Link>{" "}
              · {formatDate(proposal.createdAt)}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={downloadPdf}>
            <Download className="h-4 w-4" /> PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(`/api/proposals/${id}/pptx`, "_blank")}
            title="Download a client-ready presentation deck (PowerPoint)"
          >
            <Presentation className="h-4 w-4" /> Presentation
          </Button>
          <Button variant="outline" size="sm" onClick={regenerate} disabled={regenerating}>
            {regenerating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RotateCcw className="h-4 w-4" />
            )}
            Regenerate
          </Button>
          <Button variant="ghost" size="sm" onClick={remove}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 rounded-md border bg-card p-3">
        <span className="mr-1 self-center text-sm text-muted-foreground">Status:</span>
        {proposal.status !== "SENT" && (
          <Button size="sm" variant="outline" onClick={() => setStatus("SENT")}>
            <Send className="h-4 w-4" /> Mark as sent
          </Button>
        )}
        {proposal.status !== "ACCEPTED" && (
          <Button size="sm" variant="outline" onClick={() => setStatus("ACCEPTED")}>
            <Check className="h-4 w-4 text-green-600" /> Accepted
          </Button>
        )}
        {proposal.status !== "REJECTED" && (
          <Button size="sm" variant="outline" onClick={() => setStatus("REJECTED")}>
            <X className="h-4 w-4 text-destructive" /> Rejected
          </Button>
        )}
      </div>

      {content && (
        <>
          <ProposalEditor
            content={content}
            onChange={(c) => {
              setContent(c);
              setDirty(true);
            }}
          />
          <div className="sticky bottom-4 flex justify-end">
            <Button onClick={save} disabled={saving || !dirty} className="shadow-lg">
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {dirty ? "Save changes" : "Saved"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
