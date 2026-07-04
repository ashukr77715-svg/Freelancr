import { motion } from "framer-motion";
import { Star } from "lucide-react";
import { Reveal } from "./Reveal";

const testimonials = [
  {
    quote:
      "Pehle proposal banane mein poora din jaata tha. Ab brief daalta hoon, 20 second mein client-ready proposal. Conversion bhi badh gaya!",
    name: "Rohit Sharma",
    role: "Freelance Web Developer, Pune",
    initials: "RS",
  },
  {
    quote:
      "GST invoice + Razorpay link ek saath jaata hai, toh clients ko excuse hi nahi milta. Payment cycle 45 din se 12 din pe aa gaya. 🙏",
    name: "Ananya Iyer",
    role: "Brand Designer, Bengaluru",
    initials: "AI",
  },
  {
    quote:
      "Humari 4-log ki agency ke liye perfect hai. Har client ka history ek jagah — kaun sa proposal gaya, kya paid hai, sab clear dikhta hai.",
    name: "Kabir & Meher",
    role: "Studio Dastaan, Delhi",
    initials: "SD",
  },
  {
    quote:
      "Hinglish proposals are a game changer, boss. Mere clients ko formal angrezi se zyada apna-sa lagta hai. Closed 3 deals is mahine!",
    name: "Farhan Qureshi",
    role: "Social Media Consultant, Mumbai",
    initials: "FQ",
  },
];

export function Testimonials() {
  return (
    <section className="border-y border-border/60 bg-card/40 py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-bold uppercase tracking-widest text-primary">
            Testimonials
          </span>
          <h2 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Freelancers <span className="text-primary">bol rahe hain</span>
          </h2>
        </Reveal>

        <div className="mt-12 grid gap-5 sm:grid-cols-2">
          {testimonials.map((t, i) => (
            <Reveal key={t.name} delay={i * 0.1}>
              <motion.figure
                whileHover={{ y: -5, rotate: i % 2 ? 0.4 : -0.4 }}
                transition={{ type: "spring", stiffness: 300, damping: 22 }}
                className="flex h-full flex-col rounded-2xl border bg-card p-6 shadow-sm"
              >
                <div className="flex gap-0.5 text-primary">
                  {Array.from({ length: 5 }).map((_, s) => (
                    <Star key={s} className="h-3.5 w-3.5 fill-current" />
                  ))}
                </div>
                <blockquote className="mt-3 flex-1 text-sm leading-relaxed text-foreground/85">
                  "{t.quote}"
                </blockquote>
                <figcaption className="mt-5 flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                    {t.initials}
                  </span>
                  <div>
                    <p className="text-sm font-semibold">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </figcaption>
              </motion.figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
