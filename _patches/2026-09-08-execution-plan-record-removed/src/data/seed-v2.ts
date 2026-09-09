/**
 * Demo records for the phases workflow v2.0 added, and for the sourcing-intake chain
 * the Material Management Portal screenshots document.
 *
 * Kept in its own file so the v1.1 seed stays identifiable and so a reviewer can see
 * exactly which data belongs to the new phases. The ids continue the same
 * conventions: `op-*` opportunities, `sl-*` stock lots, `ml-*` movement legs, and so on.
 *
 * Dates sit around `TODAY` (2026-08-17) so the derived states — ready, overdue,
 * awaiting confirmation — are visible without editing anything.
 */

import { money } from "../domain/calc";
import type {
  AdvancePayment,
  AgentBalance,
  AgentBalanceMovement,
  Budget,
  BuyerClaim,
  CustomerFeedback,
  FreightRate,
  Fund,
  InsuranceIncident,
  InsurancePolicy,
  IntakeReceipt,
  MovementLeg,
  Opportunity,
  ProductionPlanWeek,
  PurchaseAgreement,
  PurchaseOrder,
  ReceivingLocationPlan,
  SeasonalPurchasePlan,
  StockLot,
  StuffingRequest,
  WarehouseRequest,
} from "../domain/types";

/* ================================================================== *
 * Phases 01–02 (v2.3) — seasonal purchase plan and budget
 *
 * Source for the plans: the Plan sheet of `Export Plan V1.xlsx`, received
 * 27 August 2026, which is the shape a seasonal purchase plan is actually
 * written in — commodity down, month across, with `Total QTY/MT` and
 * `Capacity needed MT` as formulas and a `Notes` column the workflow text of
 * §6.1 never mentions.
 *
 * `spp-1` is that sheet, reproduced cell for cell, so the screen can be read
 * against the spreadsheet side by side. It reconciles exactly: every row's
 * total and capacity match, the grand total is 74,940 MT and the grand
 * capacity 51,960 MT. Its period is October 2026 – July 2027, the ten months
 * the sheet's own header carries; October is blank on every row, exactly as the
 * sheet has it, which is also a month of the period carrying no quantity —
 * something §6.1 permits and states no rule about.
 *
 * The two other plans are kept smaller and deliberately incomplete, so the
 * open questions §6.1 leaves are visible in the data rather than only in a
 * footnote: a commodity appearing on two rows, a row with no note, a row with
 * no quantity anywhere, and a plan whose months are only partly filled.
 * ================================================================== */

export const SEASONAL_PURCHASE_PLANS: SeasonalPurchasePlan[] = [
  {
    id: "spp-1",
    planRef: "SPP-2026-0001",
    from: { year: 2026, month: 10 },
    to: { year: 2027, month: 7 },
    createdOn: "2026-08-20",
    createdBy: "a.buenaventura",
    sharedOn: "2026-08-21",
    sharedBy: "a.buenaventura",
    note: "The plan as held in Export Plan V1.xlsx. Reproduced cell for cell: 74,940 MT planned, 51,960 MT of capacity needed.",
    rows: [
      {
        id: "spr-1",
        commodityId: "cm-peanut-shelled",
        note: "PZU",
        cells: [
          { year: 2026, month: 11, quantityMt: 0 },
          { year: 2026, month: 12, quantityMt: 425 },
          { year: 2027, month: 1, quantityMt: 3400 },
          { year: 2027, month: 2, quantityMt: 4250 },
          { year: 2027, month: 3, quantityMt: 4250 },
          { year: 2027, month: 4, quantityMt: 1700 },
          { year: 2027, month: 5, quantityMt: 1700 },
          { year: 2027, month: 6, quantityMt: 850 },
          { year: 2027, month: 7, quantityMt: 425 },
        ],
      },
      {
        id: "spr-2",
        commodityId: "cm-sesame-gadarif",
        note: "PZU",
        cells: [
          { year: 2026, month: 11, quantityMt: 470 },
          { year: 2026, month: 12, quantityMt: 2820 },
          { year: 2027, month: 1, quantityMt: 2350 },
          { year: 2027, month: 2, quantityMt: 2350 },
          { year: 2027, month: 3, quantityMt: 1880 },
          { year: 2027, month: 4, quantityMt: 940 },
          { year: 2027, month: 5, quantityMt: 940 },
          { year: 2027, month: 6, quantityMt: 940 },
          { year: 2027, month: 7, quantityMt: 470 },
        ],
      },
      {
        id: "spr-3",
        commodityId: "cm-sesame-ng-eastern",
        note: "PZU",
        cells: [
          { year: 2026, month: 11, quantityMt: 450 },
          { year: 2026, month: 12, quantityMt: 900 },
          { year: 2027, month: 1, quantityMt: 450 },
          { year: 2027, month: 2, quantityMt: 0 },
          { year: 2027, month: 3, quantityMt: 0 },
          { year: 2027, month: 4, quantityMt: 0 },
          { year: 2027, month: 5, quantityMt: 0 },
          { year: 2027, month: 6, quantityMt: 0 },
          { year: 2027, month: 7, quantityMt: 0 },
        ],
      },
      {
        id: "spr-4",
        commodityId: "cm-sesame-red",
        note: "PZU",
        cells: [
          { year: 2026, month: 11, quantityMt: 232.5 },
          { year: 2026, month: 12, quantityMt: 232.5 },
          { year: 2027, month: 1, quantityMt: 0 },
          { year: 2027, month: 2, quantityMt: 0 },
          { year: 2027, month: 3, quantityMt: 0 },
          { year: 2027, month: 4, quantityMt: 0 },
          { year: 2027, month: 5, quantityMt: 0 },
          { year: 2027, month: 6, quantityMt: 0 },
          { year: 2027, month: 7, quantityMt: 0 },
        ],
      },
      {
        id: "spr-5",
        commodityId: "cm-sesame-mixed",
        note: "PZU",
        cells: [
          { year: 2026, month: 11, quantityMt: 232.5 },
          { year: 2026, month: 12, quantityMt: 232.5 },
          { year: 2027, month: 1, quantityMt: 0 },
          { year: 2027, month: 2, quantityMt: 0 },
          { year: 2027, month: 3, quantityMt: 0 },
          { year: 2027, month: 4, quantityMt: 0 },
          { year: 2027, month: 5, quantityMt: 0 },
          { year: 2027, month: 6, quantityMt: 0 },
          { year: 2027, month: 7, quantityMt: 0 },
        ],
      },
      {
        id: "spr-6",
        commodityId: "cm-cotton-raw",
        note: "PZU",
        cells: [
          { year: 2026, month: 11, quantityMt: 0 },
          { year: 2026, month: 12, quantityMt: 0 },
          { year: 2027, month: 1, quantityMt: 100 },
          { year: 2027, month: 2, quantityMt: 300 },
          { year: 2027, month: 3, quantityMt: 400 },
          { year: 2027, month: 4, quantityMt: 200 },
          { year: 2027, month: 5, quantityMt: 200 },
          { year: 2027, month: 6, quantityMt: 0 },
          { year: 2027, month: 7, quantityMt: 0 },
        ],
      },
      {
        id: "spr-7",
        commodityId: "cm-pigeon-peas",
        note: "PZU",
        cells: [
          { year: 2026, month: 11, quantityMt: 0 },
          { year: 2026, month: 12, quantityMt: 0 },
          { year: 2027, month: 1, quantityMt: 0 },
          { year: 2027, month: 2, quantityMt: 0 },
          { year: 2027, month: 3, quantityMt: 500 },
          { year: 2027, month: 4, quantityMt: 750 },
          { year: 2027, month: 5, quantityMt: 1000 },
          { year: 2027, month: 6, quantityMt: 750 },
          { year: 2027, month: 7, quantityMt: 0 },
        ],
      },
      {
        id: "spr-8",
        commodityId: "cm-chick-peas",
        note: "PZU",
        cells: [
          { year: 2026, month: 11, quantityMt: 0 },
          { year: 2026, month: 12, quantityMt: 0 },
          { year: 2027, month: 1, quantityMt: 0 },
          { year: 2027, month: 2, quantityMt: 0 },
          { year: 2027, month: 3, quantityMt: 0 },
          { year: 2027, month: 4, quantityMt: 0 },
          { year: 2027, month: 5, quantityMt: 1000 },
          { year: 2027, month: 6, quantityMt: 1000 },
          { year: 2027, month: 7, quantityMt: 0 },
        ],
      },
      {
        id: "spr-9",
        commodityId: "cm-watermelon-seed",
        note: "PZU",
        cells: [
          { year: 2026, month: 11, quantityMt: 0 },
          { year: 2026, month: 12, quantityMt: 0 },
          { year: 2027, month: 1, quantityMt: 450 },
          { year: 2027, month: 2, quantityMt: 1350 },
          { year: 2027, month: 3, quantityMt: 1800 },
          { year: 2027, month: 4, quantityMt: 900 },
          { year: 2027, month: 5, quantityMt: 900 },
          { year: 2027, month: 6, quantityMt: 0 },
          { year: 2027, month: 7, quantityMt: 0 },
        ],
      },
      {
        id: "spr-10",
        commodityId: "cm-gum-talha-fresh",
        note: "PZU",
        cells: [
          { year: 2026, month: 11, quantityMt: 0 },
          { year: 2026, month: 12, quantityMt: 0 },
          { year: 2027, month: 1, quantityMt: 0 },
          { year: 2027, month: 2, quantityMt: 0 },
          { year: 2027, month: 3, quantityMt: 90 },
          { year: 2027, month: 4, quantityMt: 90 },
          { year: 2027, month: 5, quantityMt: 180 },
          { year: 2027, month: 6, quantityMt: 90 },
          { year: 2027, month: 7, quantityMt: 0 },
        ],
      },
      {
        id: "spr-11",
        commodityId: "cm-sorghum",
        note: "PZU",
        cells: [
          { year: 2026, month: 11, quantityMt: 0 },
          { year: 2026, month: 12, quantityMt: 0 },
          { year: 2027, month: 1, quantityMt: 5000 },
          { year: 2027, month: 2, quantityMt: 7500 },
          { year: 2027, month: 3, quantityMt: 7500 },
          { year: 2027, month: 4, quantityMt: 5000 },
          { year: 2027, month: 5, quantityMt: 2000 },
          { year: 2027, month: 6, quantityMt: 2000 },
          { year: 2027, month: 7, quantityMt: 1000 },
        ],
      },
    ],
  },
  {
    id: "spp-2",
    planRef: "SPP-2026-0002",
    from: { year: 2026, month: 9 },
    to: { year: 2027, month: 2 },
    createdOn: "2026-08-14",
    createdBy: "a.buenaventura",
    note: "Being drafted. Incomplete in four ways the requirement permits and does not rule on.",
    rows: [
      {
        id: "spr-2-1",
        commodityId: "cm-sesame-white",
        note: "PZU",
        cells: [
          { year: 2026, month: 9, quantityMt: 5000 },
          { year: 2026, month: 10, quantityMt: 7500 },
          { year: 2026, month: 11, quantityMt: 4200 },
        ],
      },
      /* The same commodity on a second row — the sheet never does this, and
         nothing in §6.1 forbids it. Reported, not refused. */
      {
        id: "spr-2-2",
        commodityId: "cm-sesame-white",
        note: "Gadarif store",
        cells: [{ year: 2026, month: 12, quantityMt: 1800 }],
      },
      /* A row with no note — the sheet fills every one, the requirement
         requires none. */
      {
        id: "spr-2-3",
        commodityId: "cm-peanut-shelled",
        cells: [
          { year: 2026, month: 11, quantityMt: 3100 },
          { year: 2026, month: 12, quantityMt: 6000 },
          { year: 2027, month: 1, quantityMt: 2000 },
        ],
      },
      /* A row carrying a commodity and a note but no quantity anywhere. */
      {
        id: "spr-2-4",
        commodityId: "cm-gum-talha-fresh",
        note: "PZU",
        cells: [],
      },
      /* February 2027 is in the period and carries nothing on any row. */
    ],
  },
  {
    id: "spp-3",
    planRef: "SPP-2026-0003",
    from: { year: 2026, month: 6 },
    to: { year: 2026, month: 7 },
    createdOn: "2026-05-30",
    createdBy: "m.osman",
    note: "A two-month plan for the watermelon seed window, entered without a commodity on one row.",
    rows: [
      {
        id: "spr-3-1",
        commodityId: "cm-watermelon-seed",
        note: "PZU",
        cells: [
          { year: 2026, month: 6, quantityMt: 900 },
          { year: 2026, month: 7, quantityMt: 700 },
        ],
      },
      /* A row added and never completed — no commodity chosen. */
      { id: "spr-3-2", cells: [{ year: 2026, month: 7, quantityMt: 250 }] },
    ],
  },
];

