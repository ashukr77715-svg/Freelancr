import { IndianRupee, Sparkles, UserPlus, UserRoundPlus } from "lucide-react";
import { Reveal } from "./Reveal";

const steps = [
  {
    icon: UserPlus,
    title: "Sign up free",
    text: "2 minute mein account banao — no credit card, no jhanjhat.",
  },
  {
    icon: UserRoundPlus,
    title: "Add your client",
    text: "Client ki details ek baar daalo, har proposal aur invoice mein auto-fill.",
  },
  {
    icon: Sparkles,
    title: "Generate & send",
    text: "AI proposal ya GST invoice banao aur PDF + payment link ke saath bhejo.",
  },
  {
    icon: IndianRupee,
    title: "Get paid",
    text: "Client Razorpay link pe pay kare, invoice apne aap 'Paid' ho jaye.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-20 border-y border-border/60 bg-card/40 py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-bold uppercase tracking-widest text-primary">
            How it works
          </span>
          <h2 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Sign up se <span className="text-primary">paid</span> tak — 4 steps
          </h2>
        </Reveal>

        <div className="relative mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* connecting line on desktop */}
          <div
            aria-hidden
            className="absolute left-[12%] right-[12%] top-7 hidden h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent lg:block"
          />
          {steps.map((step, i) => (
            <Reveal key={step.title} delay={i * 0.12} className="relative text-center">
              <div className="relative z-10 mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/25 bg-background shadow-md shadow-primary/10">
                <step.icon className="h-6 w-6 text-primary" />
                <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary font-display text-[10px] font-bold text-primary-foreground">
                  {i + 1}
                </span>
              </div>
              <h3 className="mt-4 font-display text-base font-semibold">{step.title}</h3>
              <p className="mx-auto mt-1.5 max-w-[230px] text-sm text-muted-foreground">
                {step.text}
              </p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
