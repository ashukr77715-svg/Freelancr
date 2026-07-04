export const SUPPORTED_CURRENCIES = ["INR", "USD", "EUR", "AED"] as const;
export type Currency = (typeof SUPPORTED_CURRENCIES)[number];

// PDF-safe prefixes: pdf-lib's standard fonts are WinAnsi-encoded, which has
// $ and € but not ₹ or د.إ — so INR uses "Rs." and AED uses "AED".
const PDF_PREFIX: Record<Currency, string> = {
  INR: "Rs. ",
  USD: "$",
  EUR: "€",
  AED: "AED ",
};

function groupDigits(value: number, currency: Currency): string {
  // Indian digit grouping (1,23,456.00) for INR, western for the rest.
  return value.toLocaleString(currency === "INR" ? "en-IN" : "en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function asCurrency(value: string | null | undefined): Currency {
  return SUPPORTED_CURRENCIES.includes(value as Currency)
    ? (value as Currency)
    : "INR";
}

/** Formats an amount for PDFs, emails, and activity messages. */
export function formatMoney(value: number | string, currency = "INR"): string {
  const num = typeof value === "string" ? Number(value) : value;
  const cur = asCurrency(currency);
  return PDF_PREFIX[cur] + groupDigits(num, cur);
}
