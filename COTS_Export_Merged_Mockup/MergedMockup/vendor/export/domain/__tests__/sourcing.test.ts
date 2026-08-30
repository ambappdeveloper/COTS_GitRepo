/**
 * The derived figures for allocation, position, intake weights and movement.
 *
 * Each of these functions exists because a legacy screen either stored a derived value
 * and got it wrong, or showed no value at all where a number was needed. Every test
 * title below names the legacy defect the assertion pins down, so a failure says which
 * defect has come back rather than only which function broke.
 *
 * Fixtures come from `seed-v2.ts` wherever the captured MMP record is the point (the
 * over-allocated agreement `pa-3`, the concatenated-bags receipt `ir-5`, fund `fd-1`'s
 * 1,000,000 ÷ 600). Where the shape of the arithmetic matters more than the captured
 * values, small local fixtures are built from a seed row so the type stays honest.
 */

import { describe, expect, it } from "vitest";
import {
  LB_PER_MT,
  LEGACY_LB_PER_MT_DIVISOR,
  agentPositions,
  allocationBalance,
  checkAllocationHeadroom,
  contractAllocation,
  fundExchangeRate,
  fundIsPaid,
  fundPaymentDelayDays,
  fundValueLocal,
  fundValueUsd,
  movementTotals,
  packagingWeight,
  positionReport,
  productionPlanCheck,
  receiptValue,
  receiptWeights,
  receivedAgainstAgreement,
  stockSummary,
  totalBags,
} from "../sourcing";
import { money } from "../calc";
import {
  AGENT_BALANCES,
  FUNDS,
  INTAKE_RECEIPTS,
  MOVEMENT_LEGS,
  PRODUCTION_PLAN,
  PURCHASE_AGREEMENTS,
  RECEIVING_LOCATION_PLANS,
  STOCK_LOTS,
} from "../../data/seed-v2";
import { exchangeRateOn } from "../../data/fx-rates";
import { CONTRACTS } from "../../data/seed";
import type { Contract, PurchaseAgreement, StockLot } from "../types";

/* ------------------------------------------------------------------ *
 * Fixture helpers
 * ------------------------------------------------------------------ */

const agreement = (id: string): PurchaseAgreement => PURCHASE_AGREEMENTS.find((a) => a.id === id)!;
const receipt = (id: string) => INTAKE_RECEIPTS.find((r) => r.id === id)!;
const leg = (id: string) => MOVEMENT_LEGS.find((m) => m.id === id)!;
const plansFor = (id: string) => RECEIVING_LOCATION_PLANS.filter((p) => p.purchaseAgreementId === id);

const pa1 = agreement("pa-1");
const pa3 = agreement("pa-3");

/** Per-bag tares chosen so the pound-to-tonne conversion is readable, not rounded away. */
const ROUND_TARES = {
  bagWeightApplicable: true,
  bpBagWeightLb: 100,
  spBagWeightLb: 200,
  juteBagWeightLb: 50,
};

const contract = (over: Partial<Contract>): Contract => ({ ...CONTRACTS[0], ...over });
const lot = (over: Partial<StockLot>): StockLot => ({ ...STOCK_LOTS[0], ...over });

/* ------------------------------------------------------------------ *
 * MMP defect 2 — Total Number Of Bags string-concatenated
 * ------------------------------------------------------------------ */

describe("totalBags — MMP prints 13123123 for bag counts of 13, 123 and 123", () => {
  it("adds the captured counts to 259 rather than joining them as text", () => {
    expect(totalBags({ bpBags: 13, spBags: 123, juteBags: 123 })).toBe(259);
  });

  it("is not the legacy concatenation 13123123 for those same three counts", () => {
    expect(totalBags({ bpBags: 13, spBags: 123, juteBags: 123 })).not.toBe(13123123);
  });

  it("adds the counts on the captured receipt ir-5 itself, not just on the literals", () => {
    // ir-5 is the warehouse receipt whose detail view prints the concatenation.
    expect(totalBags(receipt("ir-5").bags)).toBe(259);
  });

  it("returns a number, so a caller cannot concatenate it by accident downstream", () => {
    expect(typeof totalBags({ bpBags: 1, spBags: 2, juteBags: 3 })).toBe("number");
  });

  it("returns zero for a receipt saved with no bags at all (ir-7)", () => {
    expect(totalBags(receipt("ir-7").bags)).toBe(0);
  });
});

/* ------------------------------------------------------------------ *
 * MMP defect 3 — packaging weight divided by 22.25 and called MT
 * ------------------------------------------------------------------ */

