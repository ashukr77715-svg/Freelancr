import path from "node:path";
import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb, type RGB } from "pdf-lib";
import { storage } from "./storage.service.js";
import type { ProposalContent } from "./ai.service.js";

import { formatMoney } from "../utils/money.js";

export const formatINR = (value: number | string) => formatMoney(value, "INR");

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// freelancr brand: charcoal ink + mauve accent
const COLORS = {
  text: rgb(0.2, 0.17, 0.17),
  muted: rgb(0.45, 0.42, 0.42),
  primary: rgb(0.69, 0.38, 0.47), // #AF6278
  line: rgb(0.88, 0.85, 0.84),
  tableHead: rgb(0.97, 0.94, 0.93),
};

const PAGE_W = 595.28; // A4
const PAGE_H = 841.89;
const MARGIN = 50;

class PdfBuilder {
  doc!: PDFDocument;
  page!: PDFPage;
  font!: PDFFont;
  bold!: PDFFont;
  y = 0;

  static async create(): Promise<PdfBuilder> {
    const b = new PdfBuilder();
    b.doc = await PDFDocument.create();
    b.font = await b.doc.embedFont(StandardFonts.Helvetica);
    b.bold = await b.doc.embedFont(StandardFonts.HelveticaBold);
    b.addPage();
    return b;
  }

  addPage() {
    this.page = this.doc.addPage([PAGE_W, PAGE_H]);
    this.y = PAGE_H - MARGIN;
  }

  ensureSpace(height: number) {
    if (this.y - height < MARGIN) this.addPage();
  }

  wrap(text: string, size: number, font: PDFFont, maxWidth: number): string[] {
    const lines: string[] = [];
    for (const paragraph of text.split("\n")) {
      const words = paragraph.split(/\s+/).filter(Boolean);
      if (!words.length) {
        lines.push("");
        continue;
      }
      let line = "";
      for (const word of words) {
        const candidate = line ? `${line} ${word}` : word;
        if (font.widthOfTextAtSize(candidate, size) > maxWidth && line) {
          lines.push(line);
          line = word;
        } else {
          line = candidate;
        }
      }
      if (line) lines.push(line);
    }
    return lines;
  }

  text(
    content: string,
    opts: {
      size?: number;
      bold?: boolean;
      color?: RGB;
      x?: number;
      maxWidth?: number;
      lineGap?: number;
    } = {}
  ) {
    const size = opts.size ?? 10;
    const font = opts.bold ? this.bold : this.font;
    const x = opts.x ?? MARGIN;
    const maxWidth = opts.maxWidth ?? PAGE_W - MARGIN - x;
    const lineHeight = size * 1.35 + (opts.lineGap ?? 0);
    for (const line of this.wrap(content, size, font, maxWidth)) {
      this.ensureSpace(lineHeight);
      this.page.drawText(line, {
        x,
        y: this.y - size,
        size,
        font,
        color: opts.color ?? COLORS.text,
      });
      this.y -= lineHeight;
    }
  }

  textRight(content: string, rightX: number, opts: { size?: number; bold?: boolean; color?: RGB } = {}) {
    const size = opts.size ?? 10;
    const font = opts.bold ? this.bold : this.font;
    const width = font.widthOfTextAtSize(content, size);
    this.page.drawText(content, {
      x: rightX - width,
      y: this.y - size,
      size,
      font,
      color: opts.color ?? COLORS.text,
    });
  }

  hr(space = 12) {
    this.ensureSpace(space);
    this.page.drawLine({
      start: { x: MARGIN, y: this.y },
      end: { x: PAGE_W - MARGIN, y: this.y },
      thickness: 0.7,
      color: COLORS.line,
    });
    this.y -= space;
  }

  gap(space: number) {
    this.y -= space;
  }

