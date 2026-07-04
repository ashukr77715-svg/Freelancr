export const CURRENCIES = ["INR", "USD", "EUR", "AED"] as const;
export type Currency = (typeof CURRENCIES)[number];

export const CURRENCY_SYMBOL: Record<Currency, string> = {
  INR: "₹",
  USD: "$",
  EUR: "€",
  AED: "د.إ",
};

export function formatMoney(value: number | string, currency = "INR"): string {
  const num = typeof value === "string" ? Number(value) : value;
  const cur = (CURRENCIES.includes(currency as Currency) ? currency : "INR") as Currency;
  return new Intl.NumberFormat(cur === "INR" ? "en-IN" : "en-US", {
    style: "currency",
    currency: cur,
    maximumFractionDigits: Number.isInteger(num) ? 0 : 2,
  }).format(num);
}

export function formatINR(value: number | string): string {
  return formatMoney(value, "INR");
}

/** "₹64,900 + $500" for multi-currency totals; zero fallback in `currency`. */
export function formatMoneyList(
  entries: Array<{ currency: string; amount: number }> | undefined,
  zeroCurrency = "INR"
): string {
  if (!entries?.length) return formatMoney(0, zeroCurrency);
  return entries.map((e) => formatMoney(e.amount, e.currency)).join(" + ");
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatRelative(date: string | Date): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(date);
}
