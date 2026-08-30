/**
 * Exchange rates by currency and date.
 *
 * WHY THIS EXISTS. The business instruction of 27 August 2026 makes the fund's exchange
 * rate **read only, auto calculated based on the currency exchange during the actual
 * payment date**. That sentence needs a rate table behind it: a rate is no longer a
 * number a person types on the fund, it is a property of the currency on a date, and the
 * fund merely reads it. This is that table.
 *
 * THIS TABLE IS A STAND-IN, AND IS MEANT TO BE REPLACED. Confirmed on 27 August 2026:
 * **in the real application the exchange rate will be supplied by an API.** The rates
 * below are therefore dummy figures — synthetic, like every other number in this
 * prototype, and no real published rate is reproduced. What they exist to demonstrate is
 * the *behaviour* the instruction asks for: the rate is a property of a currency on a
 * date, the fund reads it rather than holding it, and reading it on the actual payment
 * date is what gives the fund a value in USD.
 *
 * WHAT REPLACING IT WILL TAKE. One function. Every screen and every derivation goes
 * through `exchangeRateOn(currency, date)`; nothing else in the prototype knows this file
 * exists. Swap its body for the API call and the rest is unchanged. Three things the API
 * contract will need to settle, which this stand-in answers only for demonstration:
 *   · **granularity** — these are monthly and read forward, so a payment on 18 June uses
 *     the 1 June rate. A daily feed would change the numbers and nothing else;
 *   · **which rate** — a central bank publication, the bank's own rate on the transfer,
 *     or a rate maintained in COTS. Not stated, and not guessed at here;
 *   · **the miss case** — what a payment dated outside what the source can answer for
 *     should do. `exchangeRateOn` returns `undefined` and the fund is refused with a
 *     readable reason, rather than falling back to the nearest rate it happens to hold.
 *
 * HOW A RATE IS CHOSEN. The rate **in force on** the date asked for: the latest rate
 * whose effective date is on or before it. A payment on 18 June 2026 therefore uses the
 * 1 June 2026 rate, not the 1 July one. A date before the table begins has no rate at
 * all — the prototype says so rather than falling back to the earliest, because a rate
 * that predates its own currency's record is not a rate.
 */

import type { CurrencyCode, IsoDate } from "../domain/types";

export interface FxRate {
  /** How many units of the local currency buy one USD. */
  currency: CurrencyCode;
  /** The date this rate takes effect, and stays in effect until the next one. */
  effectiveFrom: IsoDate;
  /** Local currency per USD. */
  perUsd: number;
}

/**
 * Synthetic monthly rates for the two local currencies the demo data uses, over the
 * period the seeded funds and receipts sit in. SDG drifts upward through the season,
 * which is what makes the "rate on the actual payment date" rule visible: the same
 * amount in SDG is worth less in USD the later it is paid.
 */
export const FX_RATES: FxRate[] = [
  { currency: "SDG", effectiveFrom: "2026-01-01", perUsd: 560 },
  { currency: "SDG", effectiveFrom: "2026-02-01", perUsd: 566 },
  { currency: "SDG", effectiveFrom: "2026-03-01", perUsd: 572 },
  { currency: "SDG", effectiveFrom: "2026-04-01", perUsd: 580 },
  { currency: "SDG", effectiveFrom: "2026-05-01", perUsd: 585 },
  { currency: "SDG", effectiveFrom: "2026-06-01", perUsd: 600 },
  { currency: "SDG", effectiveFrom: "2026-07-01", perUsd: 612 },
  { currency: "SDG", effectiveFrom: "2026-08-01", perUsd: 618 },
  { currency: "SDG", effectiveFrom: "2026-09-01", perUsd: 626 },
  { currency: "SDG", effectiveFrom: "2026-10-01", perUsd: 634 },
  { currency: "SDG", effectiveFrom: "2026-11-01", perUsd: 641 },
  { currency: "SDG", effectiveFrom: "2026-12-01", perUsd: 650 },
  { currency: "SDG", effectiveFrom: "2027-01-01", perUsd: 658 },
  { currency: "SDG", effectiveFrom: "2027-02-01", perUsd: 665 },

  { currency: "ETB", effectiveFrom: "2026-01-01", perUsd: 128 },
  { currency: "ETB", effectiveFrom: "2026-04-01", perUsd: 131 },
  { currency: "ETB", effectiveFrom: "2026-07-01", perUsd: 134 },
  { currency: "ETB", effectiveFrom: "2026-10-01", perUsd: 137 },
  { currency: "ETB", effectiveFrom: "2027-01-01", perUsd: 140 },
];

/** Every rate held for one currency, earliest first. */
export function ratesFor(currency: CurrencyCode): FxRate[] {
  return FX_RATES.filter((r) => r.currency === currency).sort((a, b) =>
    a.effectiveFrom.localeCompare(b.effectiveFrom),
  );
}

/**
 * The rate in force for `currency` on `date` — the latest rate effective on or before it.
 *
 * Returns `undefined` where no rate is in force, which happens in two cases the screens
 * both have to handle: no date has been given yet (a fund that has not been paid), and a
 * date earlier than the first rate held for the currency. Neither is guessed at.
 */
export function exchangeRateOn(currency: CurrencyCode, date?: IsoDate): FxRate | undefined {
  if (!date) return undefined;
  const candidates = ratesFor(currency).filter((r) => r.effectiveFrom <= date);
  return candidates.length > 0 ? candidates[candidates.length - 1] : undefined;
}

/** The currencies the table holds a rate for. */
export function fxCurrencies(): CurrencyCode[] {
  return [...new Set(FX_RATES.map((r) => r.currency))];
}

/** The window the table covers for a currency, for saying so on screen. */
export function fxCoverage(currency: CurrencyCode): { from?: IsoDate; to?: IsoDate } {
  const rates = ratesFor(currency);
  return { from: rates[0]?.effectiveFrom, to: rates[rates.length - 1]?.effectiveFrom };
}