describe("packagingWeight — MMP divides pounds by 22.25 and labels the result MT", () => {
  it("uses the real conversion, 2,204.62 lb to the tonne", () => {
    expect(LB_PER_MT).toBe(2204.62);
  });

  it("records the legacy divisor of 22.25 without ever using it for totalMt", () => {
    expect(LEGACY_LB_PER_MT_DIVISOR).toBe(22.25);
  });

  it("multiplies each bag count by its own tare from the parent agreement", () => {
    const w = packagingWeight({ bpBags: 10, spBags: 5, juteBags: 20 }, ROUND_TARES);
    expect(w.bpLb).toBe(1000);
    expect(w.spLb).toBe(1000);
    expect(w.juteLb).toBe(1000);
    expect(w.totalLb).toBe(3000);
  });

  it("converts 3,000 lb to 1.361 MT at LB_PER_MT", () => {
    expect(packagingWeight({ bpBags: 10, spBags: 5, juteBags: 20 }, ROUND_TARES).totalMt).toBe(1.361);
  });

  it("reports what the legacy field named NetWeight would have held — 134.83 for the same 3,000 lb", () => {
    expect(packagingWeight({ bpBags: 10, spBags: 5, juteBags: 20 }, ROUND_TARES).legacyMt).toBe(134.83);
  });

  it("puts roughly two orders of magnitude between the two, so the screen can show the difference", () => {
    const w = packagingWeight({ bpBags: 10, spBags: 5, juteBags: 20 }, ROUND_TARES);
    const ratio = w.legacyMt / w.totalMt;
    expect(ratio).toBeGreaterThan(50);
    expect(ratio).toBeLessThan(200);
    expect(ratio).toBeCloseTo(LB_PER_MT / LEGACY_LB_PER_MT_DIVISOR, 1);
  });

  it("computes the captured 67-bag receipt as 45.11 lb, not the 3,214 lb MMP shows", () => {
    // ir-1 carries 18 + 24 + 25 = 67 bags against pa-1's 0.2 / 0.24 / 1.43 lb tares.
    const w = packagingWeight(receipt("ir-1").bags, pa1);
    expect(totalBags(receipt("ir-1").bags)).toBe(67);
    expect(w.totalLb).toBe(45.11);
    expect(w.totalMt).toBe(0.02);
    expect(w.legacyMt).toBe(2.03);
  });

  it("returns zero throughout for a receipt with no bags", () => {
    const w = packagingWeight({ bpBags: 0, spBags: 0, juteBags: 0 }, pa1);
    expect(w.totalLb).toBe(0);
    expect(w.totalMt).toBe(0);
    expect(w.legacyMt).toBe(0);
  });
});

/* ------------------------------------------------------------------ *
 * Receipt weights — the unpriced receipt, and the sign of the variance
 * ------------------------------------------------------------------ */

describe("receiptWeights — the dirt rate lives on the pricing step, not the receipt", () => {
  it("withholds netMt until the receipt is priced, rather than printing a net that excludes dirt", () => {
    const w = receiptWeights(receipt("ir-3"), pa1);
    expect(w.netMt).toBeUndefined();
  });

  it("withholds the dirt deduction on an unpriced receipt", () => {
    expect(receiptWeights(receipt("ir-3"), pa1).dirtDeductionMt).toBeUndefined();
  });

  it("withholds the variance on an unpriced receipt, since there is no net to compare", () => {
    expect(receiptWeights(receipt("ir-3"), pa1).varianceMt).toBeUndefined();
  });

  it("still reports the weighbridge gross and the packaging tare on an unpriced receipt", () => {
    const w = receiptWeights(receipt("ir-3"), pa1);
    expect(w.grossWithDirtMt).toBe(145.6);
    expect(w.packagingMt).toBe(0.023);
  });

  it("flags the unit of MMP Dirt/Ton as unconfirmed on an unpriced receipt", () => {
    expect(receiptWeights(receipt("ir-3"), pa1).dirtUnitUnconfirmed).toBe(true);
  });

  it("flags the unit of MMP Dirt/Ton as unconfirmed on a priced receipt too — the source never states it", () => {
    expect(receiptWeights(receipt("ir-1"), pa1).dirtUnitUnconfirmed).toBe(true);
  });

  it("computes net as gross minus packaging minus dirt once priced (ir-1)", () => {
    const w = receiptWeights(receipt("ir-1"), pa1);
    expect(w.dirtDeductionMt).toBe(1.733);
    expect(w.netMt).toBe(142.697);
    expect(w.netMt).toBe(Number((144.45 - 0.02 - 1.733).toFixed(3)));
  });

  it("computes the variance as our net minus the agent's declared net", () => {
    const w = receiptWeights(receipt("ir-1"), pa1);
    // 142.697 against the agent's 142.1 — our net is the higher, so the variance is positive.
    expect(w.varianceMt).toBe(0.597);
  });

  it("returns a negative variance when our net falls below the agent's declared net (ir-2)", () => {
    const w = receiptWeights(receipt("ir-2"), pa1);
    expect(w.netMt).toBe(144.853);
    expect(w.varianceMt).toBe(-0.147);
    expect(w.varianceMt!).toBeLessThan(0);
  });

  it("keeps the sign convention consistent — variance is netMt minus agentNetWeightMt", () => {
    const r = receipt("ir-2");
    const w = receiptWeights(r, pa1);
    expect(w.varianceMt).toBeCloseTo(w.netMt! - r.pricing!.agentNetWeightMt, 3);
  });
});