/* ------------------------------------------------------------------ *
 * The budgets
 *
 * A business instruction of 27 August 2026 gives a budget line a commodity,
 * and narrows both of its drop-downs: the Plan list offers only **active**
 * plans, and the Commodity list only the commodities **the selected plan
 * carries**. The records below exercise both, and the cases around them:
 *   · `bg-1` names `spp-2` and three of the commodities that plan carries —
 *     including Fresh-Talha, which the plan carries on a row with no quantity,
 *     so the budget exceeds a plan of zero and the variance shows it;
 *   · `bg-2` has a line against `spp-3`, whose season ended in July 2026 and
 *     which is therefore **closed**. The Create screen would not offer it; the
 *     Edit screen still must, or the line would silently lose its plan;
 *   · `bg-3` is last season's budget against `spp-1`, kept to show that a
 *     budget outlives the screen rules that were in force when it was written.
 * ------------------------------------------------------------------ */

export const BUDGETS: Budget[] = [
  {
    id: "bg-1",
    budgetRef: "BGT-2026-0001",
    /* One plan per budget, as the instruction of 3 September 2026 states, held above the
       period on the Add screen and here on the record. The lines below name the same
       plan, because the screens write the budget's plan into every line they save. */
    seasonalPlanId: "spp-2",
    fromDate: "2026-09-01",
    toDate: "2027-02-28",
    approvalStatus: "Approved",
    createdOn: "2026-08-15",
    createdBy: "a.buenaventura",
    /* Issued Payment Amount, added to the Edit screen 3 September 2026, with the USD
       conversion read from the FX master on the budget's To date and stored nowhere. */
    issuedPaymentLocal: 4200000000,
    issuedPaymentCurrency: "SDG",
    /* Payment Date, added 3 September 2026. The conversion reads the SDG rate in force on
       this date — the same rule a fund follows — rather than on the budget's To date,
       which is what it had to read before this field existed. */
    issuedPaymentDate: "2026-08-20",
    sharedOn: "2026-08-16",
    sharedBy: "a.buenaventura",
    note: "Written against SPP-2026-0002 for the whole season, one line per commodity the plan carries.",
    lines: [
      {
        id: "bgl-1-1",
        seasonalPlanId: "spp-2",
        commodityId: "cm-sesame-white",
        quantityMt: 12000,
        amount: money(9600000, "USD"),
        supplierId: "cp-sup-gabani",
      },
      {
        id: "bgl-1-2",
        seasonalPlanId: "spp-2",
        commodityId: "cm-peanut-shelled",
        quantityMt: 8000,
        amount: money(5200000, "USD"),
        supplierId: "cp-sup-abakar",
      },
      /* The plan carries Fresh-Talha on a row with no quantity, so this budgets
         against nothing planned — a variance worth seeing rather than hiding. */
      {
        id: "bgl-1-3",
        seasonalPlanId: "spp-2",
        commodityId: "cm-gum-talha-fresh",
        quantityMt: 4500,
        amount: money(2925000, "USD"),
        supplierId: "cp-sup-mahaseel",
      },
    ],
  },
  {
    id: "bg-2",
    budgetRef: "BGT-2026-0002",
    /* This budget's own plan is SPP-2026-0002, but its second line still names the closed
       SPP-2026-0003 — the state a budget saved before one-plan-per-budget can be in. The
       Edit screen reports the disagreement and says which plan it will write to both
       lines on save, rather than resolving it silently. */
    seasonalPlanId: "spp-2",
    fromDate: "2026-07-01",
    toDate: "2026-12-31",
    approvalStatus: "Pending finance review",
    createdOn: "2026-08-03",
    createdBy: "m.osman",
    note: "Straddles the seasonal period of SPP-2026-0002, and carries a line against a plan whose season has since closed.",
    lines: [
      {
        id: "bgl-2-1",
        seasonalPlanId: "spp-2",
        commodityId: "cm-sesame-white",
        quantityMt: 3000,
        amount: money(1950000, "USD"),
        supplierId: "cp-sup-sahelseeds",
      },
      /* No supplier and no amount — both permitted, neither stated as required.
         And its plan, SPP-2026-0003, is closed: the Edit screen keeps offering it. */
      {
        id: "bgl-2-2",
        seasonalPlanId: "spp-3",
        commodityId: "cm-watermelon-seed",
        quantityMt: 1600,
      },
    ],
  },
  {
    id: "bg-3",
    budgetRef: "BGT-2025-0003",
    seasonalPlanId: "spp-1",
    fromDate: "2025-10-01",
    toDate: "2026-03-31",
    createdOn: "2025-09-20",
    createdBy: "a.buenaventura",
    note: "Last season's budget. The approval status was never recorded, and the amount is held in SDG.",
    lines: [
      {
        id: "bgl-3-1",
        seasonalPlanId: "spp-1",
        commodityId: "cm-sorghum",
        quantityMt: 22200,
        amount: money(9800000000, "SDG"),
        supplierId: "cp-sup-gabani",
      },
    ],
  },
];

/* ================================================================== *
 * Phase 01–02 — opportunities and deals
 * ================================================================== */

