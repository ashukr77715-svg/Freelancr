import { Reveal } from "./Reveal";

const names = [
  "Pixel Studio",
  "Desi Designs",
  "CodeChai Labs",
  "Mumbai Motion",
  "Kirana Tech",
  "StudioSaanjh",
  "Bengaluru Builds",
  "Jaipur Junction",
];

export function TrustBar() {
  return (
    <section className="border-y border-border/60 bg-card/50 py-8">
      <Reveal>
        <p className="text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Trusted by 500+ Indian freelancers &amp; agencies
        </p>
      </Reveal>
      <div className="relative mt-6 overflow-hidden">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-20 bg-gradient-to-r from-background to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-20 bg-gradient-to-l from-background to-transparent" />
        <div className="flex w-max animate-marquee gap-14 pr-14">
          {[...names, ...names].map((name, i) => (
            <span
              key={i}
              className="whitespace-nowrap font-display text-lg font-semibold text-muted-foreground/50"
            >
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
