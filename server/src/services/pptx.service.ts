import path from "node:path";
import pptxgenjsImport from "pptxgenjs";
import type { ProposalContent } from "./ai.service.js";
import { storage } from "./storage.service.js";

// pptxgenjs ships CJS-flavoured type definitions; under NodeNext the typed
// default import is the module object while the ESM runtime hands us the
// class directly — normalize both shapes to a constructor.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const PptxGenJS = (((pptxgenjsImport as { default?: unknown }).default ??
  pptxgenjsImport) as unknown) as new () => any;

interface TableCell {
  text: string;
  options?: Record<string, unknown>;
}
type TableRow = TableCell[];

// freelancr brand palette
const BRAND = "AF6278"; // mauve
const BRAND_DARK = "8A4A5E";
const INK = "332B2B"; // charcoal
const MUTED = "746A6A";
const LIGHT = "F8EFF1"; // blush tint
const WHITE = "FDFAF3"; // warm cream "white"

// 16:9 slide is 10 x 5.625 inches
const W = 10;
const H = 5.625;
const M = 0.55; // margin

function formatRs(n: number): string {
  return "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

interface PptxUser {
  name: string;
  businessName: string | null;
  email: string;
  phone: string | null;
  logoUrl: string | null;
}

interface PptxProposal {
  title: string;
  content: ProposalContent;
  createdAt: Date;
}

async function logoDataUrl(logoUrl: string | null): Promise<string | null> {
  if (!logoUrl) return null;
  try {
    const key = logoUrl.replace(/^\/uploads\//, "");
    const bytes = await storage.read(key);
    const mime = path.extname(key).toLowerCase() === ".png" ? "image/png" : "image/jpeg";
    return `data:${mime};base64,${bytes.toString("base64")}`;
  } catch {
    return null;
  }
}

export async function generateProposalPptx(
  proposal: PptxProposal,
  client: { name: string; company: string | null },
  user: PptxUser
): Promise<Buffer> {
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: "WIDE", width: W, height: H });
  pptx.layout = "WIDE";

  const business = user.businessName || user.name;
  const c = proposal.content;
  const logo = await logoDataUrl(user.logoUrl);
  const dateStr = new Date(proposal.createdAt).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // Reusable content-slide scaffold: side accent bar + header
  const contentSlide = (heading: string) => {
    const slide = pptx.addSlide();
    slide.background = { color: WHITE };
    slide.addShape("rect", { x: 0, y: 0, w: 0.18, h: H, fill: { color: BRAND } });
    slide.addText(heading, {
      x: M, y: 0.35, w: W - 2 * M, h: 0.6,
      fontSize: 26, bold: true, color: INK, fontFace: "Arial",
    });
    slide.addText(business, {
      x: M, y: H - 0.45, w: 4, h: 0.3,
      fontSize: 9, color: MUTED, fontFace: "Arial",
    });
    slide.addText(String(pptx.slides.length), {
      x: W - M - 0.5, y: H - 0.45, w: 0.5, h: 0.3,
      fontSize: 9, color: MUTED, align: "right", fontFace: "Arial",
    });
    return slide;
  };

  const bulletSlide = (heading: string, items: string[], icon = "•") => {
    const slide = contentSlide(heading);
    slide.addText(
      items.map((item) => ({
        text: `${icon}  ${item}`,
        options: { breakLine: true, paraSpaceAfter: 10 },
      })),
      {
        x: M, y: 1.25, w: W - 2 * M, h: H - 2,
        fontSize: 15, color: INK, fontFace: "Arial", valign: "top",
      }
    );
    return slide;
  };

  // ---- Slide 1: Title ----
  {
    const slide = pptx.addSlide();
    slide.background = { color: BRAND };
    slide.addShape("rect", { x: 0, y: H - 1.1, w: W, h: 1.1, fill: { color: BRAND_DARK } });
    if (logo) {
      slide.addImage({ data: logo, x: M, y: 0.45, h: 0.7, w: 0.7 });
    }
    slide.addText(business.toUpperCase(), {
      x: logo ? M + 0.85 : M, y: 0.55, w: 6, h: 0.5,
      fontSize: 14, bold: true, color: WHITE, charSpacing: 3, fontFace: "Arial",
    });
    slide.addText(proposal.title, {
      x: M, y: 1.9, w: W - 2 * M, h: 1.6,
      fontSize: 34, bold: true, color: WHITE, fontFace: "Arial", valign: "top",
    });
    slide.addText(
      `Prepared for ${client.name}${client.company ? ` · ${client.company}` : ""}`,
      { x: M, y: 3.6, w: W - 2 * M, h: 0.4, fontSize: 16, color: "F3DFE4", fontFace: "Arial" }
    );
    slide.addText(dateStr, {
      x: M, y: H - 0.85, w: 5, h: 0.4, fontSize: 12, color: "F3DFE4", fontFace: "Arial",
    });
  }

  // ---- Slide 2: Overview ----
  if (c.executiveSummary) {
    const slide = contentSlide("Project Overview");
    slide.addShape("rect", {
      x: M, y: 1.35, w: W - 2 * M, h: 2.9,
      fill: { color: LIGHT }, rectRadius: 0.08,
    });
    slide.addText(c.executiveSummary, {
      x: M + 0.3, y: 1.6, w: W - 2 * M - 0.6, h: 2.4,
      fontSize: 16, color: INK, fontFace: "Arial", valign: "top", lineSpacing: 26,
    });
  }

  // ---- Scope & Deliverables ----
  if (c.scopeOfWork?.length) bulletSlide("Scope of Work", c.scopeOfWork, "▸");
  if (c.deliverables?.length) bulletSlide("What You Get", c.deliverables, "✓");

  // ---- Timeline ----
  if (c.timeline?.length) {
    const slide = contentSlide("Timeline");
    const rowH = Math.min(0.95, 3.7 / c.timeline.length);
    c.timeline.forEach((phase, i) => {
      const y = 1.3 + i * (rowH + 0.12);
      slide.addShape("rect", {
        x: M, y, w: 0.35, h: rowH, fill: { color: BRAND }, rectRadius: 0.05,
      });
      slide.addText(String(i + 1), {
        x: M, y: y + rowH / 2 - 0.17, w: 0.35, h: 0.34,
        fontSize: 14, bold: true, color: WHITE, align: "center", fontFace: "Arial",
      });
      slide.addText(
        [
          { text: `${phase.phase}  `, options: { bold: true, fontSize: 15, color: INK } },
          { text: `(${phase.duration})`, options: { fontSize: 12, color: BRAND } },
          ...(phase.description
            ? [{ text: `\n${phase.description}`, options: { fontSize: 11, color: MUTED } }]
            : []),
        ],
        { x: M + 0.55, y, w: W - 2 * M - 0.6, h: rowH, valign: "middle", fontFace: "Arial" }
      );
    });
  }

  // ---- Investment ----
  if (c.pricing?.length) {
    const slide = contentSlide("Investment");
    const total = c.pricing.reduce((s, p) => s + (Number(p.amount) || 0), 0);
    const rows: TableRow[] = [
      [
        { text: "Item", options: { bold: true, color: WHITE, fill: { color: BRAND } } },
        { text: "Details", options: { bold: true, color: WHITE, fill: { color: BRAND } } },
        { text: "Amount", options: { bold: true, color: WHITE, fill: { color: BRAND }, align: "right" } },
      ],
      ...c.pricing.map(
        (p, i): TableRow => [
          { text: p.item, options: { bold: true, fill: { color: i % 2 ? LIGHT : WHITE } } },
          { text: p.description || "", options: { fill: { color: i % 2 ? LIGHT : WHITE }, color: MUTED } },
          { text: formatRs(Number(p.amount) || 0), options: { align: "right", fill: { color: i % 2 ? LIGHT : WHITE } } },
        ]
      ),
      [
        { text: "Total", options: { bold: true, fill: { color: BRAND_DARK }, color: WHITE } },
        { text: "", options: { fill: { color: BRAND_DARK } } },
        { text: formatRs(total), options: { bold: true, align: "right", fill: { color: BRAND_DARK }, color: WHITE } },
      ],
    ];
    slide.addTable(rows, {
      x: M, y: 1.3, w: W - 2 * M,
      colW: [2.6, 4.3, 2],
      fontSize: 12, fontFace: "Arial", color: INK,
      border: { type: "solid", color: "E5E7EB", pt: 0.5 },
      rowH: 0.42,
    });
  }

  // ---- Terms ----
  if (c.terms?.length) bulletSlide("Terms & Conditions", c.terms);

  // ---- Closing ----
  {
    const slide = pptx.addSlide();
    slide.background = { color: BRAND };
    slide.addText("Let's build this together.", {
      x: M, y: 1.7, w: W - 2 * M, h: 0.9,
      fontSize: 32, bold: true, color: WHITE, align: "center", fontFace: "Arial",
    });
    const contact = [user.email, user.phone].filter(Boolean).join("   ·   ");
    slide.addText(`${business}\n${contact}`, {
      x: M, y: 3.0, w: W - 2 * M, h: 0.8,
      fontSize: 14, color: "F3DFE4", align: "center", fontFace: "Arial",
    });
  }

  return (await pptx.write({ outputType: "nodebuffer" })) as Buffer;
}