export const OPPORTUNITIES: Opportunity[] = [
  {
    id: "op-1",
    opportunityNo: "OPP-2026-014",
    createdDate: "2026-08-04",
    traderName: "Tomás Ferreira",
    commodityId: "cm-sesame-white",
    origin: "SD",
    indicativeQuantityMt: 750,
    buyerId: "cp-anatolia",
    costing: {
      takenOn: "2026-08-06",
      incoterm: "CNF",
      rawMaterialPricePerMt: money(1180, "USD"),
      salesPricePerMt: money(1495, "USD"),
      lines: [
        {
          key: "processing",
          label: "Processing operation",
          basis: "per_mt",
          amount: money(46, "USD"),
          source: "master",
        },
        {
          key: "execution",
          label: "Execution operation",
          basis: "per_mt",
          amount: money(38, "USD"),
          source: "master",
        },
        { key: "bagging", label: "Bagging", basis: "per_bag", amount: money(0.42, "USD"), source: "master" },
        { key: "freight", label: "Sea freight", basis: "per_mt", amount: money(94, "USD"), source: "master" },
        {
          key: "storage",
          label: "Port storage allowance",
          basis: "per_day",
          amount: money(120, "USD"),
          source: "other",
        },
      ],
      position: "long",
      locked: true,
      lockedOn: "2026-08-08",
    },
    deal: {
      buyerId: "cp-anatolia",
      commodityId: "cm-sesame-white",
      pricePerMt: money(1495, "USD"),
      incoterm: "CNF",
      origin: "SD",
      portOfLoadingId: "pt-psd",
      portOfDischargeId: "pt-mer",
      quantityMt: 750,
      shipmentPeriodStart: "2026-09-15",
      shipmentPeriodEnd: "2026-10-31",
      paymentTerms: "60 days from B/L date, D/A",
      notes: "Buyer asked for the same tag artwork as PC-2041.",
    },
    dealAgreedOn: "2026-08-08",
    dealChannel: "E-mail (assumption — no channel is stated in either source)",
    note: "Ready to be raised as a purchase contract.",
  },
  {
    id: "op-2",
    opportunityNo: "OPP-2026-015",
    createdDate: "2026-08-11",
    traderName: "Tomás Ferreira",
    commodityId: "cm-groundnut-hps",
    origin: "SD",
    indicativeQuantityMt: 1200,
    buyerId: "cp-lowlands",
    costing: {
      takenOn: "2026-08-12",
      incoterm: "FOB",
      rawMaterialPricePerMt: money(940, "USD"),
      salesPricePerMt: money(1140, "USD"),
      lines: [
        {
          key: "processing",
          label: "Processing operation",
          basis: "per_mt",
          amount: money(52, "USD"),
          source: "master",
        },
        {
          key: "execution",
          label: "Execution operation",
          basis: "per_mt",
          amount: money(41, "USD"),
          source: "master",
        },
        {
          key: "freight",
          label: "Sea freight",
          basis: "per_mt",
          amount: money(112, "USD"),
          source: "master",
        },
      ],
      position: "short",
      expectedRawPricePerMt: money(965, "USD"),
      locked: false,
    },
    note: "Short position — sourcing has been asked to cover 1,200 MT.",
  },
  {
    id: "op-3",
    opportunityNo: "OPP-2026-016",
    createdDate: "2026-08-14",
    traderName: "Selim Aziz",
    commodityId: "cm-gum-hashab",
    origin: "ET",
    indicativeQuantityMt: 180,
    note: "No costing run yet, so the deal cannot be agreed (proposed control, workshop Costing 1(vi)).",
  },
  {
    id: "op-4",
    opportunityNo: "OPP-2026-011",
    createdDate: "2026-06-01",
    traderName: "Tomás Ferreira",
    commodityId: "cm-sesame-white",
    origin: "SD",
    indicativeQuantityMt: 1300,
    buyerId: "cp-northharbour",
    costing: {
      takenOn: "2026-05-29",
      incoterm: "CNF",
      rawMaterialPricePerMt: money(1150, "USD"),
      salesPricePerMt: money(1460, "USD"),
      lines: [
        {
          key: "processing",
          label: "Processing operation",
          basis: "per_mt",
          amount: money(44, "USD"),
          source: "master",
        },
        {
          key: "execution",
          label: "Execution operation",
          basis: "per_mt",
          amount: money(36, "USD"),
          source: "master",
        },
        { key: "freight", label: "Sea freight", basis: "per_mt", amount: money(88, "USD"), source: "master" },
      ],
      position: "long",
      locked: true,
      lockedOn: "2026-06-01",
    },
    deal: {
      buyerId: "cp-northharbour",
      commodityId: "cm-sesame-white",
      pricePerMt: money(1460, "USD"),
      incoterm: "CNF",
      origin: "SD",
      portOfLoadingId: "pt-psd",
      portOfDischargeId: "pt-rtm",
      quantityMt: 1300,
      shipmentPeriodStart: "2026-07-01",
      shipmentPeriodEnd: "2026-09-30",
      paymentTerms: "At sight, D/P",
    },
    dealAgreedOn: "2026-06-01",
    dealChannel: "E-mail",
    contractId: "ct-1",
  },
  {
    id: "op-5",
    opportunityNo: "OPP-2026-009",
    createdDate: "2026-05-12",
    traderName: "Selim Aziz",
    commodityId: "cm-watermelon-seed",
    origin: "SD",
    indicativeQuantityMt: 220,
    costing: {
      takenOn: "2026-05-14",
      incoterm: "FOB",
      rawMaterialPricePerMt: money(1310, "USD"),
      salesPricePerMt: money(1360, "USD"),
      lines: [
        {
          key: "processing",
          label: "Processing operation",
          basis: "per_mt",
          amount: money(58, "USD"),
          source: "master",
        },
      ],
      position: "short",
      expectedRawPricePerMt: money(1330, "USD"),
      locked: false,
    },
    lapsedOn: "2026-06-20",
    note: "Margin negative once processing was included; the buyer went elsewhere.",
  },
];

/* ================================================================== *
 * Phase 06 — stock, production plan, warehouse capacity
 * ================================================================== */

export const STOCK_LOTS: StockLot[] = [
  {
    id: "sl-1",
    lotRef: "LOT-26-SES-0118",
    commodityId: "cm-sesame-white",
    origin: "SD",
    facility: "PZU silo A",
    grade: "A",
    quantityMt: 420,
    state: "reserved",
    batchCode: "26-08-PZU-QA1142",
    smaFlagged: false,
    productionDate: "2026-07-28",
    qualityReleaseRef: "QR-26-0771",
    allocatedContractId: "ct-1",
    allocatedOn: "2026-08-01",
  },
  {
    id: "sl-2",
    lotRef: "LOT-26-SES-0121",
    commodityId: "cm-sesame-white",
    origin: "SD",
    facility: "PZU silo A",
    grade: "A",
    quantityMt: 310,
    state: "ready_finished",
    batchCode: "26-08-PZU-QA1150",
    smaFlagged: false,
    productionDate: "2026-08-06",
    qualityReleaseRef: "QR-26-0788",
  },
  {
    id: "sl-3",
    lotRef: "LOT-26-SES-0124",
    commodityId: "cm-sesame-white",
    origin: "SD",
    facility: "Gedaref plant 2",
    grade: "B",
    quantityMt: 265,
    state: "under_process",
    batchCode: "26-08-GDF-QA0904",
    smaFlagged: false,
  },
  {
    id: "sl-4",
    lotRef: "LOT-26-SES-0126",
    commodityId: "cm-sesame-white",
    origin: "SD",
    facility: "PZU silo B",
    grade: "A",
    quantityMt: 180,
    state: "ready_finished",
    batchCode: "26-08-PZU-QA1161",
    smaFlagged: true,
    productionDate: "2026-08-10",
    qualityReleaseRef: "QR-26-0801",
    note: "Flagged to the Stock Management Agreement. Whether SMA stock may be allocated to an export purchase contract is decision D-16.",
  },
  {
    id: "sl-5",
    lotRef: "LOT-26-COT-0051",
    commodityId: "cm-cotton-lint",
    origin: "SD",
    facility: "Ginnery 4",
    grade: "B",
    quantityMt: 400,
    state: "reserved",
    batchCode: "26-07-GIN-QA0410",
    smaFlagged: false,
    productionDate: "2026-07-14",
    allocatedContractId: "ct-2",
    allocatedOn: "2026-07-18",
  },
  {
    id: "sl-6",
    lotRef: "LOT-26-GNT-0019",
    commodityId: "cm-groundnut-hps",
    origin: "SD",
    facility: "PZU silo A",
    grade: "A",
    quantityMt: 2600,
    state: "reserved",
    batchCode: "26-06-PZU-QA0990",
    smaFlagged: false,
    productionDate: "2026-06-22",
    allocatedContractId: "ct-6",
    allocatedOn: "2026-06-28",
  },
  {
    id: "sl-7",
    lotRef: "LOT-26-GNT-0024",
    commodityId: "cm-groundnut-hps",
    origin: "SD",
    facility: "El Obeid store",
    grade: "A",
    quantityMt: 900,
    state: "under_process",
    batchCode: "26-08-ELO-QA0122",
    smaFlagged: false,
    note: "Raw material cannot be allocated until processing is complete (v2.0 §6.6).",
  },
  {
    id: "sl-8",
    lotRef: "LOT-26-GUM-0007",
    commodityId: "cm-gum-hashab",
    origin: "ET",
    facility: "Addis warehouse 1",
    grade: "A",
    quantityMt: 300,
    state: "reserved",
    batchCode: "26-07-ADD-QA0041",
    smaFlagged: false,
    productionDate: "2026-07-02",
    allocatedContractId: "ct-4",
    allocatedOn: "2026-07-08",
  },
  {
    id: "sl-9",
    lotRef: "LOT-26-PGP-0012",
    commodityId: "cm-pigeon-peas",
    origin: "TZ",
    facility: "Dodoma store",
    grade: "B",
    quantityMt: 190,
    state: "ready_finished",
    batchCode: "26-08-DOD-QA0018",
    smaFlagged: false,
    productionDate: "2026-08-09",
  },
  {
    id: "sl-10",
    lotRef: "LOT-26-SES-0130",
    commodityId: "cm-sesame-red",
    origin: "TD",
    facility: "N'Djamena depot",
    grade: "B",
    quantityMt: 190,
    state: "reserved",
    batchCode: "26-07-NDJ-QA0033",
    smaFlagged: false,
    productionDate: "2026-07-19",
    allocatedContractId: "ct-3",
    allocatedOn: "2026-07-22",
  },
];

