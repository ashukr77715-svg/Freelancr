import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Loader2, RotateCcw, Save, Sparkles } from "lucide-react";
import { api, ApiRequestError } from "@/lib/api";
import type { Client, ProposalContent } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProposalEditor } from "@/components/ProposalEditor";

export function ProposalNewPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [clients, setClients] = useState<Client[]>([]);
  const [clientId, setClientId] = useState(searchParams.get("clientId") ?? "");
  const [brief, setBrief] = useState("");
  const [budgetRange, setBudgetRange] = useState("");
  const [timeline, setTimeline] = useState("");
  const [tone, setTone] = useState<"FORMAL" | "CASUAL">("FORMAL");
  const [language, setLanguage] = useState<"ENGLISH" | "HINGLISH">("ENGLISH");

  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [content, setContent] = useState<ProposalContent | null>(null);
  const [rawOutput, setRawOutput] = useState<string>("");

  useEffect(() => {
    api<{ clients: Client[] }>("/api/clients")
      .then((data) => {
        setClients(data.clients);
        if (data.clients.length === 0) {
          toast.info("Add a client first — proposals are always linked to a client.");
        }
      })
      .catch(() => toast.error("Failed to load clients"));
  }, []);

  async function generate(e?: FormEvent) {
    e?.preventDefault();
    if (!clientId) {
      toast.error("Select a client");
      return;
    }
    setGenerating(true);
    try {
      const result = await api<{
        content: ProposalContent;
        rawOutput: string;
        usedAi: boolean;
      }>("/api/proposals/generate", {
        method: "POST",
        body: { clientId, brief, budgetRange, timeline, tone, language },
      });
      setContent(result.content);
      setRawOutput(result.rawOutput);
      if (!result.usedAi) {
        toast.info(
          "Generated with the built-in template — add ANTHROPIC_API_KEY for AI proposals."
        );
      } else {
        toast.success("Proposal generated — review and edit before saving.");
      }
    } catch (err) {
      // The brief stays in state, so the user can simply retry.
      toast.error(
        err instanceof ApiRequestError ? err.message : "Generation failed — try again."
      );
    } finally {
      setGenerating(false);
    }
  }

  async function save() {
    if (!content) return;
    setSaving(true);
    try {
      const data = await api<{ proposal: { id: string } }>("/api/proposals", {
        method: "POST",
        body: {
          clientId,
          brief,
          budgetRange: budgetRange || undefined,
          timeline: timeline || undefined,
          tone,
          language,
          title: content.title,
          content,
          rawOutput,
        },
      });
      toast.success("Proposal saved");
      navigate(`/proposals/${data.proposal.id}`);
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/proposals")} aria-label="Back">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">New proposal</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Project brief</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={generate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="p-client">Client *</Label>
              <Select
                id="p-client"
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
              {clients.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No clients yet —{" "}
                  <button
                    type="button"
                    className="text-primary underline"
                    onClick={() => navigate("/clients")}
                  >
                    add one first
                  </button>
                  .
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-brief">What's the project? *</Label>
              <Textarea
                id="p-brief"
                required
                minLength={20}
                maxLength={5000}
                rows={6}
                placeholder="e.g. Redesign an e-commerce website for a Jaipur-based jewellery brand. They need a modern look, product catalog with ~200 SKUs, Instagram integration, and checkout with UPI…"
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                The more specific the brief, the better the proposal. Min 20 characters.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="p-budget">Budget range</Label>
                <Input
                  id="p-budget"
                  placeholder="e.g. ₹50,000 – ₹80,000"
                  maxLength={100}
                  value={budgetRange}
                  onChange={(e) => setBudgetRange(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-timeline">Timeline</Label>
                <Input
                  id="p-timeline"
                  placeholder="e.g. 4-6 weeks"
                  maxLength={100}
                  value={timeline}
                  onChange={(e) => setTimeline(e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="p-tone">Tone</Label>
                <Select
                  id="p-tone"
                  value={tone}
                  onChange={(e) => setTone(e.target.value as typeof tone)}
                >
                  <option value="FORMAL">Formal</option>
                  <option value="CASUAL">Casual</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-language">Language</Label>
                <Select
                  id="p-language"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as typeof language)}
                >
                  <option value="ENGLISH">English</option>
                  <option value="HINGLISH">Hinglish</option>
                </Select>
              </div>
            </div>
            <Button type="submit" disabled={generating} className="w-full sm:w-auto">
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {content ? "Regenerate" : "Generate proposal"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {generating && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="font-medium">Writing your proposal…</p>
            <p className="text-sm text-muted-foreground">
              This usually takes 10–20 seconds.
            </p>
          </CardContent>
        </Card>
      )}

      {content && !generating && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Review & edit</h2>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => generate()}>
                <RotateCcw className="h-4 w-4" /> Regenerate
              </Button>
              <Button onClick={save} disabled={saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save proposal
              </Button>
            </div>
          </div>
          <ProposalEditor content={content} onChange={setContent} />
          <div className="flex justify-end">
            <Button onClick={save} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save proposal
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
