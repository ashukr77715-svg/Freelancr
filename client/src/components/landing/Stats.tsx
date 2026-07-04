import { useEffect, useRef, useState } from "react";
import { animate, useInView } from "framer-motion";

interface Stat {
  value: number;
  format: (n: number) => string;
  label: string;
}

const stats: Stat[] = [
  {
    value: 10000,
    format: (n) => `${Math.round(n).toLocaleString("en-IN")}+`,
    label: "AI proposals generated",
  },
  {
    value: 2,
    format: (n) => `₹${n.toFixed(1)}Cr+`,
    label: "invoiced through freelancr",
  },
  {
    value: 500,
    format: (n) => `${Math.round(n)}+`,
    label: "freelancers & agencies",
  },
  {
    value: 4.9,
    format: (n) => `${n.toFixed(1)}★`,
    label: "average rating",
  },
];

function Counter({ stat }: { stat: Stat }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const [display, setDisplay] = useState(stat.format(0));

  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, stat.value, {
      duration: 1.6,
      ease: "easeOut",
      onUpdate: (v) => setDisplay(stat.format(v)),
    });
    return () => controls.stop();
  }, [inView, stat]);

  return (
    <span ref={ref} className="font-display text-3xl font-bold text-primary sm:text-4xl">
      {display}
    </span>
  );
}

export function Stats() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
      <div className="grid grid-cols-2 gap-8 rounded-2xl border bg-card p-8 shadow-sm sm:p-10 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="text-center">
            <Counter stat={stat} />
            <p className="mt-1.5 text-xs font-medium text-muted-foreground sm:text-sm">
              {stat.label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