export const PRODUCTION_PLAN: ProductionPlanWeek[] = [
  {
    id: "pp-1",
    weekStarting: "2026-08-10",
    facility: "FC31 - Mahaseelna",
    commodityId: "cm-sesame-white",
    receivedRawMt: 289.44,
    plannedOutputMt: 265,
    actualOutputMt: 258.2,
    status: "issued",
  },
  {
    id: "pp-2",
    weekStarting: "2026-08-17",
    facility: "FC31 - Mahaseelna",
    commodityId: "cm-sesame-white",
    receivedRawMt: 144.45,
    plannedOutputMt: 130,
    status: "issued",
    note: "Built on receipts confirmed to date. Planned-but-unreceived quantity is excluded as a firm rule (register C-24).",
  },
  {
    id: "pp-3",
    weekStarting: "2026-08-17",
    facility: "FC22 - HMA",
    commodityId: "cm-groundnut-hps",
    receivedRawMt: 0,
    plannedOutputMt: 400,
    status: "draft",
    note: "Nothing confirmed at this facility yet, so the plan cannot be issued on actual receipts.",
  },
];

export const WAREHOUSE_REQUESTS: WarehouseRequest[] = [
  {
    id: "wr-1",
    requestNo: "WHR-2026-007",
    raisedBy: "partner_execution",
    raisedOn: "2026-08-05",
    country: "SD",
    location: "Port Sudan free zone, shed 12",
    requiredCapacityMt: 3500,
    state: "execution_approved",
    handledBy: "logistics",
    qualityVisitDate: "2026-08-08",
    qualityRecommendation: "Roof sound, pest control contract required before first intake.",
    qualityReleasedOn: "2026-08-10",
    executionApprovedOn: "2026-08-12",
    note: "Awaiting creation in the ERP by Compliance.",
  },
  {
    id: "wr-2",
    requestNo: "WHR-2026-008",
    raisedBy: "trader",
    raisedOn: "2026-08-14",
    country: "TZ",
    location: "Dar es Salaam CFS annexe",
    requiredCapacityMt: 900,
    state: "quality_visit",
    handledBy: "partner_execution",
    note: "Execution handles the request regionally; in Sudan it is Logistics (v2.0 §6.6).",
  },
];

/* ================================================================== *
 * Phase 07 — advance payments
 * ================================================================== */

export const ADVANCE_PAYMENTS: AdvancePayment[] = [
  {
    id: "ap-1",
    requestNo: "ADV-2026-004",
    contractId: "ct-4",
    country: "ET",
    state: "confirmed",
    determinedBy: "FP&A Dubai",
    determinedOn: "2026-06-18",
    totalAmount: money(240000, "USD"),
    legs: [
      {
        fromEntity: "Invictus",
        toEntity: "AMROS",
        amount: money(240000, "USD"),
        issuedOn: "2026-06-20",
        confirmedOn: "2026-06-22",
        reference: "SWIFT/INV-AMR-4471",
      },
      {
        fromEntity: "AMROS",
        toEntity: "African Lakes",
        amount: money(240000, "USD"),
        issuedOn: "2026-06-23",
        confirmedOn: "2026-06-25",
        reference: "SWIFT/AMR-ALK-2210",
      },
    ],
    note: "Execution could start once both legs were confirmed (v2.0 §6.7).",
  },
  {
    id: "ap-2",
    requestNo: "ADV-2026-006",
    contractId: "ct-4",
    country: "ET",
    state: "issued",
    determinedBy: "FP&A Dubai",
    determinedOn: "2026-08-11",
    totalAmount: money(95000, "USD"),
    legs: [
      {
        fromEntity: "Invictus",
        toEntity: "AMROS",
        amount: money(95000, "USD"),
        issuedOn: "2026-08-13",
        reference: "SWIFT/INV-AMR-4602",
      },
      { fromEntity: "AMROS", toEntity: "African Lakes", amount: money(95000, "USD") },
    ],
    note: "First leg issued and unconfirmed; the second has not been issued.",
  },
  {
    id: "ap-3",
    requestNo: "ADV-2026-007",
    contractId: "ct-3",
    country: "TD",
    state: "not_applicable",
    legs: [],
    note: "Advance payments are not applicable in Chad (v2.0 §6.7). Chad funds are transferred from Invictus in USD and received locally in local currency.",
  },
];

/* ================================================================== *
 * Phase 08 — the monthly freight rate table
 * ================================================================== */

export const FREIGHT_RATES: FreightRate[] = [
  {
    id: "fr-1",
    effectiveMonth: "2026-08",
    loadingPortId: "pt-psd",
    destinationPortId: "pt-rtm",
    commodityId: "cm-sesame-white",
    shippingLine: "Arctic Star Lines",
    rate20ft: money(1850, "USD"),
    rate40ft: money(2740, "USD"),
    updatedOn: "2026-08-01",
    updatedBy: "Kwame Boateng",
    source: "manual",
  },
  {
    id: "fr-2",
    effectiveMonth: "2026-08",
    loadingPortId: "pt-psd",
    destinationPortId: "pt-mer",
    commodityId: "cm-sesame-white",
    shippingLine: "Orion Sea Carriers",
    rate20ft: money(1420, "USD"),
    rate40ft: money(2110, "USD"),
    updatedOn: "2026-08-01",
    updatedBy: "Kwame Boateng",
    source: "manual",
  },
  {
    id: "fr-3",
    effectiveMonth: "2026-08",
    loadingPortId: "pt-psd",
    destinationPortId: "pt-qin",
    commodityId: "cm-groundnut-hps",
    shippingLine: "Cedar Maritime",
    rate20ft: money(2260, "USD"),
    rate40ft: money(3380, "USD"),
    updatedOn: "2026-08-03",
    updatedBy: "Kwame Boateng",
    source: "manual",
  },
  {
    id: "fr-4",
    effectiveMonth: "2026-08",
    loadingPortId: "pt-djb",
    destinationPortId: "pt-rtm",
    commodityId: "cm-gum-hashab",
    shippingLine: "Arctic Star Lines",
    rate20ft: money(1990, "USD"),
    rate40ft: money(2905, "USD"),
    updatedOn: "2026-08-02",
    updatedBy: "Caravan Freight Solutions",
    source: "manual",
  },
  {
    id: "fr-5",
    effectiveMonth: "2026-08",
    loadingPortId: "pt-dar",
    destinationPortId: "pt-mun",
    commodityId: "cm-pigeon-peas",
    shippingLine: "Orion Sea Carriers",
    rate20ft: money(980, "USD"),
    rate40ft: money(1490, "USD"),
    updatedOn: "2026-08-04",
    updatedBy: "Kwame Boateng",
    source: "searates",
  },
  {
    id: "fr-6",
    effectiveMonth: "2026-07",
    loadingPortId: "pt-psd",
    destinationPortId: "pt-rtm",
    commodityId: "cm-sesame-white",
    shippingLine: "Arctic Star Lines",
    rate20ft: money(1780, "USD"),
    rate40ft: money(2650, "USD"),
    updatedOn: "2026-07-01",
    updatedBy: "Kwame Boateng",
    source: "manual",
  },
  {
    id: "fr-7",
    effectiveMonth: "2026-07",
    loadingPortId: "pt-dla",
    destinationPortId: "pt-mer",
    commodityId: "cm-sesame-red",
    shippingLine: "Cedar Maritime",
    rate20ft: money(2410, "USD"),
    updatedOn: "2026-07-02",
    updatedBy: "Sahel Logistics SARL",
    source: "manual",
    // 40-foot rate never maintained on this lane — the legacy entry form handles one option only.
  },
];

/* ================================================================== *
 * Phase 10 — cargo movement and stuffing requests
 * ================================================================== */

