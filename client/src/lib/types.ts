export interface Client {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
  _count?: { proposals: number; invoices: number };
}

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

export interface Proposal {
  id: string;
  title: string;
  brief: string;
  budgetRange: string | null;
  timeline: string | null;
  tone: "FORMAL" | "CASUAL";
  language: "ENGLISH" | "HINGLISH";
  content: ProposalContent | null;
  status: "DRAFT" | "SENT" | "ACCEPTED" | "REJECTED";
  createdAt: string;
  client: { id: string; name: string; company: string | null; email?: string | null };
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: string;
  rate: string;
  amount: string;
}

export interface Payment {
  id: string;
  razorpayPaymentId: string | null;
  amount: string;
  method: string | null;
  status: string;
  paidAt: string | null;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  status: "DRAFT" | "SENT" | "PAID" | "OVERDUE";
  issueDate: string;
  dueDate: string | null;
  currency: string;
  isRecurring: boolean;
  recurringInterval: "MONTHLY" | "QUARTERLY" | "YEARLY" | null;
  nextRecurringDate: string | null;
  subtotal: string;
  gstType: "NONE" | "CGST_SGST" | "IGST";
  gstRate: string;
  cgstAmount: string;
  sgstAmount: string;
  igstAmount: string;
  total: string;
  notes: string | null;
  clientGstin: string | null;
  paymentLinkUrl: string | null;
  sentAt: string | null;
  paidAt: string | null;
  createdAt: string;
  client: {
    id: string;
    name: string;
    company: string | null;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
  };
  items?: InvoiceItem[];
  payments?: Payment[];
}

export interface ActivityEntry {
  id: string;
  type: string;
  message: string;
  createdAt: string;
}

export interface CurrencyAmount {
  currency: string;
  amount: number;
}

export interface DashboardSummary {
  revenue: { thisMonth: CurrencyAmount[]; allTime: CurrencyAmount[] };
  pendingInvoices: { count: number; amounts: CurrencyAmount[] };
  activeClients: number;
  proposalsThisMonth: number;
  chartCurrency: string;
  revenueByMonth: Array<{ month: string; amount: number }>;
  activity: ActivityEntry[];
}