/* ------------------------------------------------------------------ *
 * Receipt value — MMP's truncated `Commosion Amount + …` placeholder
 * ------------------------------------------------------------------ */

describe("receiptValue — MMP's Total Purchase Amount placeholder reads `Commosion Amount + …` and stops", () => {
  it("marks the composition unconfirmed on a priced receipt", () => {
    expect(receiptValue(receipt("ir-1"), pa1).compositionUnconfirmed).toBe(true);
  });

  it("marks the composition unconfirmed on an unpriced receipt as well", () => {
    expect(receiptValue(receipt("ir-3"), pa1).compositionUnconfirmed).toBe(true);
  });

  it("returns nothing but that flag when the receipt is unpriced, rather than a zero total", () => {
    expect(receiptValue(receipt("ir-3"), pa1)).toEqual({ compositionUnconfirmed: true });
  });

  it("converts the net tonnage back to pounds, because MMP prices per pound", () => {
    expect(receiptValue(receipt("ir-1"), pa1).netLb).toBe(314592.7);
  });

  it("splits the purchase amount out on its own, priced per pound", () => {
    const v = receiptValue(receipt("ir-1"), pa1);
    expect(v.purchaseAmount).toEqual(money(3586356.78, "SDG"));
  });

  it("splits the agent commission out on its own, paid per tonne", () => {
    // 142.697 MT × 160 SDG/MT.
    expect(receiptValue(receipt("ir-1"), pa1).commissionAmount).toEqual(money(22831.52, "SDG"));
  });

  it("totals the two rather than leaving the composition to the reader", () => {
    const v = receiptValue(receipt("ir-1"), pa1);
    expect(v.totalAmount!.amount).toBeCloseTo(v.purchaseAmount!.amount + v.commissionAmount!.amount, 2);
    expect(v.totalAmount).toEqual(money(3609188.3, "SDG"));
  });

  it("carries the currency of the price per pound onto every amount", () => {
    const v = receiptValue(receipt("ir-1"), pa1);
    expect(v.purchaseAmount!.currency).toBe("SDG");
    expect(v.commissionAmount!.currency).toBe("SDG");
    expect(v.totalAmount!.currency).toBe("SDG");
  });

  it("omits the commission and still totals when no commission rate is held", () => {
    const r = receipt("ir-1");
    const noCommission = {
      ...r,
      pricing: { ...r.pricing!, agentCommissionPerMt: undefined },
    };
    const v = receiptValue(noCommission, pa1);
    expect(v.commissionAmount).toBeUndefined();
    expect(v.totalAmount).toEqual(v.purchaseAmount);
  });
});

/* ------------------------------------------------------------------ *
 * MMP defect 1 — no allocation balance anywhere on Receiving Locations
 * ------------------------------------------------------------------ */

describe("allocationBalance — MMP Receiving Locations shows no total, no agreed quantity and no remainder", () => {
  const bal = allocationBalance(pa3, plansFor("pa-3"));

  it("totals the captured plan rows to 25,700 MT", () => {
    expect(bal.allocatedMt).toBe(25700);
  });

  it("reports the agreed quantity of 17,777 MT the legacy grid never shows", () => {
    expect(bal.agreedMt).toBe(17777);
  });

  it("reports a negative remainder, which is the number that would have stopped this", () => {
    expect(bal.remainingMt).toBe(-7923);
    expect(bal.remainingMt).toBeLessThan(0);
  });

  it("flags the agreement as over-allocated", () => {
    expect(bal.overAllocated).toBe(true);
  });

  it("counts the one plan row saved with no quantity despite the field being required", () => {
    expect(bal.rowsWithNoQuantity).toBe(1);
  });

  it("clamps the display fraction at 1 rather than overflowing the bar", () => {
    expect(bal.fraction).toBe(1);
  });

  it("reports a healthy agreement without flagging it (pa-1: 2,200 of 2,400 MT)", () => {
    const ok = allocationBalance(pa1, plansFor("pa-1"));
    expect(ok.allocatedMt).toBe(2200);
    expect(ok.remainingMt).toBe(200);
    expect(ok.overAllocated).toBe(false);
    expect(ok.rowsWithNoQuantity).toBe(0);
  });

  it("reports the fraction between 0 and 1 when within the agreement", () => {
    const ok = allocationBalance(pa1, plansFor("pa-1"));
    expect(ok.fraction).toBeCloseTo(2200 / 2400, 6);
  });

  it("reports a zero allocation against an agreement with no plan rows (pa-4)", () => {
    const none = allocationBalance(agreement("pa-4"), plansFor("pa-4"));
    expect(none.allocatedMt).toBe(0);
    expect(none.remainingMt).toBe(640);
    expect(none.fraction).toBe(0);
  });

  it("returns a zero fraction rather than dividing by zero on a zero-quantity agreement", () => {
    expect(allocationBalance({ totalQuantityMt: 0 }, [{ quantityMt: 10 }]).fraction).toBe(0);
  });
});