export const MOVEMENT_LEGS: MovementLeg[] = [
  {
    id: "ml-1",
    legNo: "MOV-2026-031",
    shipmentId: "sh-1",
    mode: "truck",
    state: "closed",
    fromLocation: "PZU silo A, Khartoum North",
    toLocation: "Port Sudan stuffing yard",
    originCountry: "SD",
    destinationCountry: "Sudan",
    crossesEntityBoundary: false,
    transferPriceKnown: true,
    plannedQuantityMt: 600,
    serviceRequestNo: "SR-2026-0884",
    startDate: "2026-07-21",
    arrivalDate: "2026-07-24",
    trips: [
      {
        tripNo: "1",
        date: "2026-07-21",
        plateNo: "KRT 4471",
        waybillNo: "WB-88120",
        loadedMt: 152,
        receivedMt: 151.6,
      },
      {
        tripNo: "2",
        date: "2026-07-22",
        plateNo: "KRT 3320",
        waybillNo: "WB-88121",
        loadedMt: 150,
        receivedMt: 150,
      },
      {
        tripNo: "3",
        date: "2026-07-23",
        plateNo: "KRT 1180",
        waybillNo: "WB-88122",
        loadedMt: 149,
        receivedMt: 148.4,
      },
      {
        tripNo: "4",
        date: "2026-07-24",
        plateNo: "KRT 4471",
        waybillNo: "WB-88123",
        loadedMt: 149,
        receivedMt: 149,
      },
    ],
  },
  {
    id: "ml-2",
    legNo: "MOV-2026-038",
    shipmentId: "sh-4",
    mode: "truck",
    state: "in_transit",
    fromLocation: "N'Djamena depot",
    toLocation: "Douala port",
    originCountry: "TD",
    destinationCountry: "Cameroon",
    crossesEntityBoundary: true,
    transferPriceKnown: false,
    plannedQuantityMt: 190,
    startDate: "2026-08-11",
    trips: [
      {
        tripNo: "1",
        date: "2026-08-11",
        plateNo: "TD 2214",
        waybillNo: "TR-4410",
        loadedMt: 48,
        receivedMt: 47.2,
      },
      {
        tripNo: "2",
        date: "2026-08-12",
        plateNo: "TD 1907",
        waybillNo: "TR-4411",
        loadedMt: 47,
        receivedMt: 46.1,
      },
      { tripNo: "3", date: "2026-08-15", plateNo: "TD 2214", waybillNo: "TR-4412", loadedMt: 48 },
      { tripNo: "4", date: "2026-08-16", plateNo: "TD 3061", waybillNo: "TR-4413", loadedMt: 47 },
    ],
    note: "Renatus → Invictus. Transfer prices for this movement are outstanding (v2.0 §6.10, to be prepared by Hiba).",
  },
  {
    id: "ml-3",
    legNo: "MOV-2026-041",
    shipmentId: "sh-5",
    mode: "rail",
    state: "arrived",
    fromLocation: "Addis warehouse 1",
    toLocation: "Djibouti dry port",
    originCountry: "ET",
    destinationCountry: "Djibouti",
    crossesEntityBoundary: true,
    transferPriceKnown: false,
    plannedQuantityMt: 300,
    startDate: "2026-08-06",
    arrivalDate: "2026-08-10",
    trips: [
      { tripNo: "R1", date: "2026-08-06", waybillNo: "ETR-9920", loadedMt: 150, receivedMt: 150 },
      { tripNo: "R2", date: "2026-08-08", waybillNo: "ETR-9921", loadedMt: 150, receivedMt: 148.8 },
    ],
    note: "African Lakes → AMROS (Djibouti). Rail is named as a transport mode for Ethiopia and appears in no shipment-type matrix (v2.0 §9, [OPEN]).",
  },
  {
    id: "ml-4",
    legNo: "MOV-2026-044",
    shipmentId: "sh-7",
    mode: "bulk_daily",
    state: "loading",
    fromLocation: "PZU silo A, Khartoum North",
    toLocation: "Port Sudan north berth",
    originCountry: "SD",
    destinationCountry: "Sudan",
    crossesEntityBoundary: false,
    transferPriceKnown: true,
    plannedQuantityMt: 2000,
    serviceRequestNo: "SR-2026-0912",
    startDate: "2026-08-13",
    trips: [
      { tripNo: "D1", date: "2026-08-13", loadedMt: 410, receivedMt: 406.5 },
      { tripNo: "D2", date: "2026-08-14", loadedMt: 395, receivedMt: 392.0 },
      { tripNo: "D3", date: "2026-08-15", loadedMt: 402, receivedMt: 388.5 },
      { tripNo: "D4", date: "2026-08-16", loadedMt: 388 },
    ],
    note: "Bulk is tracked as a daily operation: number of trips and quantities loaded and received (v2.0 §6.10 activity 2). Where a loaded-versus-received variance is resolved is decision D-19.",
  },
  {
    id: "ml-5",
    legNo: "MOV-2026-047",
    shipmentId: "sh-8",
    mode: "truck",
    state: "planned",
    fromLocation: "PZU silo B, Khartoum North",
    toLocation: "Port Sudan stuffing yard",
    originCountry: "SD",
    destinationCountry: "Sudan",
    crossesEntityBoundary: false,
    transferPriceKnown: true,
    plannedQuantityMt: 100,
    trips: [],
  },
];

export const STUFFING_REQUESTS: StuffingRequest[] = [
  {
    id: "sq-1",
    requestNo: "STR-2026-052",
    shipmentId: "sh-1",
    stuffingLocation: "Port Sudan stuffing yard",
    quantityMt: 600,
    plannedStartDate: "2026-07-27",
    plannedContainerCount: 30,
    raisedOn: "2026-07-24",
    raisedBy: "Amara Osei",
    notifications: [
      { fn: "quality", acknowledgedOn: "2026-07-24", acknowledgedBy: "Nadia Kimani" },
      { fn: "logistics", acknowledgedOn: "2026-07-24", acknowledgedBy: "Kwame Boateng" },
      { fn: "clearance", acknowledgedOn: "2026-07-25", acknowledgedBy: "Clearance PZU" },
      { fn: "warehouse", acknowledgedOn: "2026-07-25", acknowledgedBy: "Warehouse PZU" },
      { fn: "processing", acknowledgedOn: "2026-07-26", acknowledgedBy: "Selim Aziz" },
    ],
  },
  {
    id: "sq-2",
    requestNo: "STR-2026-061",
    shipmentId: "sh-4",
    stuffingLocation: "Douala CFS",
    quantityMt: 190,
    plannedStartDate: "2026-08-22",
    plannedContainerCount: 10,
    raisedOn: "2026-08-16",
    raisedBy: "Amara Osei",
    notifications: [
      { fn: "quality", acknowledgedOn: "2026-08-16", acknowledgedBy: "Nadia Kimani" },
      { fn: "logistics", acknowledgedOn: "2026-08-16", acknowledgedBy: "Sahel Logistics SARL" },
      { fn: "clearance" },
      { fn: "warehouse", acknowledgedOn: "2026-08-17", acknowledgedBy: "Douala depot" },
      { fn: "processing" },
    ],
    note: "Two of the five functions have not acknowledged. Whether the request is a blocking precondition of stuffing is [OPEN] (v2.0 §6.10).",
  },
  {
    id: "sq-3",
    requestNo: "STR-2026-063",
    shipmentId: "sh-8",
    stuffingLocation: "Port Sudan stuffing yard",
    quantityMt: 100,
    plannedStartDate: "2026-09-02",
    plannedContainerCount: 5,
    notifications: [
      { fn: "quality" },
      { fn: "logistics" },
      { fn: "clearance" },
      { fn: "warehouse" },
      { fn: "processing" },
    ],
    note: "Drafted and not yet raised.",
  },
];

/* ================================================================== *
 * Phase 16 — close-out: feedback, claims, insurance
 * ================================================================== */

export const CUSTOMER_FEEDBACK: CustomerFeedback[] = [
  {
    id: "cf-1",
    contractId: "ct-2",
    shipmentId: "sh-3",
    loggedOn: "2026-08-06",
    loggedBy: "Tomás Ferreira",
    outcome: "satisfied",
    detail: "Documents reached the buyer eleven days before arrival. No comment on the cargo.",
  },
  {
    id: "cf-2",
    contractId: "ct-1",
    shipmentId: "sh-1",
    loggedOn: "2026-08-14",
    loggedBy: "Tomás Ferreira",
    outcome: "complaint_service",
    detail:
      "Buyer raised the delay between the draft B/L and the confirmed set. No claim on the commodity itself.",
  },
];

export const BUYER_CLAIMS: BuyerClaim[] = [
  {
    id: "bc-1",
    claimNo: "CLM-2026-014",
    shipmentId: "sh-3",
    contractId: "ct-2",
    raisedOn: "2026-08-02",
    reason: "quality",
    amountSubmitted: money(18400, "USD"),
    state: "approved",
    decidedOn: "2026-08-11",
    approvedAmount: money(12600, "USD"),
    note: "Investigation was carried out offline by the operation team and is not tracked here; what the system records is the approval and the amount (v2.0 §6.16). Whether it should hold the whole claim is G-30.",
  },
  {
    id: "bc-2",
    claimNo: "CLM-2026-017",
    shipmentId: "sh-1",
    contractId: "ct-1",
    raisedOn: "2026-08-15",
    reason: "service",
    amountSubmitted: money(4200, "USD"),
    state: "raised",
  },
];

