/* ── One display currency for the whole app ──────────────────────────────────
 * Ledgers stay in each institution's own currency (AED in Dubai, LKR in
 * Colombo, AUD in Sydney…) — that's what production stores and regulators and
 * banks see. The DEMO shows every amount in ONE display currency, chosen with
 * the header currency control (default GBP), so screens never mix £, $, AED
 * and Rs. `money()` (regions.ts) and the classic `formatMoney()` both convert
 * through this table. Inputs take the display currency and convert back with
 * `toLedger()` before saving. Rates are static and demo-grade. */

/** Units of each currency per 1 USD. */
export const FX_PER_USD: Record<string, number> = {
  USD: 1,
  GBP: 0.79,
  EUR: 0.92,
  LKR: 305,
  INR: 84,
  AED: 3.6725,
  SAR: 3.75,
  QAR: 3.64,
  AUD: 1.52,
  SGD: 1.34,
  MYR: 4.7,
};

const PREFS_KEY = "oneedu.prefs.v1";

function initial(): string {
  if (typeof window === "undefined") return "GBP";
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    const c = raw ? (JSON.parse(raw) as { currency?: string }).currency : undefined;
    return c && FX_PER_USD[c] ? c : "GBP";
  } catch {
    return "GBP";
  }
}

let display = initial();

export const getDisplayCurrency = () => display;
export function setDisplayCurrency(c: string) {
  if (FX_PER_USD[c]) display = c;
}

/** Convert an amount between currencies (unknown codes pass through). */
export function convert(amount: number, from: string, to: string = display): number {
  const f = FX_PER_USD[from];
  const t = FX_PER_USD[to];
  if (!f || !t || from === to) return amount;
  return (amount / f) * t;
}

/** A display-currency amount typed by a user → the ledger currency to store. */
export const toLedger = (displayAmount: number, ledgerCurrency: string) =>
  Math.round(convert(displayAmount, display, ledgerCurrency));

/** A stored ledger amount → the display currency (for prefilling inputs). */
export const fromLedger = (ledgerAmount: number, ledgerCurrency: string) =>
  Math.round(convert(ledgerAmount, ledgerCurrency, display));

const SYMBOL: Record<string, string> = { GBP: "£", USD: "$", EUR: "€", LKR: "Rs", INR: "₹" };
/** Short label for input fields, e.g. "£" or "AED". */
export const displaySymbol = () => SYMBOL[display] ?? display;