describe("checkAllocationHeadroom — the check the MMP add form has not got", () => {
  it("permits an allocation that fits inside the agreement", () => {
    const r = checkAllocationHeadroom(pa1, plansFor("pa-1"), 200);
    expect(r.withinAgreement).toBe(true);
    expect(r.headroomMt).toBe(0);
    expect(r.message).toBeUndefined();
  });

  it("reports rather than refuses when the allocation exceeds the agreement", () => {
    // No source states that over-allocation is blocked, and the captured data proves it is not.
    const r = checkAllocationHeadroom(pa3, plansFor("pa-3"), 100);
    expect(r.withinAgreement).toBe(false);
  });

  it("names the excess in the message so the screen can quote it", () => {
    const r = checkAllocationHeadroom(pa3, plansFor("pa-3"), 100);
    expect(r.headroomMt).toBe(-8023);
    expect(r.message).toContain("8023.000");
  });

  it("names the legacy gap in the message, not just the number", () => {
    const r = checkAllocationHeadroom(pa3, plansFor("pa-3"), 100);
    expect(r.message).toContain("legacy form has no such check");
  });

  it("treats an allocation that lands exactly on the agreed quantity as within it", () => {
    const r = checkAllocationHeadroom({ totalQuantityMt: 100 }, [{ quantityMt: 40 }], 60);
    expect(r.withinAgreement).toBe(true);
    expect(r.headroomMt).toBe(0);
  });
});

describe("receivedAgainstAgreement — only a confirmed receipt may back a plan", () => {
  it("counts a confirmed receipt's net weight and nothing else", () => {
    const r = receivedAgainstAgreement("pa-1", INTAKE_RECEIPTS, PURCHASE_AGREEMENTS);
    expect(r.confirmedMt).toBe(142.697);
  });

  it("holds a priced-but-unreviewed receipt separately rather than counting it", () => {
    const r = receivedAgainstAgreement("pa-1", INTAKE_RECEIPTS, PURCHASE_AGREEMENTS);
    expect(r.awaitingReviewMt).toBe(144.853);
  });

  it("counts the receipts that have no pricing at all", () => {
    // pa-1 carries ir-3 (facility, unpriced) and ir-6 (warehouse, unpriceable in MMP).
    expect(receivedAgainstAgreement("pa-1", INTAKE_RECEIPTS, PURCHASE_AGREEMENTS).unpricedCount).toBe(2);
  });

  it("returns zeroes for an agreement with no receipts at all", () => {
    const r = receivedAgainstAgreement("pa-4", INTAKE_RECEIPTS, PURCHASE_AGREEMENTS);
    expect(r).toEqual({ confirmedMt: 0, awaitingReviewMt: 0, unpricedCount: 0 });
  });
});

/* ------------------------------------------------------------------ *
 * Phase 06 — stock, position, allocation and the production plan
 * ------------------------------------------------------------------ */

describe("stockSummary — v2.0 §6.6 states three stock states and no more", () => {
  const s = stockSummary(STOCK_LOTS);

  it("sums the raw stock that is still under process", () => {
    expect(s.underProcessMt).toBe(1165);
  });

  it("sums the stock ready as a finished good", () => {
    expect(s.readyFinishedMt).toBe(680);
  });

  it("sums the stock reserved against a purchase contract", () => {
    expect(s.reservedMt).toBe(3910);
  });

  it("sums the stock flagged to the Stock Management Agreement across every state", () => {
    expect(s.smaFlaggedMt).toBe(180);
  });

  it("reports allocatable stock as the ready figure only — never the reserved or under-process stock", () => {
    expect(s.allocatableMt).toBe(680);
    expect(s.allocatableMt).toBe(s.readyFinishedMt);
    expect(s.allocatableMt).not.toBe(s.readyFinishedMt + s.reservedMt);
  });

  it("excludes reserved and under-process stock from the allocatable figure", () => {
    const only = stockSummary([
      lot({ id: "x1", state: "ready_finished", quantityMt: 10, smaFlagged: false }),
      lot({ id: "x2", state: "reserved", quantityMt: 20, smaFlagged: false }),
      lot({ id: "x3", state: "under_process", quantityMt: 30, smaFlagged: false }),
    ]);
    expect(only.allocatableMt).toBe(10);
  });

  it("returns zeroes for an empty stock list rather than NaN", () => {
    expect(stockSummary([])).toEqual({
      underProcessMt: 0,
      readyFinishedMt: 0,
      reservedMt: 0,
      smaFlaggedMt: 0,
      allocatableMt: 0,
    });
  });
});