export const INSURANCE_POLICIES: InsurancePolicy[] = [
  {
    id: "ip-1",
    policyNo: "MAR-2026-1180",
    kind: "marine_per_shipment",
    shipmentId: "sh-1",
    coveredAreas: ["Port Sudan → Rotterdam"],
    validFrom: "2026-08-10",
    validTo: "2026-10-10",
    claimContact: "Compliance desk, Dubai",
  },
  {
    id: "ip-2",
    policyNo: "MAR-2026-1204",
    kind: "marine_per_shipment",
    shipmentId: "sh-4",
    coveredAreas: ["Douala → Mersin"],
    validFrom: "2026-08-18",
    validTo: "2026-10-18",
    claimContact: "Compliance desk, Dubai",
  },
  {
    id: "ip-3",
    policyNo: "INL-2026-0042",
    kind: "inland_master",
    coveredAreas: ["PZU silo A", "PZU silo B", "Gedaref plant 2", "Port Sudan stuffing yard"],
    validFrom: "2026-01-01",
    validTo: "2026-12-31",
    claimContact: "Compliance desk, Khartoum",
    note: "Inland cover is held as master policies per warehouse and operational area (v2.0 §6.16).",
  },
];

export const INSURANCE_INCIDENTS: InsuranceIncident[] = [
  {
    id: "ii-1",
    caseNo: "INC-2026-009",
    reportedOn: "2026-07-30",
    location: "Gedaref plant 2",
    kind: "fire",
    description: "Fire in the packaging store; 140 empty jute bags lost. No commodity affected.",
    policyId: "ip-3",
    state: "finalised",
    claimAmount: money(3100, "USD"),
    compensationStatus: "Settled in full, 12 Aug 2026",
  },
  {
    id: "ii-2",
    caseNo: "INC-2026-012",
    reportedOn: "2026-08-14",
    location: "N'Djamena → Douala road, km 310",
    kind: "loss_in_transit",
    description:
      "One truck short-delivered 1.8 MT against its waybill. Under investigation with the transporter.",
    shipmentId: "sh-4",
    policyId: "ip-2",
    state: "claim_built",
    claimAmount: money(2650, "USD"),
  },
];

/* ================================================================== *
 * SOURCING INTAKE — Material Management Portal
 *
 * Quantities, references and the derived-weight arithmetic follow the captured MMP
 * records so the fixed calculations can be compared against the legacy figures. The
 * over-allocated agreement (`pa-3`) is the captured case: 10,000 + 15,700 MT against
 * a 17,777 MT agreement, with one plan row's quantity blank.
 * ================================================================== */

export const PURCHASE_AGREEMENTS: PurchaseAgreement[] = [
  {
    id: "pa-1",
    paRef: "1123_220822514",
    purchaseOrderNo: "1123",
    seasonality: "2025-2026",
    commodityId: "cm-sesame-white",
    seasonalPlanId: "spp-2",
    supplierId: "cp-sup-gabani",
    purchaser: "Selim Aziz",
    totalQuantityMt: 2400,
    flowStatus: "on_going",
    agreementDate: "2026-06-16",
    createdOn: "2026-06-17",
    createdBy: "s.aziz",
    bagWeightApplicable: true,
    bpBagWeightLb: 0.2,
    spBagWeightLb: 0.24,
    juteBagWeightLb: 1.43,
    additionalExpenses: money(48000, "SDG"),
    /* Agreement Type, added 3 September 2026. Fixed is the default, so every captured
       agreement reads Fixed except the one below that Procurement has since changed. */
    agreementType: "fixed",
    /* Three inspections against the one agreement, because the instruction says the
       trader or the Quality team "enter multiple Inspection" — including a re-test,
       which is what makes several rows against one agreement the normal case. */
    qualityInspections: [
      {
        id: "qi-1-1",
        commodityTypeId: "cm-sesame-white",
        supplierLocation: "Gedaref collection yard",
        estimatedQuantity: 800,
        estimatedQuantityUnit: "mt",
        actualTestDate: "2026-06-22",
        result: "approved",
        recordedOn: "2026-06-22",
        recordedBy: "q.rahman",
      },
      {
        id: "qi-1-2",
        commodityTypeId: "cm-sesame-white",
        supplierLocation: "Gedaref collection yard",
        estimatedQuantity: 12000,
        estimatedQuantityUnit: "bags",
        actualTestDate: "2026-07-04",
        result: "re_test",
        recordedOn: "2026-07-04",
        recordedBy: "q.rahman",
        note: "Moisture above spec on two of six sub-samples; re-test called for the same lot.",
      },
      {
        id: "qi-1-3",
        commodityTypeId: "cm-sesame-red",
        supplierLocation: "Kassala buying point",
        estimatedQuantity: 350,
        estimatedQuantityUnit: "mt",
        result: undefined,
        recordedOn: "2026-08-28",
        recordedBy: "s.aziz",
        note: "Raised by the trader; not yet tested, so no result and no test date.",
      },
    ],
    attachments: [
      { slot: "pa_document", fileName: "PA-1123-signed.pdf" },
      { slot: "contract_document", fileName: "supplier-contract-1123.pdf" },
    ],
    note: "PA Ref is the purchase order plus a sequence, exactly as MMP builds it.",
  },
  {
    id: "pa-2",
    paRef: "431_223244094",
    purchaseOrderNo: "431",
    seasonality: "2025-2026",
    commodityId: "cm-groundnut-hps",
    supplierId: "cp-sup-abakar",
    purchaser: "Amara Osei",
    totalQuantityMt: 1800,
    flowStatus: "on_going",
    agreementDate: "2026-07-02",
    createdOn: "2026-07-02",
    createdBy: "a.osei",
    bagWeightApplicable: true,
    bpBagWeightLb: 0.2,
    spBagWeightLb: 0.24,
    juteBagWeightLb: 1.43,
    agreementType: "fixed",
    qualityInspections: [
      {
        id: "qi-2-1",
        commodityTypeId: "cm-groundnut-hps",
        supplierLocation: "El Obeid store",
        estimatedQuantity: 1800,
        estimatedQuantityUnit: "mt",
        actualTestDate: "2026-07-11",
        result: "approved",
        recordedOn: "2026-07-11",
        recordedBy: "q.rahman",
      },
    ],
    attachments: [{ slot: "pa_document", fileName: "PA-431-signed.pdf" }],
  },
  {
    id: "pa-3",
    paRef: "321_2009374",
    purchaseOrderNo: "321",
    seasonality: "2024-2025",
    commodityId: "cm-sesame-white",
    supplierId: "cp-sup-mahaseel",
    purchaser: "Selim Aziz",
    totalQuantityMt: 17777,
    flowStatus: "hold",
    agreementDate: "2026-04-16",
    createdOn: "2026-04-17",
    createdBy: "s.aziz",
    bagWeightApplicable: true,
    bpBagWeightLb: 0.2,
    spBagWeightLb: 0.24,
    juteBagWeightLb: 1.43,
    /* Procurement changed this one to Collection. The instruction states no effect for
       either value, so nothing on any screen behaves differently because of it. */
    agreementType: "collection",
    qualityInspections: [
      {
        id: "qi-3-1",
        commodityTypeId: "cm-sesame-white",
        supplierLocation: "Mahaseelna intake bay",
        estimatedQuantity: 17777,
        estimatedQuantityUnit: "mt",
        actualTestDate: "2026-04-24",
        result: "rejected",
        recordedOn: "2026-04-24",
        recordedBy: "q.rahman",
        note: "Rejected on admixture. The agreement is still on hold and its receipts were booked anyway — nothing states that a rejected inspection blocks a receipt, so nothing here does.",
      },
    ],
    attachments: [{ slot: "delivery_note", fileName: "DN-321-batch1.pdf" }],
    note: "The captured legacy record. Its receiving-location plans total 25,700 MT against 17,777 MT agreed, with one row's quantity blank — and the legacy grid shows no total, no agreed quantity and no remainder.",
  },
  {
    id: "pa-4",
    paRef: "1204_226610033",
    purchaseOrderNo: "1204",
    seasonality: "2025-2026",
    commodityId: "cm-sesame-red",
    supplierId: "cp-sup-sahelseeds",
    purchaser: "Amara Osei",
    totalQuantityMt: 640,
    flowStatus: "open",
    agreementDate: "2026-08-10",
    createdOn: "2026-08-10",
    createdBy: "a.osei",
    bagWeightApplicable: true,
    bpBagWeightLb: 0.2,
    spBagWeightLb: 0.24,
    juteBagWeightLb: 1.43,
    agreementType: "fixed",
    qualityInspections: [],
    attachments: [],
    note: "No receiving location allocated yet, so no receipt can be booked against it.",
  },
  {
    id: "pa-5",
    paRef: "988_219905510",
    purchaseOrderNo: "988",
    seasonality: "2024-2025",
    commodityId: "cm-gum-hashab",
    supplierId: "cp-sup-gabani",
    purchaser: "Selim Aziz",
    totalQuantityMt: 900,
    flowStatus: "completed",
    agreementDate: "2025-11-04",
    createdOn: "2025-11-05",
    createdBy: "s.aziz",
    /* The `Is Applicable` flag's negative case: this agreement was settled on
       weighbridge weights with no per-bag tare, so no weight is captured and the
       packaging tare on its receipts is a stated zero rather than an accidental one. */
    bagWeightApplicable: false,
    agreementType: "fixed",
    qualityInspections: [],
    attachments: [{ slot: "pa_document", fileName: "PA-988-signed.pdf" }],
  },
];

