import { useNavigate } from "react-router-dom";
import { motion, type Variants } from "framer-motion";
import { ArrowRight, CheckCircle2, PlayCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const headlineWords = ["Client", "Kaam,", "AI", "Ke", "Saath,", "Ek", "Click", "Mein."];

const wordVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.15 + i * 0.08, duration: 0.5, ease: "easeOut" },
  }),
};

/** Miniature animated product mockup rendered in pure JSX (no images). */
function HeroMockup() {
  const bars = [34, 52, 40, 68, 56, 88];
  return (
    <motion.div
      initial={{ opacity: 0, y: 40, rotate: 1.5 }}
      animate={{ opacity: 1, y: 0, rotate: 0 }}
      transition={{ delay: 0.55, duration: 0.7, ease: "easeOut" }}
      whileHover={{ y: -6, transition: { duration: 0.3 } }}
      className="relative mx-auto w-full max-w-lg"
    >
      <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-2xl shadow-brand-ink/10 sm:p-5">
        {/* window chrome */}
        <div className="mb-4 flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-brand-mauve/40" />
          <span className="h-2.5 w-2.5 rounded-full bg-brand-mauve/25" />
          <span className="h-2.5 w-2.5 rounded-full bg-brand-mauve/15" />
          <span className="ml-3 text-[10px] font-semibold tracking-wide text-muted-foreground">
            freelancr dashboard
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* revenue card */}
          <div className="rounded-xl border bg-background p-3">
            <p className="text-[10px] font-medium text-muted-foreground">Revenue (July)</p>
            <motion.p
              className="font-display text-lg font-bold"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.1 }}
            >
              ₹1,24,500
            </motion.p>
            <div className="mt-2 flex h-12 items-end gap-1">
              {bars.map((h, i) => (
                <motion.div
                  key={i}
                  className="flex-1 rounded-t bg-primary/70"
                  initial={{ height: 0 }}
                  animate={{ height: `${h}%` }}
                  transition={{ delay: 1 + i * 0.1, duration: 0.5, ease: "easeOut" }}
                />
              ))}
            </div>
          </div>

          {/* proposal card */}
          <div className="rounded-xl border bg-background p-3">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-primary" />
              <p className="text-[10px] font-medium text-muted-foreground">AI Proposal</p>
            </div>
            <div className="mt-2 space-y-1.5">
              {[100, 85, 92, 60].map((w, i) => (
                <motion.div
                  key={i}
                  className="h-1.5 rounded-full bg-secondary"
                  initial={{ width: 0 }}
                  animate={{ width: `${w}%` }}
                  transition={{ delay: 1.3 + i * 0.15, duration: 0.4 }}
                />
              ))}
            </div>
            <motion.span
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 2.1, type: "spring", stiffness: 300, damping: 18 }}
              className="mt-2 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-semibold text-primary"
            >
              Ready to send ✦
            </motion.span>
          </div>
        </div>

        {/* invoice row */}
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 1.7, duration: 0.45 }}
          className="mt-3 flex items-center justify-between rounded-xl border bg-background px-3 py-2.5"
        >
          <div>
            <p className="text-[11px] font-semibold">INV-2026-0042 · Mehta Textiles</p>
            <p className="text-[9px] text-muted-foreground">Sent with Razorpay link</p>
          </div>
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 2.4, type: "spring", stiffness: 320, damping: 15 }}
            className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[9px] font-semibold text-green-700"
          >
            <CheckCircle2 className="h-3 w-3" /> Paid
          </motion.span>
        </motion.div>
      </div>

      {/* floating chips */}
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ repeat: Infinity, duration: 4.5, ease: "easeInOut" }}
        className="absolute -left-4 top-8 hidden rounded-xl border bg-card px-3 py-2 shadow-lg sm:block"
      >
        <p className="text-[10px] font-semibold">🇮🇳 GST-ready invoices</p>
      </motion.div>
      <motion.div
        animate={{ y: [0, 12, 0] }}
        transition={{ repeat: Infinity, duration: 5.5, ease: "easeInOut", delay: 1 }}
        className="absolute -right-4 bottom-10 hidden rounded-xl border bg-card px-3 py-2 shadow-lg sm:block"
      >
        <p className="text-[10px] font-semibold">⚡ Proposal in 20 sec</p>
      </motion.div>
    </motion.div>
  );
}

export function Hero() {
  const navigate = useNavigate();

  return (
    <section className="relative overflow-hidden">
      {/* animated brand blobs */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-24 right-[-10%] h-96 w-96 animate-blob rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute left-[-12%] top-40 h-80 w-80 animate-blob-slow rounded-full bg-brand-mauve/10 blur-3xl" />
        <div className="absolute bottom-[-20%] left-1/3 h-96 w-96 animate-blob rounded-full bg-secondary/60 blur-3xl [animation-delay:-7s]" />
      </div>

      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-20 pt-14 sm:px-6 lg:grid-cols-2 lg:pb-28 lg:pt-20">
        <div>
          <motion.span
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary"
          >
            <Sparkles className="h-3.5 w-3.5" /> Freelance Ka Boss
          </motion.span>

          <h1 className="mt-5 font-display text-4xl font-bold leading-[1.12] tracking-tight sm:text-5xl lg:text-[3.4rem]">
            {headlineWords.map((word, i) => (
              <motion.span
                key={i}
                custom={i}
                variants={wordVariants}
                initial="hidden"
                animate="visible"
                className={
                  "mr-[0.28em] inline-block " +
                  (["AI", "Click"].includes(word.replace(/[^A-Za-z]/g, ""))
                    ? "text-primary"
                    : "")
                }
              >
                {word}
              </motion.span>
            ))}
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="mt-5 max-w-md text-balance text-base text-muted-foreground sm:text-lg"
          >
            AI proposals, GST invoices, client management aur payments — sab kuch ek
            dashboard mein. Built for Indian freelancers &amp; small agencies.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.5 }}
            className="mt-8 flex flex-wrap items-center gap-3"
          >
            <Button
              size="lg"
              onClick={() => navigate("/signup")}
              className="group gap-2 shadow-lg shadow-primary/30 transition-all hover:scale-[1.04] hover:shadow-xl hover:shadow-primary/35"
            >
              Start Free
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="gap-2 bg-card/60 transition-transform hover:scale-[1.03]"
              onClick={() =>
                document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })
              }
            >
              <PlayCircle className="h-4 w-4 text-primary" /> Watch Demo
            </Button>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.3 }}
            className="mt-5 text-xs text-muted-foreground"
          >
            Free plan available · No credit card needed · Hinglish proposals supported 🇮🇳
          </motion.p>
        </div>

        <HeroMockup />
      </div>
    </section>
  );
}