describe("positionReport — v2.0 §6.1 input 1 and §6.6 output 2, derived and never stored", () => {
  const sesameSd = { commodityId: "cm-sesame-white", origin: "SD" as const };

  it("reports a commodity with contracts and no stock as short", () => {
    const lines = positionReport([contract({ id: "c1", quantityMt: 500, ...sesameSd })], []);
    expect(lines).toHaveLength(1);
    expect(lines[0].positionMt).toBe(-500);
    expect(lines[0].position).toBe("short");
  });

  it("reports a commodity with more reserved and ready stock than contracted as long", () => {
    const lines = positionReport(
      [contract({ id: "c1", quantityMt: 100, ...sesameSd })],
      [
        lot({ id: "l1", state: "reserved", quantityMt: 80, ...sesameSd }),
        lot({ id: "l2", state: "ready_finished", quantityMt: 90, ...sesameSd }),
      ],
    );
    expect(lines[0].positionMt).toBe(70);
    expect(lines[0].position).toBe("long");
  });

  it("excludes under-process stock from the position, since it cannot be allocated", () => {
    const lines = positionReport(
      [contract({ id: "c1", quantityMt: 100, ...sesameSd })],
      [lot({ id: "l1", state: "under_process", quantityMt: 500, ...sesameSd })],
    );
    expect(lines[0].underProcessMt).toBe(500);
    expect(lines[0].positionMt).toBe(-100);
    expect(lines[0].position).toBe("short");
  });

  it("does not count a completed contract, which no longer demands cargo", () => {
    const lines = positionReport(
      [contract({ id: "c1", quantityMt: 500, status: "completed", ...sesameSd })],
      [lot({ id: "l1", state: "ready_finished", quantityMt: 10, ...sesameSd })],
    );
    expect(lines[0].contractedMt).toBe(0);
    expect(lines[0].position).toBe("long");
  });

  it("does not count a cancelled contract either", () => {
    const lines = positionReport(
      [contract({ id: "c1", quantityMt: 500, status: "cancelled", ...sesameSd })],
      [lot({ id: "l1", state: "ready_finished", quantityMt: 10, ...sesameSd })],
    );
    expect(lines[0].contractedMt).toBe(0);
  });

  it("drops a key with nothing at all — a cancelled contract and no stock produce no line", () => {
    const lines = positionReport(
      [contract({ id: "c1", quantityMt: 500, status: "cancelled", ...sesameSd })],
      [],
    );
    expect(lines).toEqual([]);
  });

  it("sorts the shortest position first, so sourcing reads its work at the top", () => {
    const lines = positionReport(
      [
        contract({ id: "c1", quantityMt: 100, commodityId: "cm-a", origin: "SD" }),
        contract({ id: "c2", quantityMt: 900, commodityId: "cm-b", origin: "SD" }),
        contract({ id: "c3", quantityMt: 400, commodityId: "cm-c", origin: "SD" }),
      ],
      [],
    );
    expect(lines.map((l) => l.positionMt)).toEqual([-900, -400, -100]);
  });

  it("separates the same commodity in two origins into two lines", () => {
    const lines = positionReport(
      [
        contract({ id: "c1", quantityMt: 100, commodityId: "cm-a", origin: "SD" }),
        contract({ id: "c2", quantityMt: 200, commodityId: "cm-a", origin: "ET" }),
      ],
      [],
    );
    expect(lines).toHaveLength(2);
    expect(new Set(lines.map((l) => l.origin))).toEqual(new Set(["SD", "ET"]));
  });

  it("puts the seeded groundnut short position at the top of the real report", () => {
    const lines = positionReport(CONTRACTS, STOCK_LOTS);
    expect(lines[0].commodityId).toBe("cm-groundnut-hps");
    expect(lines[0].positionMt).toBe(-3400);
    expect(lines[0].position).toBe("short");
  });

  it("returns nothing at all when there are no contracts and no stock", () => {
    expect(positionReport([], [])).toEqual([]);
  });
});

describe("contractAllocation — a lot counts only against the contract it is reserved to", () => {
  const ct1 = CONTRACTS.find((c) => c.id === "ct-1")!;

  it("counts the one seeded lot reserved against ct-1", () => {
    const a = contractAllocation(ct1, STOCK_LOTS);
    expect(a.reservedMt).toBe(420);
    expect(a.lotCount).toBe(1);
  });

  it("reports what is still to be reserved against the contract quantity", () => {
    expect(contractAllocation(ct1, STOCK_LOTS).remainingMt).toBe(880);
  });

  it("reports the fraction reserved for the readiness bar", () => {
    expect(contractAllocation(ct1, STOCK_LOTS).fraction).toBeCloseTo(420 / 1300, 6);
  });

  it("ignores a lot reserved against a different contract", () => {
    const a = contractAllocation({ id: "ct-1", quantityMt: 100 }, [
      lot({ id: "l1", state: "reserved", quantityMt: 50, allocatedContractId: "ct-9" }),
    ]);
    expect(a.reservedMt).toBe(0);
    expect(a.lotCount).toBe(0);
  });

  it("ignores a ready lot that names the contract but is not reserved", () => {
    const a = contractAllocation({ id: "ct-1", quantityMt: 100 }, [
      lot({ id: "l1", state: "ready_finished", quantityMt: 50, allocatedContractId: "ct-1" }),
    ]);
    expect(a.reservedMt).toBe(0);
  });

  it("clamps the fraction at 1 when more is reserved than contracted", () => {
    const a = contractAllocation({ id: "ct-1", quantityMt: 100 }, [
      lot({ id: "l1", state: "reserved", quantityMt: 300, allocatedContractId: "ct-1" }),
    ]);
    expect(a.fraction).toBe(1);
    expect(a.remainingMt).toBe(-200);
  });

  it("returns a zero fraction rather than dividing by zero on a zero-quantity contract", () => {
    expect(contractAllocation({ id: "ct-1", quantityMt: 0 }, STOCK_LOTS).fraction).toBe(0);
  });
});