export const RECEIVING_LOCATION_PLANS: ReceivingLocationPlan[] = [
  {
    id: "rl-1",
    planId: "PLN-0041",
    purchaseAgreementId: "pa-1",
    locationKind: "facility",
    country: "SD",
    facility: "FC31 - Mahaseelna",
    quantityMt: 1400,
    assignedTo: "s.aziz",
    createdOn: "2026-06-18",
  },
  {
    id: "rl-2",
    planId: "PLN-0042",
    purchaseAgreementId: "pa-1",
    locationKind: "facility",
    country: "SD",
    facility: "FC22 - HMA",
    quantityMt: 800,
    assignedTo: "a.osei",
    createdOn: "2026-06-18",
  },
  {
    id: "rl-3",
    planId: "PLN-0043",
    purchaseAgreementId: "pa-2",
    locationKind: "facility",
    country: "SD",
    facility: "FC22 - HMA",
    quantityMt: 1100,
    assignedTo: "a.osei",
    createdOn: "2026-07-03",
  },
  {
    id: "rl-4",
    planId: "PLN-0044",
    purchaseAgreementId: "pa-2",
    locationKind: "facility",
    country: "SD",
    facility: "FC31 - Mahaseelna",
    quantityMt: 500,
    assignedTo: "s.aziz",
    createdOn: "2026-07-03",
  },
  {
    id: "rl-5",
    planId: "PLN-0018",
    purchaseAgreementId: "pa-3",
    locationKind: "facility",
    country: "SD",
    facility: "FC31 - Mahaseelna",
    quantityMt: 10000,
    assignedTo: "s.aziz",
    createdOn: "2026-04-18",
  },
  {
    id: "rl-6",
    planId: "PLN-0019",
    purchaseAgreementId: "pa-3",
    locationKind: "facility",
    country: "SD",
    facility: "FC22 - HMA",
    quantityMt: 15700,
    assignedTo: "a.osei",
    createdOn: "2026-04-18",
  },
  // The captured legacy row with no quantity. Required on the add form and blank in the data.
  {
    id: "rl-7",
    planId: "PLN-0020",
    purchaseAgreementId: "pa-3",
    locationKind: "warehouse",
    country: "SD",
    facility: "WH22 - Khartoum2",
    quantityMt: 0,
    assignedTo: "s.aziz",
    createdOn: "2026-04-19",
  },
  {
    id: "rl-8",
    planId: "PLN-0031",
    purchaseAgreementId: "pa-5",
    locationKind: "facility",
    country: "SD",
    facility: "FC22 - HMA",
    quantityMt: 900,
    assignedTo: "s.aziz",
    createdOn: "2025-11-06",
  },
];

export const INTAKE_RECEIPTS: IntakeReceipt[] = [
  {
    id: "ir-1",
    referenceNo: "220551007",
    kind: "facility",
    purchaseAgreementId: "pa-1",
    location: "FC31 - Mahaseelna",
    receiptDate: "2026-08-11",
    receiptFrom: "supplier",
    plateNo: "KRT 7712",
    driverName: "Osman Bakri",
    driverPhone: "+249 91 774 2210",
    weighBridge: "Gedaref municipal bridge",
    bags: { bpBags: 18, spBags: 24, juteBags: 25 },
    grossWeightWithDirtMt: 144.45,
    pricing: {
      pricePerLb: money(11.4, "SDG"),
      dirtPerTon: 12,
      agentNetWeightMt: 142.1,
      agentCommissionPerMt: money(160, "SDG"),
      status: "confirmed",
      pricedOn: "2026-08-13",
      pricedBy: "Sourcing desk",
    },
    note: "The captured record. MMP shows 67 bags and 3,214 lb of packaging, then divides by 22.25 to print 144.45 MT of packaging for 67 bags. One tonne is 2,204.62 lb.",
  },
  {
    id: "ir-2",
    referenceNo: "220551014",
    kind: "facility",
    purchaseAgreementId: "pa-1",
    location: "FC31 - Mahaseelna",
    receiptDate: "2026-08-12",
    receiptFrom: "supplier",
    plateNo: "KRT 3320",
    driverName: "Yassin Adam",
    driverPhone: "+249 92 118 0043",
    weighBridge: "Gedaref municipal bridge",
    bags: { bpBags: 20, spBags: 30, juteBags: 40 },
    grossWeightWithDirtMt: 146.2,
    pricing: {
      pricePerLb: money(11.4, "SDG"),
      dirtPerTon: 9,
      agentNetWeightMt: 145.0,
      agentCommissionPerMt: money(160, "SDG"),
      status: "need_review",
      pricedOn: "2026-08-14",
      pricedBy: "Sourcing desk",
    },
    note: "Priced and awaiting review, so it does not count towards the production plan.",
  },
  {
    id: "ir-3",
    referenceNo: "220551021",
    kind: "facility",
    purchaseAgreementId: "pa-1",
    location: "FC31 - Mahaseelna",
    receiptDate: "2026-08-15",
    receiptFrom: "supplier",
    plateNo: "KRT 1180",
    driverName: "Bakhit Nour",
    driverPhone: "+249 91 330 7781",
    weighBridge: "Gedaref municipal bridge",
    bags: { bpBags: 15, spBags: 22, juteBags: 30 },
    grossWeightWithDirtMt: 145.6,
    note: "Not yet priced. The pricing step is a separate Sourcing action reached from the agreement.",
  },
  {
    id: "ir-4",
    referenceNo: "220552008",
    kind: "facility",
    purchaseAgreementId: "pa-2",
    location: "FC22 - HMA",
    receiptDate: "2026-08-14",
    receiptFrom: "supplier",
    plateNo: "ELO 9902",
    driverName: "Idris Suleiman",
    driverPhone: "+249 90 441 2210",
    weighBridge: "El Obeid bridge 2",
    bags: { bpBags: 40, spBags: 0, juteBags: 60 },
    grossWeightWithDirtMt: 188.4,
    pricing: {
      pricePerLb: money(8.9, "SDG"),
      dirtPerTon: 15,
      agentNetWeightMt: 183.0,
      agentCommissionPerMt: money(140, "SDG"),
      status: "need_review",
      pricedOn: "2026-08-16",
      pricedBy: "Sourcing desk",
    },
  },
  {
    id: "ir-5",
    referenceNo: "220736512",
    kind: "warehouse",
    purchaseAgreementId: "pa-3",
    location: "WH22 - Khartoum2",
    receiptDate: "2026-03-08",
    receiptFrom: "warehouse",
    plateNo: "KRT 0455",
    driverName: "Tariq Hamed",
    driverPhone: "+249 91 200 1188",
    weighBridge: "Khartoum North bridge",
    bags: { bpBags: 13, spBags: 123, juteBags: 123 },
    grossWeightWithDirtMt: 96.7,
    note: "The captured warehouse receipt. MMP's detail view prints 13123123 total bags — the three counts joined as text instead of added — and titles the page 'Display Material Receipt Form', the wrong entity. A warehouse receipt cannot be priced at all in the legacy system.",
  },
  {
    id: "ir-6",
    referenceNo: "220737004",
    kind: "warehouse",
    purchaseAgreementId: "pa-1",
    location: "WH22 - Khartoum2",
    receiptDate: "2026-08-13",
    receiptFrom: "warehouse",
    plateNo: "KRT 6620",
    driverName: "Mustafa Ali",
    driverPhone: "+249 92 776 4400",
    weighBridge: "Khartoum North bridge",
    bags: { bpBags: 25, spBags: 25, juteBags: 30 },
    grossWeightWithDirtMt: 121.4,
  },
  {
    id: "ir-7",
    referenceNo: "220552015",
    kind: "facility",
    purchaseAgreementId: "pa-2",
    location: "FC22 - HMA",
    receiptDate: "2026-08-17",
    receiptFrom: "supplier",
    plateNo: "ELO 3311",
    driverName: "Kamal Osman",
    driverPhone: "+249 90 118 7742",
    weighBridge: "El Obeid bridge 2",
    bags: { bpBags: 0, spBags: 0, juteBags: 0 },
    grossWeightWithDirtMt: 0,
    note: "Saved with no quantities at all. The legacy form requires only the location and the receipt date, so this record is valid there and meaningless here.",
  },
];

/* ------------------------------------------------------------------ *
 * The funds
 *
 * Reshaped by the business instruction of 27 August 2026, which splits the
 * record across its two screens: a fund is **requested** (seasonality, agent,
 * commodity, value in local currency, required payment date) and only later
 * **paid** (PO number, actual payment date, mode of fund, fund document). The
 * exchange rate is not entered at all — it is read from `data/fx-rates.ts` on
 * the actual payment date, so an unpaid fund has no rate and no USD value.
 *
 * The records below cover the states that follow from that:
 *   · `fd-1` and `fd-2` are paid and complete, and their rates are the ones in
 *     force on their own payment dates — 600 for a June payment, 612 for July,
 *     which is why the same SDG amount is worth less the later it is settled;
 *   · `fd-3` and `fd-4` are the captured duplicate-reference pair, kept because
 *     the legacy defect is worth keeping visible, both paid;
 *   · `fd-5` is **requested and not yet paid**: no PO number, no actual payment
 *     date, no rate, no USD value, no mode of fund. This is the state the
 *     Create screen leaves a fund in, and the state the Update screen exists to
 *     move it out of;
 *   · `fd-6` was paid **after** its required date, so the delay is visible. The
 *     instruction states no rule about a late payment, so nothing is refused,
 *     escalated or flagged — the days are counted and shown.
 * ------------------------------------------------------------------ */

