/**
 * Payment terms, read from the module that owns them — v2.8.
 *
 * THE QUESTION THIS ANSWERS
 * -------------------------
 * On 8 September 2026 the instruction was that all payment terms become a drop-down "come from
 * master data". The first pass put the list inside the Export prototype, beside the five masters
 * added on 6 September — packing sizes, B/L consignees, commodity types, bank branches, container
 * types — each of which carries an open question reading *which governed domain in C03 does this
 * belong to*. Five unclosed questions, and a sixth would have been added rather than any closed.
 *
 * That is the wrong answer, and C03's own domain browser says why, in its own words:
 *
 *     Nothing is entered as free text anywhere in COTS where a master record exists.
 *
 * A list held inside one module is not a master. It is a second copy, which is the same failure
 * `CountrySync` exists to prevent one level up: Core and Shared each keeping a private answer to
 * a question only one of them owns.
 *
 * SO PAYMENT TERMS ARE NOW A C03 DOMAIN
 * -------------------------------------
 * Two, in fact — `paymentinstrument` and `paymentterm`, in the Financial group beside `incoterm`,
 * a parent list and a child list in the shape `commodity` and `grade` already use. A purchase
 * contract carries the whole term, because the bank submittal maturity date is computed from its
 * tenor; an export contract carries the instrument alone. See `@core/mockData/c3`.
 *
 * WHY A SUBSCRIBER AND NOT AN IMPORT
 * ----------------------------------
 * The Export prototype builds and runs on its own, in its own repository, where `@core/*` does
 * not resolve. It cannot import C03, and making it able to would make it depend on Core for a
 * list it must be able to show alone. So Export keeps its list as a *default* and exposes
 * `setPaymentTermsSource`; this component reads C03 and pushes.
 *
 * That is the direction `CountrySync` established and the note in that file argues for at length:
 * the owning module publishes, the consuming module subscribes, and **no file in the consumed
 * module is patched**. Standalone Export shows its own list and says so. Integrated, it shows
 * C03's records and says that instead — the source is named on each of the three screens, so the
 * wiring is visible to a reviewer rather than being something they have to be told about.
 *
 * ONLY ACTIVE RECORDS CROSS
 * -------------------------
 * `paymentterm` is a governed domain, so a record can sit in Draft, Pending Approval, Rejected or
 * Returned for Amendment. Only Active records are offered on a contract, which is the entire point
 * of governing the domain: an unapproved tenor would move a payment date. Approve one in C3 and it
 * appears in the contract's drop-down without a reload, because this subscribes to the Core store
 * rather than to the seed.
 *
 * WHAT THIS FILE DOES NOT DO
 * --------------------------
 * It writes nothing to C03 and invents nothing. A term the C03 domain does not hold is not created
 * here — Export's own out-of-master rule shows such a value on the record and marks it, and the
 * fix is to add the record in C3, which is where master data is maintained.
 *
 * The other five Export-local masters are deliberately left alone. Each needs the same treatment
 * and each needs its C03 domain agreed first, and one of them — the commodity type added on
 * 6 September — is not an open question at all but a duplicate of C03's existing `grade` domain.
 * Doing them together, uninstructed, would hide that finding inside a refactor.
 */

import React from 'react';
import { useStore as useCoreStore } from '@core/store';
import { setPaymentTermsSource } from '@export/data/master';
import type { PaymentInstrument, PaymentTermMaster } from '@export/data/master';

/** How the master names itself on the Export screens that read it. */
export const PAYMENT_TERMS_SOURCE = 'C03 master data — the payment-term domain';

/** The C03 domain keys this reads. Named once so a rename fails in one place. */
const INSTRUMENT_DOMAIN = 'paymentinstrument';
const TERM_DOMAIN = 'paymentterm';

/**
 * Mirrors the active C03 payment records into the Export prototype's master.
 *
 * Placed inside the Core store's provider, above the route table, beside `CountrySync`.
 */
export function MasterDataSync({ children }: { children: React.ReactNode }) {
  const { masterRecords } = useCoreStore();

  const instruments: PaymentInstrument[] = React.useMemo(
    () =>
      masterRecords
        .filter((r: any) => r.domain === INSTRUMENT_DOMAIN && r.status === 'Active')
        .map((r: any) => ({ code: r.code, name: r.name, active: true })),
    [masterRecords],
  );

  const terms: PaymentTermMaster[] = React.useMemo(
    () =>
      masterRecords
        .filter((r: any) => r.domain === TERM_DOMAIN && r.status === 'Active')
        .map((r: any) => ({
          instrument: String(r.attrs?.Instrument ?? ''),
          /* The record's *name* is the term as it reads on a contract — `DA 60 days` — and is
             what Export stores, because that is the string every captured contract holds. The
             C03 code (PT-005) is the master's own key and never reaches a contract. */
          label: r.name,
          tenorDays: Number(r.attrs?.['Tenor (days from B/L date)'] ?? 0),
          active: true,
        })),
    [masterRecords],
  );

  React.useEffect(() => {
    /*
      An empty C03 result is not pushed.

      If the domain were ever renamed or the records removed, pushing an empty list would leave
      every payment-terms drop-down blank with no explanation, and a contract could not be saved
      at all. Leaving the Export default in place instead degrades to the pre-integration
      behaviour, which is wrong in a visible, explainable way rather than an invisible one. This
      is the same judgement `CountrySync` records about pushing a country with no data — except
      that there, an empty screen is the honest answer, and here it is not: a country with no
      records is a real state, a system with no payment terms is not.
    */
    if (terms.length === 0 || instruments.length === 0) return;
    setPaymentTermsSource({ instruments, terms, name: PAYMENT_TERMS_SOURCE });
  }, [instruments, terms]);

  return <>{children}</>;
}