describe("productionPlanCheck — register C-24: the plan is built on what was actually received", () => {
  const week = (id: string) => PRODUCTION_PLAN.find((w) => w.id === id)!;

  it("counts only a confirmed receipt towards the derived figure", () => {
    // Week pp-1 (10-16 Aug, FC31, sesame) holds ir-1 confirmed, ir-2 awaiting review, ir-3 unpriced.
    expect(productionPlanCheck(week("pp-1"), INTAKE_RECEIPTS, PURCHASE_AGREEMENTS).derivedReceivedMt).toBe(
      142.697,
    );
  });

  it("counts the excluded receipts, so the screen can say what was left out", () => {
    expect(productionPlanCheck(week("pp-1"), INTAKE_RECEIPTS, PURCHASE_AGREEMENTS).excludedUnpriced).toBe(2);
  });

  it("reports that the stored figure disagrees with what the receipts support", () => {
    const c = productionPlanCheck(week("pp-1"), INTAKE_RECEIPTS, PURCHASE_AGREEMENTS);
    expect(c.storedReceivedMt).toBe(289.44);
    expect(c.agrees).toBe(false);
  });

  it("reports agreement when the stored figure matches the receipts", () => {
    const c = productionPlanCheck(
      { ...week("pp-1"), receivedRawMt: 142.697 },
      INTAKE_RECEIPTS,
      PURCHASE_AGREEMENTS,
    );
    expect(c.agrees).toBe(true);
  });

  it("counts only receipts inside the seven-day window from weekStarting", () => {
    // pp-2 starts 17 Aug; every FC31 receipt lands 11-15 Aug, so nothing is in range.
    const c = productionPlanCheck(week("pp-2"), INTAKE_RECEIPTS, PURCHASE_AGREEMENTS);
    expect(c.derivedReceivedMt).toBe(0);
    expect(c.excludedUnpriced).toBe(0);
  });

  it("includes a receipt on the last day of the window", () => {
    // Move pp-1 to start on ir-1's own date and the receipt still counts on day one.
    const c = productionPlanCheck(
      { ...week("pp-1"), weekStarting: "2026-08-05", receivedRawMt: 142.697 },
      INTAKE_RECEIPTS,
      PURCHASE_AGREEMENTS,
    );
    // 5-11 Aug: ir-1 (11 Aug, confirmed) is the last day of the window.
    expect(c.derivedReceivedMt).toBe(142.697);
  });

  it("excludes a receipt one day past the window", () => {
    const c = productionPlanCheck(
      { ...week("pp-1"), weekStarting: "2026-08-04" },
      INTAKE_RECEIPTS,
      PURCHASE_AGREEMENTS,
    );
    // 4-10 Aug: ir-1 lands on 11 Aug, one day outside.
    expect(c.derivedReceivedMt).toBe(0);
  });

  it("counts only the matching facility", () => {
    const c = productionPlanCheck(
      { ...week("pp-1"), facility: "FC22 - HMA" },
      INTAKE_RECEIPTS,
      PURCHASE_AGREEMENTS,
    );
    // FC22 receipts in 10-16 Aug are ir-4 (groundnut), which does not match pp-1's commodity.
    expect(c.derivedReceivedMt).toBe(0);
    expect(c.excludedUnpriced).toBe(0);
  });

  it("counts only the matching commodity, taken from the receipt's parent agreement", () => {
    const c = productionPlanCheck(
      { ...week("pp-1"), commodityId: "cm-groundnut-hps" },
      INTAKE_RECEIPTS,
      PURCHASE_AGREEMENTS,
    );
    expect(c.derivedReceivedMt).toBe(0);
  });

  it("agrees on a facility where nothing is confirmed, and still counts the exclusion", () => {
    // pp-3: FC22 / groundnut, 17-23 Aug. ir-7 falls in range and is unpriced.
    const c = productionPlanCheck(week("pp-3"), INTAKE_RECEIPTS, PURCHASE_AGREEMENTS);
    expect(c.derivedReceivedMt).toBe(0);
    expect(c.storedReceivedMt).toBe(0);
    expect(c.agrees).toBe(true);
    expect(c.excludedUnpriced).toBe(1);
  });

  it("ignores a receipt whose parent agreement cannot be found", () => {
    const orphan = { ...receipt("ir-1"), id: "ir-x", purchaseAgreementId: "pa-nope" };
    const c = productionPlanCheck(week("pp-1"), [orphan], PURCHASE_AGREEMENTS);
    expect(c.derivedReceivedMt).toBe(0);
    expect(c.excludedUnpriced).toBe(0);
  });
});