  async embedLogo(logoUrl: string | null): Promise<void> {
    if (!logoUrl) return;
    try {
      const key = logoUrl.replace(/^\/uploads\//, "");
      const bytes = await storage.read(key);
      const ext = path.extname(key).toLowerCase();
      const image =
        ext === ".png"
          ? await this.doc.embedPng(bytes)
          : await this.doc.embedJpg(bytes);
      const maxH = 42;
      const scale = maxH / image.height;
      this.page.drawImage(image, {
        x: PAGE_W - MARGIN - image.width * scale,
        y: PAGE_H - MARGIN - maxH,
        width: image.width * scale,
        height: maxH,
      });
    } catch {
      // Missing/corrupt logo must not block PDF generation.
    }
  }

  async bytes(): Promise<Uint8Array> {
    return this.doc.save();
  }
}

// ---------- Invoice PDF ----------

interface InvoicePdfUser {
  name: string;
  businessName: string | null;
  address: string | null;
  phone: string | null;
  email: string;
  gstin: string | null;
  logoUrl: string | null;
}

interface InvoicePdfClient {
  name: string;
  company: string | null;
  email: string | null;
  address: string | null;
}

interface InvoicePdfItem {
  description: string;
  quantity: unknown;
  rate: unknown;
  amount: unknown;
}

interface InvoicePdfData {
  invoiceNumber: string;
  status: string;
  issueDate: Date;
  dueDate: Date | null;
  currency: string;
  subtotal: unknown;
  gstType: string;
  gstRate: unknown;
  cgstAmount: unknown;
  sgstAmount: unknown;
  igstAmount: unknown;
  total: unknown;
  notes: string | null;
  clientGstin: string | null;
  items: InvoicePdfItem[];
}

export async function generateInvoicePdf(
  invoice: InvoicePdfData,
  client: InvoicePdfClient,
  user: InvoicePdfUser
): Promise<Uint8Array> {
  const b = await PdfBuilder.create();
  await b.embedLogo(user.logoUrl);

  const business = user.businessName || user.name;
  b.text(business, { size: 18, bold: true, color: COLORS.primary });
  if (user.address) b.text(user.address, { size: 9, color: COLORS.muted });
  const contactLine = [user.email, user.phone].filter(Boolean).join("  ·  ");
  b.text(contactLine, { size: 9, color: COLORS.muted });
  if (user.gstin) b.text(`GSTIN: ${user.gstin}`, { size: 9, color: COLORS.muted });

  b.gap(10);
  b.text(invoice.gstType === "NONE" ? "INVOICE" : "TAX INVOICE", {
    size: 14,
    bold: true,
  });
  b.gap(4);
  b.hr();

  // Invoice meta + bill-to in two columns
  const metaTop = b.y;
  b.text("BILL TO", { size: 8, bold: true, color: COLORS.muted });
  b.text(client.name, { size: 11, bold: true, maxWidth: 250 });
  if (client.company) b.text(client.company, { size: 10, maxWidth: 250 });
  if (client.address) b.text(client.address, { size: 9, color: COLORS.muted, maxWidth: 250 });
  if (client.email) b.text(client.email, { size: 9, color: COLORS.muted, maxWidth: 250 });
  if (invoice.clientGstin)
    b.text(`GSTIN: ${invoice.clientGstin}`, { size: 9, color: COLORS.muted });
  const leftBottom = b.y;

  b.y = metaTop;
  const metaX = 360;
  const metaRows: Array<[string, string]> = [
    ["Invoice #", invoice.invoiceNumber],
    ["Issue date", formatDate(invoice.issueDate)],
    ["Due date", formatDate(invoice.dueDate)],
    ["Status", invoice.status],
  ];
  for (const [label, value] of metaRows) {
    b.text(label, { size: 9, color: COLORS.muted, x: metaX });
    b.y += 9 * 1.35; // same row
    b.textRight(value, PAGE_W - MARGIN, { size: 9, bold: true });
    b.y -= 9 * 1.35;
  }
  b.y = Math.min(leftBottom, b.y);
  b.gap(16);

  // Items table
  const colDesc = MARGIN;
  const colQty = 350;
  const colRate = 430;
  const colAmt = PAGE_W - MARGIN;

  b.ensureSpace(24);
  b.page.drawRectangle({
    x: MARGIN - 6,
    y: b.y - 18,
    width: PAGE_W - 2 * (MARGIN - 6),
    height: 20,
    color: COLORS.tableHead,
  });
  b.text("DESCRIPTION", { size: 8, bold: true, color: COLORS.muted, x: colDesc });
  b.y += 8 * 1.35;
  b.textRight("QTY", colQty, { size: 8, bold: true, color: COLORS.muted });
  b.textRight("RATE", colRate + 40, { size: 8, bold: true, color: COLORS.muted });
  b.textRight("AMOUNT", colAmt, { size: 8, bold: true, color: COLORS.muted });
  b.y -= 8 * 1.35;
  b.gap(8);

  const money = (v: unknown) => formatMoney(Number(v), invoice.currency);

  for (const item of invoice.items) {
    const startY = b.y;
    b.text(item.description, { size: 10, x: colDesc, maxWidth: 280 });
    const afterDesc = b.y;
    b.y = startY;
    b.textRight(String(Number(item.quantity)), colQty, { size: 10 });
    b.textRight(money(item.rate), colRate + 40, { size: 10 });
    b.textRight(money(item.amount), colAmt, { size: 10 });
    b.y = afterDesc;
    b.gap(6);
  }

  b.hr(14);

  // Totals block (right-aligned)
  const totals: Array<[string, string, boolean]> = [
    ["Subtotal", money(invoice.subtotal), false],
  ];
  const gstRate = Number(invoice.gstRate);
  if (invoice.gstType === "CGST_SGST") {
    totals.push([`CGST (${gstRate / 2}%)`, money(invoice.cgstAmount), false]);
    totals.push([`SGST (${gstRate / 2}%)`, money(invoice.sgstAmount), false]);
  } else if (invoice.gstType === "IGST") {
    totals.push([`IGST (${gstRate}%)`, money(invoice.igstAmount), false]);
  }
  totals.push(["Total", money(invoice.total), true]);

  for (const [label, value, isBold] of totals) {
    b.ensureSpace(16);
    b.y -= 2;
    const size = isBold ? 12 : 10;
    const labelWidth = (isBold ? b.bold : b.font).widthOfTextAtSize(label, size);
    b.page.drawText(label, {
      x: colRate - labelWidth,
      y: b.y - size,
      size,
      font: isBold ? b.bold : b.font,
      color: isBold ? COLORS.text : COLORS.muted,
    });
    b.textRight(value, colAmt, { size, bold: isBold });
    b.y -= size * 1.5;
  }

  if (invoice.notes) {
    b.gap(14);
    b.text("NOTES", { size: 8, bold: true, color: COLORS.muted });
    b.text(invoice.notes, { size: 9, color: COLORS.muted });
  }

  b.gap(20);
  b.text("Thank you for your business!", { size: 10, color: COLORS.primary });

  return b.bytes();
}

// ---------- Proposal PDF ----------

interface ProposalPdfData {
  title: string;
  content: ProposalContent;
  createdAt: Date;
}

export async function generateProposalPdf(
  proposal: ProposalPdfData,
  client: { name: string; company: string | null },
  user: InvoicePdfUser
): Promise<Uint8Array> {
  const b = await PdfBuilder.create();
  await b.embedLogo(user.logoUrl);
  const c = proposal.content;

  b.text(user.businessName || user.name, { size: 12, bold: true, color: COLORS.primary });
  b.gap(14);
  b.text(proposal.title, { size: 20, bold: true });
  b.text(
    `Prepared for ${client.name}${client.company ? `, ${client.company}` : ""} · ${formatDate(proposal.createdAt)}`,
    { size: 10, color: COLORS.muted }
  );
  b.gap(8);
  b.hr();

  const section = (heading: string) => {
    b.gap(10);
    b.text(heading.toUpperCase(), { size: 10, bold: true, color: COLORS.primary });
    b.gap(4);
  };

  if (c.executiveSummary) {
    section("Overview");
    b.text(c.executiveSummary, { size: 10.5 });
  }

  if (c.scopeOfWork?.length) {
    section("Scope of Work");
    for (const item of c.scopeOfWork) b.text(`•  ${item}`, { size: 10.5 });
  }

  if (c.deliverables?.length) {
    section("Deliverables");
    for (const item of c.deliverables) b.text(`•  ${item}`, { size: 10.5 });
  }

  if (c.timeline?.length) {
    section("Timeline");
    for (const phase of c.timeline) {
      b.text(`${phase.phase} — ${phase.duration}`, { size: 10.5, bold: true });
      if (phase.description) b.text(phase.description, { size: 10, color: COLORS.muted });
      b.gap(4);
    }
  }

  if (c.pricing?.length) {
    section("Investment");
    let total = 0;
    for (const row of c.pricing) {
      const startY = b.y;
      b.text(row.item, { size: 10.5, bold: true, maxWidth: 360 });
      if (row.description) b.text(row.description, { size: 9.5, color: COLORS.muted, maxWidth: 360 });
      const afterLeft = b.y;
      b.y = startY;
      b.textRight(formatINR(row.amount || 0), PAGE_W - MARGIN, { size: 10.5, bold: true });
      b.y = afterLeft;
      b.gap(6);
      total += Number(row.amount) || 0;
    }
    b.hr(10);
    b.textRight(`Total: ${formatINR(total)}`, PAGE_W - MARGIN, { size: 12, bold: true });
    b.y -= 18;
  }

  if (c.terms?.length) {
    section("Terms & Conditions");
    for (const term of c.terms) b.text(`•  ${term}`, { size: 9.5, color: COLORS.muted });
  }

  return b.bytes();
}
