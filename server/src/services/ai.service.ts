import Anthropic from "@anthropic-ai/sdk";
import { env } from "../config/env.js";
import { ApiError } from "../utils/errors.js";

export interface ProposalTimelinePhase {
  phase: string;
  duration: string;
  description: string;
}

export interface ProposalPricingItem {
  item: string;
  description: string;
  amount: number;
}

export interface ProposalContent {
  title: string;
  executiveSummary: string;
  scopeOfWork: string[];
  deliverables: string[];
  timeline: ProposalTimelinePhase[];
  pricing: ProposalPricingItem[];
  terms: string[];
}

export interface GenerateProposalInput {
  clientName: string;
  clientCompany?: string | null;
  businessName: string;
  brief: string;
  budgetRange?: string;
  timeline?: string;
  tone: "FORMAL" | "CASUAL";
  language: "ENGLISH" | "HINGLISH";
}

export function isAiConfigured(): boolean {
  return Boolean(env.ANTHROPIC_API_KEY);
}

const SYSTEM_PROMPT = `You are an expert business proposal writer for Indian freelancers and small agencies. You write persuasive, specific, professional client proposals.

Respond with ONLY a valid JSON object — no markdown fences, no commentary — matching exactly this schema:
{
  "title": "string — short proposal title",
  "executiveSummary": "string — 2-4 sentences summarising the project and value",
  "scopeOfWork": ["string — each a concrete work area"],
  "deliverables": ["string — each a tangible deliverable"],
  "timeline": [{"phase": "string", "duration": "string e.g. '1 week'", "description": "string"}],
  "pricing": [{"item": "string", "description": "string", "amount": number (INR, no currency symbol)}],
  "terms": ["string — payment terms, revisions, ownership etc."]
}

Rules:
- Base everything on the client brief; be specific, never generic filler.
- Pricing must sum to a sensible total within the stated budget range if one is given.
- 3-6 items per list section. Amounts in INR.
- Tone: FORMAL = polished corporate English. CASUAL = friendly but professional.
- Language: ENGLISH = plain English. HINGLISH = natural Hindi-English mix as used in Indian business chat (e.g. "Aapke brand ke liye hum ek complete website banayenge"), keeping technical terms in English. Apply the language to all prose fields.`;

function extractJson(text: string): ProposalContent {
  // Model may occasionally wrap output in fences despite instructions.
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new Error("No JSON object in model output");
  }
  const parsed = JSON.parse(cleaned.slice(start, end + 1)) as ProposalContent;
  if (!parsed.title || !Array.isArray(parsed.scopeOfWork)) {
    throw new Error("Model output missing required fields");
  }
  return parsed;
}

async function generateWithClaude(
  input: GenerateProposalInput
): Promise<{ content: ProposalContent; rawOutput: string }> {
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

  const userPrompt = [
    `My business: ${input.businessName}`,
    `Client: ${input.clientName}${input.clientCompany ? ` (${input.clientCompany})` : ""}`,
    `Project brief:\n${input.brief}`,
    input.budgetRange ? `Budget range: ${input.budgetRange}` : null,
    input.timeline ? `Expected timeline: ${input.timeline}` : null,
    `Tone: ${input.tone}`,
    `Language: ${input.language}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4000,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("");

  return { content: extractJson(text), rawOutput: text };
}

/**
 * Deterministic fallback used when ANTHROPIC_API_KEY is not configured, so
 * the proposal flow stays usable in local/dev setups without an API key.
 */
function generateWithTemplate(
  input: GenerateProposalInput
): { content: ProposalContent; rawOutput: string } {
  const hinglish = input.language === "HINGLISH";
  const briefFirstLine = input.brief.split("\n")[0].slice(0, 80);
  const content: ProposalContent = {
    title: `Proposal: ${briefFirstLine}`,
    executiveSummary: hinglish
      ? `${input.clientName} ji, aapke project "${briefFirstLine}" ke liye yeh proposal hai. Humne aapki requirements ko dhyan se samjha hai aur ek complete plan banaya hai jo quality aur timeline dono deliver karega.`
      : `This proposal outlines how ${input.businessName} will deliver "${briefFirstLine}" for ${input.clientName}. It covers the scope of work, deliverables, timeline, and investment required, based on the brief you shared.`,
    scopeOfWork: [
      "Discovery and requirement finalisation based on the shared brief",
      "Design and development as described in the project brief",
      "Review cycles with your feedback incorporated",
      "Final delivery, handover, and documentation",
    ],
    deliverables: [
      "All source files and assets produced for the project",
      "Deployed/production-ready final output",
      "Handover documentation",
      "Post-delivery support window",
    ],
    timeline: [
      {
        phase: "Discovery & planning",
        duration: "3-5 days",
        description: "Finalise requirements, references, and milestones.",
      },
      {
        phase: "Execution",
        duration: input.timeline || "2-3 weeks",
        description: "Core work as per the agreed scope.",
      },
      {
        phase: "Review & delivery",
        duration: "3-5 days",
        description: "Feedback rounds, polish, and final handover.",
      },
    ],
    pricing: [
      {
        item: "Project fee",
        description: input.budgetRange
          ? `As per discussed budget range (${input.budgetRange})`
          : "Fixed project fee for the full scope above",
        amount: 0,
      },
    ],
    terms: [
      "50% advance to begin work, 50% on final delivery",
      "Two rounds of revisions included; further revisions billed separately",
      "Full ownership of deliverables transfers on final payment",
      "Quotation valid for 30 days",
    ],
  };
  return {
    content,
    rawOutput: JSON.stringify(content, null, 2),
  };
}

export async function generateProposal(
  input: GenerateProposalInput
): Promise<{ content: ProposalContent; rawOutput: string; usedAi: boolean }> {
  if (!isAiConfigured()) {
    const result = generateWithTemplate(input);
    return { ...result, usedAi: false };
  }

  try {
    const result = await generateWithClaude(input);
    return { ...result, usedAi: true };
  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      if (err.status === 429) {
        throw new ApiError(429, "AI service is rate-limited right now — try again in a minute.", "AI_RATE_LIMIT");
      }
      if (err.status === 401) {
        throw new ApiError(502, "AI API key is invalid — check ANTHROPIC_API_KEY.", "AI_AUTH");
      }
      if (err.status >= 500 || err.status === 529) {
        throw new ApiError(503, "AI service is temporarily unavailable — please retry.", "AI_UNAVAILABLE");
      }
    }
    if (err instanceof SyntaxError || (err as Error).message?.includes("JSON")) {
      throw new ApiError(502, "AI returned an unexpected format — please retry.", "AI_BAD_OUTPUT");
    }
    console.error("Proposal generation failed:", err);
    throw new ApiError(503, "Proposal generation failed — please retry.", "AI_ERROR");
  }
}
