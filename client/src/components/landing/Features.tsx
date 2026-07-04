import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircle2,
  LayoutDashboard,
  Receipt,
  Sparkles,
  Users,
} from "lucide-react";
import { Reveal } from "./Reveal";
import { cn } from "@/lib/utils";

const features = [
  {
    id: "proposals",
    icon: Sparkles,
    title: "AI Proposals",
    description:
      "Brief likho, AI se polished proposal pao — English ya Hinglish, formal ya casual. Edit karo, PDF ya presentation bana ke bhejo.",
  },
  {
    id: "invoicing",
    icon: Receipt,
    title: "Invoice Generator",
    description:
      "GST-ready invoices (CGST/SGST/IGST), multi-currency, recurring retainers, branded PDFs — sab automatic calculate hota hai.",
  },
  {
    id: "clients",
    icon: Users,
    title: "Client Management",
    description:
      "Har client ka poora history ek jagah — proposals, invoices, payments. Kaun active hai, kiska payment pending hai, sab clear.",
  },
  {
    id: "dashboard",
    icon: LayoutDashboard,
    title: "Dashboard & Payments",
    description:
      "Revenue chart, pending invoices, Razorpay payment links — client link pe pay kare aur invoice khud 'Paid' ho jaye.",
  },
] as const;

type FeatureId = (typeof features)[number]["id"];

function MockShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-xl shadow-brand-ink/5 sm:p-5">
      <div className="mb-3 flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-brand-mauve/40" />
        <span className="h-2 w-2 rounded-full bg-brand-mauve/25" />
        <span className="h-2 w-2 rounded-full bg-brand-mauve/15" />
      </div>
      {children}
    </div>
  );
}

const line = (w: string, i: number, dark = false) => (
  <motion.div
    key={i}
    initial={{ width: 0, opacity: 0 }}
    animate={{ width: w, opacity: 1 }}
    transition={{ delay: 0.25 + i * 0.12, duration: 0.35 }}
    className={cn("h-2 rounded-full", dark ? "bg-foreground/15" : "bg-secondary")}
  />
);

function ProposalsMock() {
  return (
    <MockShell>
      <div className="rounded-lg border bg-background p-3">
        <p className="text-[10px] font-semibold text-muted-foreground">PROJECT BRIEF</p>
        <p className="mt-1 text-xs">
          "Jewellery brand ke liye e-commerce site — catalog, UPI checkout…"
        </p>
      </div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="my-2 flex items-center gap-1.5 text-[10px] font-semibold text-primary"
      >
        <Sparkles className="h-3 w-3" /> Generating with AI…
      </motion.div>
      <div className="space-y-2 rounded-lg border bg-background p-3">
        <p className="text-xs font-bold">E-Commerce Website Proposal</p>
        <div className="space-y-1.5">{["95%", "80%", "88%", "60%"].map((w, i) => line(w, i))}</div>
        <div className="flex gap-1.5 pt-1">
          {["Scope", "Timeline", "Pricing", "Terms"].map((s, i) => (
            <motion.span
              key={s}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.8 + i * 0.12, type: "spring", stiffness: 300, damping: 16 }}
              className="rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-semibold text-primary"
            >
              {s}
            </motion.span>
          ))}
        </div>
      </div>
    </MockShell>
  );
}

function InvoicingMock() {
  const rows = [
    ["Website design", "₹45,000"],
    ["SEO setup", "₹12,000"],
  ];
  return (
    <MockShell>
      <div className="space-y-2">
        {rows.map(([d, a], i) => (
          <motion.div
            key={d}
            initial={{ opacity: 0, x: -14 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 + i * 0.15 }}
            className="flex items-center justify-between rounded-lg border bg-background px-3 py-2 text-xs"
          >
            <span>{d}</span>
            <span className="font-semibold">{a}</span>
          </motion.div>
        ))}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55 }}
          className="flex items-center justify-between rounded-lg bg-secondary/70 px-3 py-2 text-xs"
        >
          <span className="text-muted-foreground">+ GST 18% (CGST + SGST)</span>
          <span className="font-semibold">₹10,260</span>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.75, type: "spring", stiffness: 260, damping: 18 }}
          className="flex items-center justify-between rounded-lg bg-primary px-3 py-2.5 text-xs text-primary-foreground"
        >
          <span className="font-semibold">Total · INV-2026-0042</span>
          <span className="font-display font-bold">₹67,260</span>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          className="flex items-center justify-between px-1 text-[10px] text-muted-foreground"
        >
          <span>Razorpay link bheja gaya ✓</span>
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 1.4, type: "spring", stiffness: 320, damping: 14 }}
            className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 font-semibold text-green-700"
          >
            <CheckCircle2 className="h-3 w-3" /> Paid
          </motion.span>
        </motion.div>
      </div>
    </MockShell>
  );
}