/* ------------------------------------------------------------------ *
 * Funding — MMP Funds and Agent Balances
 * ------------------------------------------------------------------ */

describe("the fund's exchange rate is read from the rate table, not held on the fund", () => {
  it("reads the rate in force on the actual payment date, not the required one", () => {
    // fd-1 is required by 15 June and paid on 18 June; the June rate is 600.
    const r = fundExchangeRate(FUNDS[0]);
    expect(r?.perUsd).toBe(600);
    expect(r?.effectiveFrom).toBe("2026-06-01");
  });

  it("divides the local value by that rate: 1,000,000 ÷ 600 = 1,666.67", () => {
    expect(fundValueUsd(FUNDS[0])).toEqual(money(1666.67, "USD"));
  });

  it("gives a later payment a worse rate, which is the whole point of reading it on the date", () => {
    // fd-2 is paid on 4 July, so it takes the July rate of 612 rather than June's 600.
    const july = fundExchangeRate(FUNDS[1]);
    expect(july?.perUsd).toBe(612);
    expect(fundValueUsd(FUNDS[1])!.amount).toBeLessThan(750000 / 600);
  });

  it("has no rate and no USD value at all until the fund is paid", () => {
    const unpaid = FUNDS.find((f) => !f.actualPaymentDate)!;
    expect(fundIsPaid(unpaid)).toBe(false);
    expect(fundExchangeRate(unpaid)).toBeUndefined();
    // Undefined, not zero: "we do not know" is not "nothing".
    expect(fundValueUsd(unpaid)).toBeUndefined();
  });

  it("still reports the value in the local currency it was raised in", () => {
    const unpaid = FUNDS.find((f) => !f.actualPaymentDate)!;
    expect(fundValueLocal(unpaid)).toEqual(money(unpaid.valueLocal, unpaid.localCurrency));
  });

  it("always reports the derived value in USD", () => {
    expect(fundValueUsd(FUNDS[0])!.currency).toBe("USD");
  });

  it("returns nothing for a payment date the rate table cannot answer for", () => {
    expect(
      fundValueUsd({ valueLocal: 1000, localCurrency: "SDG", actualPaymentDate: "1999-01-01" }),
    ).toBeUndefined();
  });
});

describe("exchangeRateOn — how a rate is chosen", () => {
  it("takes the latest rate effective on or before the date asked for", () => {
    expect(exchangeRateOn("SDG", "2026-06-18")?.perUsd).toBe(600);
    expect(exchangeRateOn("SDG", "2026-06-30")?.perUsd).toBe(600);
    expect(exchangeRateOn("SDG", "2026-07-01")?.perUsd).toBe(612);
  });

  it("returns nothing before the table begins, rather than falling back to the earliest", () => {
    expect(exchangeRateOn("SDG", "2025-12-31")).toBeUndefined();
  });

  it("returns nothing when no date is given", () => {
    expect(exchangeRateOn("SDG", undefined)).toBeUndefined();
  });

  it("keeps the currencies apart", () => {
    expect(exchangeRateOn("SDG", "2026-06-18")?.perUsd).not.toBe(exchangeRateOn("ETB", "2026-06-18")?.perUsd);
  });
});

describe("fundPaymentDelayDays — counted, never enforced", () => {
  it("counts the days between the required date and the actual one", () => {
    // fd-6: required 1 August, paid 12 August.
    const late = FUNDS.find((f) => f.id === "fd-6")!;
    expect(fundPaymentDelayDays(late)).toBe(11);
  });

  it("signs an early payment negative", () => {
    expect(fundPaymentDelayDays({ requiredPaymentDate: "2026-06-15", actualPaymentDate: "2026-06-10" })).toBe(
      -5,
    );
  });

  it("returns nothing while the fund is unpaid", () => {
    expect(fundPaymentDelayDays({ requiredPaymentDate: "2026-06-15" })).toBeUndefined();
  });
});