export const FUNDS: Fund[] = [
  {
    id: "fd-1",
    fundRef: "1123_204620341",
    purchaseOrderNo: "1123",
    seasonality: "2025-2026",
    agentId: "cp-sup-gabani",
    commodityId: "cm-sesame-white",
    requiredPaymentDate: "2026-06-15",
    actualPaymentDate: "2026-06-18",
    valueLocal: 1000000,
    localCurrency: "SDG",
    /* Issued Payment Amount and Payment slip, added 3 September 2026. Here the amount
       issued matches the value requested, which is the ordinary case. */
    issuedPaymentLocal: 1000000,
    paymentSlipName: "payment-slip-1123.pdf",
    mode: "finance",
    bankName: "Khartoum",
    financeRatePct: 14.5,
    tenorPeriod: "6 Months",
    documentName: "fund-1123-slip.pdf",
    sharedOn: "2026-06-19",
    sharedBy: "s.aziz",
  },
  {
    id: "fd-2",
    fundRef: "431_205511220",
    purchaseOrderNo: "431",
    seasonality: "2025-2026",
    agentId: "cp-sup-abakar",
    commodityId: "cm-groundnut-hps",
    requiredPaymentDate: "2026-07-01",
    actualPaymentDate: "2026-07-04",
    valueLocal: 750000,
    localCurrency: "SDG",
    /* Issued short of the value requested — 720,000 against 750,000. The USD conversion
       is calculated on the issued amount, as the instruction of 3 September 2026 states,
       so this fund's USD value is *not* the requested value converted. Nothing is
       refused: no rule says the two must agree. */
    issuedPaymentLocal: 720000,
    paymentSlipName: "payment-slip-431.pdf",
    mode: "finance",
    bankName: "QNB",
    financeRatePct: 14.5,
    tenorPeriod: "9 Months",
  },
  {
    id: "fd-3",
    fundRef: "45643123",
    purchaseOrderNo: "45643123",
    seasonality: "2024-2025",
    agentId: "cp-sup-mahaseel",
    commodityId: "cm-sesame-white",
    requiredPaymentDate: "2026-04-15",
    actualPaymentDate: "2026-04-20",
    valueLocal: 2400000,
    localCurrency: "SDG",
    mode: "barter",
    barterCommodityId: "cm-groundnut-oil",
    financeRatePct: 12,
    note: "Shares its Fund Ref with fd-4. MMP builds the reference from the purchase order and never checks it.",
  },
  {
    id: "fd-4",
    fundRef: "45643123",
    purchaseOrderNo: "45643123",
    seasonality: "2024-2025",
    agentId: "cp-sup-mahaseel",
    commodityId: "cm-sesame-white",
    requiredPaymentDate: "2026-05-01",
    actualPaymentDate: "2026-05-02",
    valueLocal: 1100000,
    localCurrency: "SDG",
    mode: "cash",
    financeRatePct: 12,
  },
  /* Requested, not yet paid — the state the Create screen leaves a fund in. */
  {
    id: "fd-5",
    fundRef: "FND-2026-0005",
    seasonality: "2025-2026",
    agentId: "cp-sup-sahelseeds",
    commodityId: "cm-sesame-red",
    requiredPaymentDate: "2026-09-10",
    valueLocal: 420000,
    localCurrency: "SDG",
    note: "Requested. No purchase order, no payment, so no exchange rate and no value in USD yet.",
  },
  /* Paid eleven days after it was required. Counted, not refused. */
  {
    id: "fd-6",
    fundRef: "1204_207740012",
    purchaseOrderNo: "1204",
    seasonality: "2025-2026",
    agentId: "cp-sup-sahelseeds",
    commodityId: "cm-sesame-red",
    requiredPaymentDate: "2026-08-01",
    actualPaymentDate: "2026-08-12",
    valueLocal: 420000,
    localCurrency: "SDG",
    mode: "cash",
    financeRatePct: 15,
    documentName: "fund-1204-transfer.pdf",
  },
];

export const AGENT_BALANCES: AgentBalance[] = [
  {
    id: "ab-1",
    supplierId: "cp-sup-gabani",
    seasonality: "2025-2026",
    actualBalance: money(13647000, "SDG"),
    estimatedBalance: money(13647000, "SDG"),
  },
  {
    id: "ab-2",
    supplierId: "cp-sup-abakar",
    seasonality: "2025-2026",
    actualBalance: money(10900000, "SDG"),
    estimatedBalance: money(10900000, "SDG"),
  },
  {
    id: "ab-3",
    supplierId: "cp-sup-mahaseel",
    seasonality: "2024-2025",
    actualBalance: money(3500000, "SDG"),
    estimatedBalance: money(3720000, "SDG"),
  },
];

export const AGENT_BALANCE_MOVEMENTS: AgentBalanceMovement[] = [
  {
    id: "am-1",
    kind: "transfer",
    supplierId: "cp-sup-mahaseel",
    seasonality: "2024-2025",
    amount: money(220000, "SDG"),
    toSupplierId: "cp-sup-gabani",
    movedOn: "2026-08-05",
    reference: "TRF-2026-0044",
    note: "Transfer Balance and Refund are row actions in MMP whose dialogs contain placeholder text and no inputs.",
  },
  {
    id: "am-2",
    kind: "refund",
    supplierId: "cp-sup-abakar",
    seasonality: "2025-2026",
    amount: money(90000, "SDG"),
    movedOn: "2026-08-12",
    reference: "RFD-2026-0018",
  },
];

/* ------------------------------------------------------------------ *
 * PROCUREMENT — purchase orders
 *
 * The Procurement tab, added by the instruction of 3 September 2026. Four orders,
 * chosen to make each state of a line visible on the list and the view:
 *
 *   · `po-1` carries **two** agreements, both paid, in SDG. Its two lines were paid
 *     on different dates, so they convert at different rates — which is the whole
 *     reason the conversion is per line and not per order;
 *   · `po-2` carries one agreement paid in USD. No rate applies, because none is
 *     needed: the conversion of a USD amount is the amount;
 *   · `po-3` carries one agreement with an amount and **no payment date**, so it has
 *     no rate and no USD conversion. The list total says so rather than reading it
 *     as zero;
 *   · `po-4` carries two agreements and no payment against either — the state the
 *     Add screen leaves an order in, since that screen captures only the PO number
 *     and the agreements under it.
 *
 * The PO numbers reuse the strings the captured funds and agreements already carry in
 * their own `purchaseOrderNo` fields, so the two readings of a purchase order can be
 * compared on screen. No link between them is asserted: the instruction does not
 * state one, and nothing here joins them.
 * ------------------------------------------------------------------ */

export const PURCHASE_ORDERS: PurchaseOrder[] = [
  {
    id: "po-1",
    poNumber: "1123",
    createdOn: "2026-06-17",
    createdBy: "s.aziz",
    updatedOn: "2026-07-06",
    updatedBy: "m.osman",
    note: "Two agreements under one order, paid three weeks apart — so the same currency converts at two different rates.",
    lines: [
      {
        id: "pol-1-1",
        purchaseAgreementId: "pa-1",
        paymentAmount: money(1000000, "SDG"),
        actualPaymentDate: "2026-06-18",
      },
      {
        id: "pol-1-2",
        purchaseAgreementId: "pa-2",
        paymentAmount: money(720000, "SDG"),
        actualPaymentDate: "2026-07-04",
      },
    ],
  },
  {
    id: "po-2",
    poNumber: "1204",
    createdOn: "2026-08-11",
    createdBy: "a.osei",
    note: "Paid in USD, so the conversion is the amount and no exchange rate is read at all.",
    lines: [
      {
        id: "pol-2-1",
        purchaseAgreementId: "pa-4",
        paymentAmount: money(512000, "USD"),
        actualPaymentDate: "2026-08-14",
      },
    ],
  },
  {
    id: "po-3",
    poNumber: "321",
    createdOn: "2026-04-17",
    createdBy: "s.aziz",
    note: "An amount recorded with no actual payment date. There is no rate to read, so there is no USD conversion — which is not the same as zero, and the totals say so.",
    lines: [
      {
        id: "pol-3-1",
        purchaseAgreementId: "pa-3",
        paymentAmount: money(2400000, "SDG"),
      },
    ],
  },
  {
    id: "po-4",
    poNumber: "1330",
    createdOn: "2026-09-01",
    createdBy: "a.buenaventura",
    note: "Newly added: the PO number and the two agreements under it, with no payment against either. This is the state the Add screen leaves an order in.",
    lines: [
      { id: "pol-4-1", purchaseAgreementId: "pa-4" },
      { id: "pol-4-2", purchaseAgreementId: "pa-5" },
    ],
  },
];