function ClientsMock() {
  const clients = [
    ["RM", "Rohan Mehta", "Mehta Textiles", "3 invoices · ₹1.2L", "ACTIVE"],
    ["PK", "Priya Kapoor", "Kapoor Events", "2 proposals · 1 pending", "ACTIVE"],
    ["AS", "Arjun Shah", "Shah Exports", "Last paid: June", "INACTIVE"],
  ];
  return (
    <MockShell>
      <div className="space-y-2">
        {clients.map(([init, name, co, meta, status], i) => (
          <motion.div
            key={name}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.15 }}
            className="flex items-center gap-3 rounded-lg border bg-background p-3"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">
              {init}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold">
                {name} <span className="font-normal text-muted-foreground">· {co}</span>
              </p>
              <p className="text-[10px] text-muted-foreground">{meta}</p>
            </div>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[9px] font-semibold",
                status === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"
              )}
            >
              {status === "ACTIVE" ? "Active" : "Inactive"}
            </span>
          </motion.div>
        ))}
      </div>
    </MockShell>
  );
}

function DashboardMock() {
  const bars = [30, 55, 42, 70, 60, 92];
  return (
    <MockShell>
      <div className="grid grid-cols-3 gap-2">
        {[
          ["Revenue", "₹1.2L"],
          ["Pending", "₹34K"],
          ["Clients", "12"],
        ].map(([l, v], i) => (
          <motion.div
            key={l}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.12 }}
            className="rounded-lg border bg-background p-2.5"
          >
            <p className="text-[9px] text-muted-foreground">{l}</p>
            <p className="font-display text-sm font-bold">{v}</p>
          </motion.div>
        ))}
      </div>
      <div className="mt-3 rounded-lg border bg-background p-3">
        <p className="mb-2 text-[10px] font-semibold text-muted-foreground">
          REVENUE — LAST 6 MONTHS
        </p>
        <div className="flex h-20 items-end gap-1.5">
          {bars.map((h, i) => (
            <motion.div
              key={i}
              initial={{ height: 0 }}
              animate={{ height: `${h}%` }}
              transition={{ delay: 0.5 + i * 0.1, duration: 0.45, ease: "easeOut" }}
              className="flex-1 rounded-t bg-primary/70"
            />
          ))}
        </div>
      </div>
    </MockShell>
  );
}

const mocks: Record<FeatureId, () => JSX.Element> = {
  proposals: ProposalsMock,
  invoicing: InvoicingMock,
  clients: ClientsMock,
  dashboard: DashboardMock,
};

export function Features() {
  const [active, setActive] = useState<FeatureId>("proposals");
  const ActiveMock = mocks[active];

  return (
    <section id="features" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6">
      <Reveal className="mx-auto max-w-2xl text-center">
        <span className="text-xs font-bold uppercase tracking-widest text-primary">Features</span>
        <h2 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">
          Poora business, <span className="text-primary">ek dashboard</span>
        </h2>
        <p className="mt-3 text-muted-foreground">
          Proposal bhejne se le kar payment aane tak — freelancr har step handle karta hai.
        </p>
      </Reveal>

      <div className="mt-12 grid items-center gap-8 lg:grid-cols-2">
        <Reveal className="order-2 lg:order-1">
          <div className="flex flex-col gap-2">
            {features.map((feature) => (
              <button
                key={feature.id}
                onClick={() => setActive(feature.id)}
                className={cn(
                  "group rounded-xl border p-4 text-left transition-all",
                  active === feature.id
                    ? "border-primary/40 bg-card shadow-md shadow-primary/10"
                    : "border-transparent hover:border-border hover:bg-card/60"
                )}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors",
                      active === feature.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-primary"
                    )}
                  >
                    <feature.icon className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="font-display text-sm font-semibold">{feature.title}</p>
                    <AnimatePresence initial={false}>
                      {active === feature.id && (
                        <motion.p
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="overflow-hidden text-xs leading-relaxed text-muted-foreground"
                        >
                          {feature.description}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </Reveal>

        <Reveal delay={0.15} className="order-1 lg:order-2">
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.98 }}
              transition={{ duration: 0.3 }}
            >
              <ActiveMock />
            </motion.div>
          </AnimatePresence>
        </Reveal>
      </div>
    </section>
  );
}