describe("agentPositions — MMP states no derivation for either balance, so neither is recomputed", () => {
  const positions = agentPositions(AGENT_BALANCES, FUNDS, INTAKE_RECEIPTS, PURCHASE_AGREEMENTS);
  const at = (supplierId: string) => positions.find((p) => p.supplierId === supplierId)!;

  it("returns one row per seeded balance", () => {
    expect(positions).toHaveLength(AGENT_BALANCES.length);
  });

  it("returns the actual balance exactly as it was held, unrecomputed", () => {
    for (const b of AGENT_BALANCES) {
      expect(at(b.supplierId).actual).toEqual(b.actualBalance);
    }
  });

  it("returns the estimated balance exactly as it was held, unrecomputed", () => {
    for (const b of AGENT_BALANCES) {
      expect(at(b.supplierId).estimated).toEqual(b.estimatedBalance);
    }
  });

  it("computes the divergence between the two, which is zero on the live legacy rows", () => {
    expect(at("cp-sup-gabani").divergence).toBe(0);
    expect(at("cp-sup-abakar").divergence).toBe(0);
  });

  it("computes a non-zero divergence where the two balances differ", () => {
    expect(at("cp-sup-mahaseel").divergence).toBe(-220000);
  });

  it("sums the funding raised for the agent in that season, which neither balance reconciles to", () => {
    expect(at("cp-sup-gabani").fundedSdg).toBe(1000000);
    expect(at("cp-sup-mahaseel").fundedSdg).toBe(3500000);
  });

  it("sums only confirmed receipts as drawn against the agent", () => {
    expect(at("cp-sup-gabani").drawnSdg).toBe(3609188.3);
  });

  it("draws nothing where every receipt against the agent is unpriced or unreviewed", () => {
    expect(at("cp-sup-mahaseel").drawnSdg).toBe(0);
    expect(at("cp-sup-abakar").drawnSdg).toBe(0);
  });

  it("matches funding on season as well as on agent", () => {
    // pa-5 / cp-sup-gabani sits in 2024-2025 and must not fund the 2025-2026 row.
    const seasonOnly = agentPositions(
      [{ ...AGENT_BALANCES[0], seasonality: "2019-2020" }],
      FUNDS,
      INTAKE_RECEIPTS,
      PURCHASE_AGREEMENTS,
    );
    expect(seasonOnly[0].fundedSdg).toBe(0);
    expect(seasonOnly[0].drawnSdg).toBe(0);
  });

  it("returns nothing for an empty balance list", () => {
    expect(agentPositions([], FUNDS, INTAKE_RECEIPTS, PURCHASE_AGREEMENTS)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ *
 * Phase 10 — movement totals
 * ------------------------------------------------------------------ */

describe("movementTotals — a trip with no received figure is not a zero-received trip", () => {
  it("counts an unreceived trip towards awaitingReceipt", () => {
    expect(movementTotals([{ loadedMt: 100 }]).awaitingReceipt).toBe(1);
  });

  it("reports no variance on a single loaded, unreceived 100 MT trip", () => {
    // The legacy reading — loaded minus a received figure of zero — would show 100 MT lost.
    expect(movementTotals([{ loadedMt: 100 }]).varianceMt).toBe(0);
  });

  it("still reports the loaded quantity on an unreceived trip", () => {
    const t = movementTotals([{ loadedMt: 100 }]);
    expect(t.loadedMt).toBe(100);
    expect(t.receivedMt).toBe(0);
    expect(t.trips).toBe(1);
  });

  it("excludes an unreceived trip from the variance base, not just from the received total", () => {
    const t = movementTotals([{ loadedMt: 100, receivedMt: 98 }, { loadedMt: 100 }]);
    expect(t.loadedMt).toBe(200);
    expect(t.receivedMt).toBe(98);
    expect(t.varianceMt).toBe(2);
    expect(t.awaitingReceipt).toBe(1);
  });

  it("treats an explicit zero received as received, not as awaiting", () => {
    const t = movementTotals([{ loadedMt: 100, receivedMt: 0 }]);
    expect(t.awaitingReceipt).toBe(0);
    expect(t.varianceMt).toBe(100);
  });

  it("totals the fully received leg ml-1 to a 1 MT variance across four trips", () => {
    const t = movementTotals(leg("ml-1").trips);
    expect(t.trips).toBe(4);
    expect(t.loadedMt).toBe(600);
    expect(t.receivedMt).toBe(599);
    expect(t.varianceMt).toBe(1);
    expect(t.awaitingReceipt).toBe(0);
  });

  it("totals the part-received bulk leg ml-4 without letting the open day skew the variance", () => {
    const t = movementTotals(leg("ml-4").trips);
    expect(t.trips).toBe(4);
    expect(t.loadedMt).toBe(1595);
    expect(t.receivedMt).toBe(1187);
    expect(t.varianceMt).toBe(20);
    expect(t.awaitingReceipt).toBe(1);
  });

  it("reports a negative variance where more was received than loaded", () => {
    expect(movementTotals([{ loadedMt: 100, receivedMt: 101 }]).varianceMt).toBe(-1);
  });

  it("returns zeroes for a leg with no trips at all (ml-5)", () => {
    expect(movementTotals(leg("ml-5").trips)).toEqual({
      trips: 0,
      loadedMt: 0,
      receivedMt: 0,
      varianceMt: 0,
      awaitingReceipt: 0,
    });
  });
});
