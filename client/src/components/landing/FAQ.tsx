import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { Reveal } from "./Reveal";
import { cn } from "@/lib/utils";

const faqs = [
  {
    q: "Kya main free plan pe hamesha reh sakta hoon?",
    a: "Bilkul! Starter plan hamesha free rahega — 3 clients, 5 AI proposals aur 5 invoices har mahine. Jab kaam badhe, tab upgrade karo.",
  },
  {
    q: "AI proposals Hinglish mein bhi bante hain?",
    a: "Haan — tone (formal/casual) aur language (English/Hinglish) dono choose kar sakte ho. AI aapke brief ke hisaab se scope, timeline, pricing aur terms generate karta hai, jo aap poora edit kar sakte ho.",
  },
  {
    q: "Payments kaise collect hote hain?",
    a: "Invoice bhejte waqt Razorpay payment link automatically generate hota hai. Client bina login ke UPI/card/netbanking se pay karta hai, aur invoice khud 'Paid' mark ho jaata hai.",
  },
  {
    q: "Kya invoices GST-compliant hote hain?",
    a: "Haan — GSTIN, CGST/SGST (same state) ya IGST (inter-state) breakdown, 5/12/18/28% rates, sab supported. Aapka business name aur logo bhi PDF pe aata hai.",
  },
  {
    q: "International clients ke liye USD/EUR invoice bana sakte hain?",
    a: "Bilkul — INR ke alawa USD, EUR aur AED supported hain. Currency invoice level pe set hoti hai aur PDF, email sab usi currency mein jaata hai.",
  },
  {
    q: "Mera data kitna safe hai?",
    a: "Aapka data aapka hai. Passwords bcrypt se hashed hain, sessions httpOnly cookies mein, aur payment webhooks signature-verified hote hain. Hum aapka data kisi ko bechte nahi.",
  },
];

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="mx-auto max-w-3xl scroll-mt-20 px-4 py-20 sm:px-6">
      <Reveal className="text-center">
        <span className="text-xs font-bold uppercase tracking-widest text-primary">FAQ</span>
        <h2 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">
          Sawaal? <span className="text-primary">Jawaab yahan hai.</span>
        </h2>
      </Reveal>

      <div className="mt-10 space-y-3">
        {faqs.map((faq, i) => {
          const isOpen = open === i;
          return (
            <Reveal key={i} delay={i * 0.06}>
              <div
                className={cn(
                  "overflow-hidden rounded-xl border bg-card transition-shadow",
                  isOpen && "shadow-md shadow-primary/5"
                )}
              >
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                >
                  <span className="font-display text-sm font-semibold sm:text-base">
                    {faq.q}
                  </span>
                  <motion.span
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.25 }}
                    className="shrink-0 text-primary"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </motion.span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                    >
                      <p className="px-5 pb-4 text-sm leading-relaxed text-muted-foreground">
                        {faq.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}
