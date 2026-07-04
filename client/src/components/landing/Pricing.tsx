import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { Reveal } from "./Reveal";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Plan {
  name: string;
  monthly: number;
  yearly: number; // effective per-month when billed yearly
  tagline: string;
  features: string[];
  cta: string;
  highlighted?: boolean;
}

const plans: Plan[] = [
  {
    name: "Starter",
    monthly: 0,
    yearly: 0,
    tagline: "Shuruaat ke liye perfect",
    features: [
      "Up to 3 clients",
      "5 AI proposals/month",
      "5 invoices/month",
      "Basic dashboard",
    ],
    cta: "Start Free",
  },
  {
    name: "Pro",
    monthly: 499,
    yearly: 399,
    tagline: "Serious freelancers ke liye",
    features: [
      "Unlimited clients",
      "50 AI proposals/month",
      "Unlimited invoices",
      "Razorpay payment collection",
      "Priority support",
    ],
    cta: "Go Pro",
    highlighted: true,
  },
  {
    name: "Agency",
    monthly: 1499,
    yearly: 1199,
    tagline: "Teams aur studios ke liye",
    features: [
      "Everything in Pro",
      "Unlimited AI proposals",
      "Team members (up to 5 seats)",
      "Custom branding on documents",
      "Dedicated account support",
    ],
    cta: "Go Agency",
  },
];

export function Pricing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [yearly, setYearly] = useState(false);

  function choosePlan(plan: Plan) {
    if (!user) {
      navigate("/signup");
      return;
    }
    // Logged in: Starter → dashboard, paid plans → in-app upgrade page.
    if (plan.name === "Starter") {
      navigate("/dashboard");
    } else {
      navigate(
        `/billing?plan=${plan.name.toUpperCase()}&cycle=${yearly ? "YEARLY" : "MONTHLY"}`
      );
    }
  }

  return (
    <section id="pricing" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6">
      <Reveal className="mx-auto max-w-2xl text-center">
        <span className="text-xs font-bold uppercase tracking-widest text-primary">Pricing</span>
        <h2 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">
          Simple pricing, <span className="text-primary">no hidden charges</span>
        </h2>
        <p className="mt-3 text-muted-foreground">
          Free se shuru karo, jab business badhe tab upgrade karo.
        </p>

        {/* billing toggle */}
        <div className="mt-7 inline-flex items-center gap-3 rounded-full border bg-card p-1.5 pl-4">
          <span
            className={cn(
              "text-sm font-medium",
              !yearly ? "text-foreground" : "text-muted-foreground"
            )}
          >
            Monthly
          </span>
          <button
            role="switch"
            aria-checked={yearly}
            aria-label="Toggle yearly billing"
            onClick={() => setYearly((y) => !y)}
            className={cn(
              "relative h-6 w-11 rounded-full transition-colors",
              yearly ? "bg-primary" : "bg-muted-foreground/25"
            )}
          >
            <motion.span
              layout
              transition={{ type: "spring", stiffness: 500, damping: 32 }}
              className={cn(
                "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow",
                yearly ? "right-0.5" : "left-0.5"
              )}
            />
          </button>
          <span
            className={cn(
              "flex items-center gap-1.5 pr-1 text-sm font-medium",
              yearly ? "text-foreground" : "text-muted-foreground"
            )}
          >
            Yearly
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
              Save 20%
            </span>
          </span>
        </div>
      </Reveal>

      <div className="mt-12 grid items-stretch gap-6 lg:grid-cols-3">
        {plans.map((plan, i) => {
          const price = yearly ? plan.yearly : plan.monthly;
          return (
            <Reveal key={plan.name} delay={i * 0.12} className="h-full">
              <motion.div
                whileHover={{ y: -8 }}
                transition={{ type: "spring", stiffness: 300, damping: 22 }}
                className={cn(
                  "relative flex h-full flex-col rounded-2xl border bg-card p-7",
                  plan.highlighted
                    ? "border-primary/50 shadow-xl shadow-primary/15 ring-1 ring-primary/30"
                    : "shadow-sm"
                )}
              >
                {plan.highlighted && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-primary-foreground shadow-md">
                    Most Popular
                  </span>
                )}

                <h3 className="font-display text-lg font-bold">{plan.name}</h3>
                <p className="text-xs text-muted-foreground">{plan.tagline}</p>

                <div className="mt-5 flex items-baseline gap-1.5">
                  <span className="font-display text-4xl font-bold">
                    {price === 0 ? "Free" : `₹${price}`}
                  </span>
                  {price > 0 && (
                    <span className="text-sm text-muted-foreground">/month</span>
                  )}
                </div>
                {price > 0 && yearly && (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    billed yearly (₹{(price * 12).toLocaleString("en-IN")})
                  </p>
                )}

                <ul className="mt-6 flex-1 space-y-2.5">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-sm">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <Button
                  size="lg"
                  variant={plan.highlighted ? "default" : "outline"}
                  className={cn(
                    "mt-7 w-full transition-transform hover:scale-[1.02]",
                    plan.highlighted && "shadow-md shadow-primary/30"
                  )}
                  onClick={() => choosePlan(plan)}
                >
                  {user && plan.name !== "Starter" ? `Upgrade to ${plan.name}` : plan.cta}
                </Button>
              </motion.div>
            </Reveal>
          );
        })}
      </div>

      <Reveal className="mt-8 text-center text-xs text-muted-foreground">
        Prices in INR, GST extra. Cancel anytime — koi lock-in nahi.
      </Reveal>
    </section>
  );
}
