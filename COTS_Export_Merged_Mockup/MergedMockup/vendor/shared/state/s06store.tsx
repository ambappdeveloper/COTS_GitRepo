import React, { createContext, useContext, useState } from 'react';
import {
  DEBIT_NOTES, SMA_PRICES, SMA_SALES, STOCK_LINES, TRANSFERS,
  type DebitNote, type SmaPrice, type SmaSale, type StockLine, type Transfer,
} from '../mockData/s06';

type Ctx = {
  stock: StockLine[];
  /** apply the SMA attribute to an existing stock line — nothing else about the line changes */
  flagStock: (lineId: string, transferRef: string) => void;
  snapshotBefore: Record<string, StockLine>;

  transfers: Transfer[];
  addTransfer: (t: Transfer) => void;
  approveTransfer: (id: string) => void;

  prices: SmaPrice[];
  addPrice: (p: SmaPrice) => void;
  updatePrice: (id: string, patch: Partial<SmaPrice>) => void;

  sales: SmaSale[];
  addSale: (s: SmaSale) => void;
  updateSale: (id: string, patch: Partial<SmaSale>) => void;

  debitNotes: DebitNote[];
  addDebitNote: (d: DebitNote) => void;

  // labelled prototype assumptions — see S06-uiux §6
  transferNeedsApproval: boolean;
  setTransferNeedsApproval: (v: boolean) => void;
  invoiceInCots: boolean;
  setInvoiceInCots: (v: boolean) => void;
};

const C = createContext<Ctx | null>(null);
export const useS06 = () => {
  const c = useContext(C);
  if (!c) throw new Error('S06Provider missing');
  return c;
};

/** Price effective at a date, for a country and commodity. */
export function priceAt(prices: SmaPrice[], country: string, commodity: string, at = '21-Aug-2026') {
  const d = (s: string) => new Date(s.replace(/(\d+)-(\w+)-(\d+)/, '$2 $1, $3')).getTime();
  return prices.find(
    (p) => p.country === country && p.commodity === commodity && d(p.effectiveFrom) <= d(at) && d(at) <= d(p.effectiveTo),
  );
}

export function S06Provider({ children }: { children: React.ReactNode }) {
  const [stock, setStock] = useState<StockLine[]>(() => JSON.parse(JSON.stringify(STOCK_LINES)));
  const [snapshotBefore, setSnapshotBefore] = useState<Record<string, StockLine>>({});
  const [transfers, setTransfers] = useState<Transfer[]>(() => JSON.parse(JSON.stringify(TRANSFERS)));
  const [prices, setPrices] = useState<SmaPrice[]>(() => JSON.parse(JSON.stringify(SMA_PRICES)));
  const [sales, setSales] = useState<SmaSale[]>(() => JSON.parse(JSON.stringify(SMA_SALES)));
  const [debitNotes, setDebitNotes] = useState<DebitNote[]>(() => JSON.parse(JSON.stringify(DEBIT_NOTES)));
  const [transferNeedsApproval, setTransferNeedsApproval] = useState(false);
  const [invoiceInCots, setInvoiceInCots] = useState(false);

  const value: Ctx = {
    stock,
    snapshotBefore,
    flagStock: (lineId, transferRef) =>
      setStock((prev) =>
        prev.map((l) => {
          if (l.id !== lineId) return l;
          // keep a copy of the line as it was, so the before/after comparison can prove
          // that only the SMA attribute changed
          setSnapshotBefore((s) => (s[lineId] ? s : { ...s, [lineId]: JSON.parse(JSON.stringify(l)) }));
          return { ...l, sma: true, transferRef };
        }),
      ),
    transfers,
    addTransfer: (t) => setTransfers((p) => [t, ...p]),
    approveTransfer: (id) => setTransfers((p) => p.map((t) => (t.id === id ? { ...t, approval: 'Approved' } : t))),
    prices,
    addPrice: (p) => setPrices((prev) => [p, ...prev]),
    updatePrice: (id, patch) => setPrices((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p))),
    sales,
    addSale: (s) => setSales((p) => [s, ...p]),
    updateSale: (id, patch) => setSales((p) => p.map((s) => (s.id === id ? { ...s, ...patch } : s))),
    debitNotes,
    addDebitNote: (d) => setDebitNotes((p) => [d, ...p]),
    transferNeedsApproval,
    setTransferNeedsApproval,
    invoiceInCots,
    setInvoiceInCots,
  };

  return <C.Provider value={value}>{children}</C.Provider>;
}
