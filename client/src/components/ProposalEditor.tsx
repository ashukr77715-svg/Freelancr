import { Plus, Trash2 } from "lucide-react";
import type { ProposalContent } from "@/lib/types";
import { formatINR } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Editable view of a generated proposal. List sections are edited one item
 * per line; timeline and pricing get structured row editors.
 */
export function ProposalEditor({
  content,
  onChange,
}: {
  content: ProposalContent;
  onChange: (content: ProposalContent) => void;
}) {
  const set = <K extends keyof ProposalContent>(key: K, value: ProposalContent[K]) =>
    onChange({ ...content, [key]: value });

  const linesToArray = (v: string) =>
    v.split("\n").map((l) => l.replace(/^•\s*/, ""));

  const pricingTotal = content.pricing.reduce((s, p) => s + (Number(p.amount) || 0), 0);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Title & overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Proposal title</Label>
            <Input
              value={content.title}
              maxLength={200}
              onChange={(e) => set("title", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Executive summary</Label>
            <Textarea
              rows={4}
              value={content.executiveSummary}
              onChange={(e) => set("executiveSummary", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Scope of work</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-xs text-muted-foreground">One item per line</p>
          <Textarea
            rows={5}
            value={content.scopeOfWork.join("\n")}
            onChange={(e) => set("scopeOfWork", linesToArray(e.target.value))}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Deliverables</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-xs text-muted-foreground">One item per line</p>
          <Textarea
            rows={5}
            value={content.deliverables.join("\n")}
            onChange={(e) => set("deliverables", linesToArray(e.target.value))}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Timeline</CardTitle>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              set("timeline", [
                ...content.timeline,
                { phase: "", duration: "", description: "" },
              ])
            }
          >
            <Plus className="h-4 w-4" /> Phase
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {content.timeline.map((phase, i) => (
            <div key={i} className="flex gap-2">
              <div className="grid flex-1 gap-2 sm:grid-cols-[1fr_120px_2fr]">
                <Input
                  placeholder="Phase"
                  value={phase.phase}
                  onChange={(e) => {
                    const t = [...content.timeline];
                    t[i] = { ...t[i], phase: e.target.value };
                    set("timeline", t);
                  }}
                />
                <Input
                  placeholder="Duration"
                  value={phase.duration}
                  onChange={(e) => {
                    const t = [...content.timeline];
                    t[i] = { ...t[i], duration: e.target.value };
                    set("timeline", t);
                  }}
                />
                <Input
                  placeholder="Description"
                  value={phase.description}
                  onChange={(e) => {
                    const t = [...content.timeline];
                    t[i] = { ...t[i], description: e.target.value };
                    set("timeline", t);
                  }}
                />
              </div>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label="Remove phase"
                onClick={() =>
                  set("timeline", content.timeline.filter((_, j) => j !== i))
                }
              >
                <Trash2 className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">
            Pricing{" "}
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              Total: {formatINR(pricingTotal)}
            </span>
          </CardTitle>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              set("pricing", [
                ...content.pricing,
                { item: "", description: "", amount: 0 },
              ])
            }
          >
            <Plus className="h-4 w-4" /> Item
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {content.pricing.map((row, i) => (
            <div key={i} className="flex gap-2">
              <div className="grid flex-1 gap-2 sm:grid-cols-[1fr_2fr_140px]">
                <Input
                  placeholder="Item"
                  value={row.item}
                  onChange={(e) => {
                    const p = [...content.pricing];
                    p[i] = { ...p[i], item: e.target.value };
                    set("pricing", p);
                  }}
                />
                <Input
                  placeholder="Description"
                  value={row.description}
                  onChange={(e) => {
                    const p = [...content.pricing];
                    p[i] = { ...p[i], description: e.target.value };
                    set("pricing", p);
                  }}
                />
                <Input
                  type="number"
                  min={0}
                  placeholder="Amount (₹)"
                  value={row.amount || ""}
                  onChange={(e) => {
                    const p = [...content.pricing];
                    p[i] = { ...p[i], amount: Number(e.target.value) };
                    set("pricing", p);
                  }}
                />
              </div>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label="Remove pricing item"
                onClick={() =>
                  set("pricing", content.pricing.filter((_, j) => j !== i))
                }
              >
                <Trash2 className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Terms & conditions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-xs text-muted-foreground">One term per line</p>
          <Textarea
            rows={5}
            value={content.terms.join("\n")}
            onChange={(e) => set("terms", linesToArray(e.target.value))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
