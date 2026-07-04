import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Reveal } from "./Reveal";
import { Button } from "@/components/ui/button";

export function CTABanner() {
  const navigate = useNavigate();

  return (
    <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
      <Reveal>
        <div className="relative overflow-hidden rounded-3xl bg-brand-ink px-6 py-14 text-center sm:px-12 sm:py-16">
          {/* mauve glow blobs */}
          <div
            aria-hidden
            className="pointer-events-none absolute -left-16 -top-16 h-64 w-64 animate-blob rounded-full bg-brand-mauve/30 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-20 -right-10 h-72 w-72 animate-blob-slow rounded-full bg-brand-mauve/20 blur-3xl"
          />

          <h2 className="relative font-display text-3xl font-bold tracking-tight text-brand-cream sm:text-4xl">
            Boss banne ka time aa gaya. 😎
          </h2>
          <p className="relative mx-auto mt-3 max-w-md text-brand-cream/70">
            Aaj hi free account banao — pehla AI proposal 2 minute mein bhejo.
          </p>
          <div className="relative mt-8">
            <Button
              size="lg"
              onClick={() => navigate("/signup")}
              className="group gap-2 bg-brand-mauve px-8 text-brand-cream shadow-lg shadow-brand-mauve/40 transition-all hover:scale-[1.05] hover:bg-brand-mauve/90"
            >
              Get Started Free
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Button>
          </div>
          <p className="relative mt-4 text-xs text-brand-cream/50">
            No credit card · Free forever plan · Cancel anytime
          </p>
        </div>
      </Reveal>
    </section>
  );
}
