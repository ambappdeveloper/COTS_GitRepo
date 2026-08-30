/**
 * Phase 16 — Delivery, close-out, charges and exceptions (workflow v2.0 §6.16).
 *
 * What this screen serves. Only the three parts of Phase 16 that had no screen at
 * all: customer feedback (activity 5, [PROPOSED]), the end buyer's claim (activity 6,
 * [AS-IS]) and insurance cover with its incident cases (country variation and
 * exception 2, both [AS-IS]).
 *
 * What is deliberately absent.
 *  · The bank submittal, the collection and the sales order. §6.16 shares Phase 14's
 *    source phase P14 with Phase 15, and the post-shipment workspace already holds
 *    them — including both alerts §6.16 names as [PROPOSED]: a maturity date passed
 *    without payment, and the original bill of lading not dispatched with the vessel
 *    approaching the port of discharge (rule R22). They are linked, not repeated.
 *  · A second charge screen. The five charge types, the storage and demurrage claim
 *    form and the Chad exemption are on `/documents`; who owns that tracking is
 *    decision D5, so nothing here asserts an owner.
 *  · The claim investigation. §6.16 activity 6 states it is carried out offline by
 *    the operation team and is not tracked in the system, so no investigation record,
 *    no assignee and no duration appear. Whether the system should hold the whole
 *    claim rather than only its approval is decision G-30, shown on the screen.
 *  · Any feedback field beyond the four the workshop names. The proposal is still to
 *    be prepared by IT (§6.16 open question 3), so the form is contract, shipment,
 *    outcome and detail, and nothing more.
 */

import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { counterpartyName } from "../data/master";
import { formatDate, formatMoney, formatNumber, money, safeNumber, sumMoney } from "../domain/calc";
import {
  BUYER_CLAIM_TRANSITIONS,
  INSURANCE_INCIDENT_TRANSITIONS,
  humanise,
  nextStates,
  toneFor,
} from "../domain/status";
import type {
  BuyerClaim,
  BuyerClaimState,
  Contract,
  CurrencyCode,
  CustomerFeedback,
  CustomerFeedbackOutcome,
  InsuranceIncident,
  InsuranceIncidentState,
  InsurancePolicy,
  Money,
  Shipment,
} from "../domain/types";
import { countryName } from "../domain/variants";
import { OPEN_DECISIONS } from "../domain/workflow";
import { api } from "../services/store";
import { Banner, Dialog, ErrorState, StatusChip, useToast } from "../components/feedback";
import {
  ActionBar,
  CollapsibleSection,
  FieldGrid,
  PageHeader,
  RecordTabs,
  SummaryCard,
  TotalBanner,
} from "../components/layout";
import { ErrorSummary, FormRow, RequiredLegend, SelectInput, TextArea, TextInput } from "../components/form";
import { DataTable, type Column } from "../components/table";
import { useAsync } from "./hooks";

const CLOSE_OUT_TABS = ["feedback", "claims", "insurance"] as const;
type CloseOutTab = (typeof CLOSE_OUT_TABS)[number];

const TAB_LABEL: Record<CloseOutTab, string> = {
  feedback: "Customer feedback",
  claims: "Buyer claims",
  insurance: "Insurance",
};

/** The three outcomes of §6.16 activity 5, written as the source words them. */
const OUTCOME_OPTIONS: { value: CustomerFeedbackOutcome; label: string }[] = [
  { value: "satisfied", label: "Satisfied" },
  { value: "complaint_service", label: "Complaint about the service" },
  { value: "complaint_commodity", label: "Complaint about the commodity" },
];

const CURRENCY_OPTIONS: { value: CurrencyCode; label: string }[] = [
  { value: "USD", label: "USD" },
  { value: "AED", label: "AED" },
  { value: "EUR", label: "EUR" },
  { value: "SDG", label: "SDG" },
  { value: "ETB", label: "ETB" },
  { value: "TZS", label: "TZS" },
];

/** Close-out, for feedback purposes: the two contract states that follow delivery. */
function isClosedForFeedback(c: Contract): boolean {
  return c.status === "completed" || c.status === "partially_completed";
}

/** Sailed or later — the point from which marine cover should already exist. */
function hasSailed(s: Shipment): boolean {
  return s.status === "sailed" || s.status === "documents_complete" || s.status === "closed";
}

/** Sums per currency and never adds two currencies together (see `sumMoney`). */
function formatTotals(items: (Money | undefined)[]): string {
  const { totals } = sumMoney(items);
  if (totals.length === 0) return "–";
  return totals.map((t) => formatMoney(t)).join(" · ");
}

export function CloseOutModule() {
  const { tab } = useParams();
  const active = (tab ?? "feedback") as CloseOutTab;
  const toast = useToast();
  const { user } = useAuth();

  const feedback = useAsync(() => api.listCustomerFeedback());
  const claims = useAsync(() => api.listBuyerClaims());
  const policies = useAsync(() => api.listInsurancePolicies());
  const incidents = useAsync(() => api.listInsuranceIncidents());
  const contracts = useAsync(() => api.listContracts());
  const shipments = useAsync(() => api.listShipments());

  /* --- feedback form (§6.16 activity 5, PROPOSED) --- */
  const [cfContract, setCfContract] = useState("");
  const [cfShipment, setCfShipment] = useState("");
  const [cfOutcome, setCfOutcome] = useState<CustomerFeedbackOutcome | "">("");
  const [cfDetail, setCfDetail] = useState("");
  const [cfSubmitted, setCfSubmitted] = useState(false);
  const [cfServerError, setCfServerError] = useState<string | null>(null);

  /* --- buyer claim decision (§6.16 activity 6, AS-IS) --- */
  const [pendingClaim, setPendingClaim] = useState<{ claim: BuyerClaim; to: BuyerClaimState } | null>(null);
  const [bcAmount, setBcAmount] = useState("");
  const [bcCurrency, setBcCurrency] = useState<CurrencyCode>("USD");
  const [bcNote, setBcNote] = useState("");
  const [bcSubmitted, setBcSubmitted] = useState(false);
  const [bcServerError, setBcServerError] = useState<string | null>(null);

  /* --- insurance incident (§6.16 exception 2, AS-IS) --- */
  const [pendingIncident, setPendingIncident] = useState<{
    incident: InsuranceIncident;
    to: InsuranceIncidentState;
  } | null>(null);
  const [iiAmount, setIiAmount] = useState("");
  const [iiCurrency, setIiCurrency] = useState<CurrencyCode>("USD");
  const [iiCompensation, setIiCompensation] = useState("");
  const [iiSubmitted, setIiSubmitted] = useState(false);
  const [iiServerError, setIiServerError] = useState<string | null>(null);

  const loadError = feedback.error ?? claims.error ?? policies.error ?? incidents.error;
  if (loadError) {
    return (
      <div className="page">
        <ErrorState
          detail={loadError}
          onRetry={() => {
            feedback.reload();
            claims.reload();
            policies.reload();
            incidents.reload();
          }}
        />
      </div>
    );
  }

  const fbRows = feedback.data ?? [];
  const claimRows = claims.data ?? [];
  const policyRows = policies.data ?? [];
  const incidentRows = incidents.data ?? [];
  const contractRows = contracts.data ?? [];
  const shipmentRows = shipments.data ?? [];

  const contractOf = (id?: string) => contractRows.find((c) => c.id === id);
  const shipmentOf = (id?: string) => shipmentRows.find((s) => s.id === id);
  const policyOf = (id?: string) => policyRows.find((p) => p.id === id);

  const tabs = CLOSE_OUT_TABS.map((t) => ({
    key: t,
    label: TAB_LABEL[t],
    to: t === "feedback" ? "/close-out" : `/close-out/${t}`,
    badge:
      t === "feedback"
        ? fbRows.length
        : t === "claims"
          ? claimRows.length
          : policyRows.length + incidentRows.length,
  }));

  /* ---------------------------------------------------------------- *
   * Tab 1 — customer feedback
   * ---------------------------------------------------------------- */

  const satisfiedCount = fbRows.filter((f) => f.outcome === "satisfied").length;
  const serviceComplaints = fbRows.filter((f) => f.outcome === "complaint_service").length;
  const commodityComplaints = fbRows.filter((f) => f.outcome === "complaint_commodity").length;
  const complaintCount = serviceComplaints + commodityComplaints;

  const closedContracts = contractRows.filter(isClosedForFeedback);
  const feedbackContractIds = new Set(fbRows.map((f) => f.contractId));
  const closedWithoutFeedback = closedContracts.filter((c) => !feedbackContractIds.has(c.id));

  const deliveredContractIds = new Set(shipmentRows.filter(hasSailed).map((s) => s.contractId));
  const deliveredContracts = contractRows.filter((c) => deliveredContractIds.has(c.id));
  /**
   * §6.16 activity 5 does not say when feedback may be logged. No contract in this
   * data set has reached completed or partially completed, so the list falls back to
   * contracts with a shipment that has sailed, and the form says so.
   */
  const feedbackContractOptions = closedContracts.length > 0 ? closedContracts : deliveredContracts;
  const usingDeliveredFallback = closedContracts.length === 0;

  const cfErrors: Record<string, string> = {};
  if (!cfContract) cfErrors["cf-contract"] = "Select the contract the feedback is linked to.";
  if (!cfOutcome) cfErrors["cf-outcome"] = "Select whether the customer is satisfied or has a complaint.";
  if (!cfDetail.trim()) cfErrors["cf-detail"] = "Record what the customer said.";
  const cfSummaryErrors = cfSubmitted
    ? Object.entries(cfErrors).map(([field, message]) => ({ field, message }))
    : [];

  async function submitFeedback() {
    setCfSubmitted(true);
    setCfServerError(null);
    if (Object.keys(cfErrors).length > 0) return;
    const res = await api.logCustomerFeedback({
      contractId: cfContract,
      shipmentId: cfShipment || undefined,
      outcome: cfOutcome as CustomerFeedbackOutcome,
      loggedBy: user?.displayName ?? "Trader",
      detail: cfDetail.trim(),
    });
    if (!res.ok) {
      setCfServerError(res.reason);
      toast.push("risk", res.reason);
      return;
    }
    toast.push("ok", `Feedback logged against ${contractOf(cfContract)?.contractNo ?? "the contract"}.`);
    setCfContract("");
    setCfShipment("");
    setCfOutcome("");
    setCfDetail("");
    setCfSubmitted(false);
  }

  const feedbackColumns: Column<CustomerFeedback>[] = [
    {
      key: "contract",
      header: "Contract",
      cell: (f) => {
        const c = contractOf(f.contractId);
        return c ? <Link to={`/contracts/${c.id}`}>{c.contractNo}</Link> : f.contractId;
      },
      sortValue: (f) => contractOf(f.contractId)?.contractNo ?? f.contractId,
    },
    {
      key: "shipment",
      header: "Shipment",
      cell: (f) => {
        const s = shipmentOf(f.shipmentId);
        return s ? (
          <Link to={`/shipments/${s.id}`}>{s.shipmentNo}</Link>
        ) : (
          <span className="muted">contract level</span>
        );
      },
      sortValue: (f) => shipmentOf(f.shipmentId)?.shipmentNo ?? "",
    },
    {
      key: "buyer",
      header: "Buyer",
      cell: (f) => counterpartyName(contractOf(f.contractId)?.buyerId),
      sortValue: (f) => counterpartyName(contractOf(f.contractId)?.buyerId),
    },
    {
      key: "outcome",
      header: "Outcome",
      cell: (f) => <StatusChip tone={toneFor(f.outcome)} label={humanise(f.outcome)} size="sm" />,
      sortValue: (f) => f.outcome,
      filterOptions: OUTCOME_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
      filterMatch: (f, v) => f.outcome === v,
    },
    {
      key: "loggedOn",
      header: "Logged on",
      cell: (f) => formatDate(f.loggedOn),
      sortValue: (f) => f.loggedOn,
    },
    { key: "loggedBy", header: "Logged by", cell: (f) => f.loggedBy, sortValue: (f) => f.loggedBy },
    {
      key: "detail",
      header: "Detail",
      cell: (f) => <span className="small">{f.detail}</span>,
      sortValue: (f) => f.detail,
    },
  ];

  /* ---------------------------------------------------------------- *
   * Tab 2 — buyer claims
   * ---------------------------------------------------------------- */

  const awaitingDecision = claimRows.filter((c) => c.state === "raised");
  const submittedTotal = formatTotals(claimRows.map((c) => c.amountSubmitted));
  const approvedTotal = formatTotals(
    claimRows.filter((c) => c.state === "approved").map((c) => c.approvedAmount),
  );

  function openClaimDecision(claim: BuyerClaim, to: BuyerClaimState) {
    setPendingClaim({ claim, to });
    setBcAmount(claim.amountSubmitted ? String(claim.amountSubmitted.amount) : "");
    setBcCurrency(claim.amountSubmitted?.currency ?? "USD");
    setBcNote(claim.note ?? "");
    setBcSubmitted(false);
    setBcServerError(null);
  }

  function closeClaimDecision() {
    setPendingClaim(null);
    setBcSubmitted(false);
    setBcServerError(null);
  }

  const bcErrors: Record<string, string> = {};
  if (pendingClaim?.to === "approved" && !(safeNumber(bcAmount, -1) > 0)) {
    bcErrors["bc-amount"] =
      "Enter the approved amount as a number greater than zero — an approved claim records the amount approved (v2.0 §6.16).";
  }
  const bcSummaryErrors = bcSubmitted
    ? Object.entries(bcErrors).map(([field, message]) => ({ field, message }))
    : [];

  async function submitClaimDecision() {
    if (!pendingClaim) return;
    setBcSubmitted(true);
    setBcServerError(null);
    if (Object.keys(bcErrors).length > 0) return;
    const { claim, to } = pendingClaim;
    const res = await api.decideBuyerClaim(claim.id, to, {
      approvedAmount: to === "approved" ? money(safeNumber(bcAmount, 0), bcCurrency) : undefined,
      note: bcNote.trim() || undefined,
    });
    if (!res.ok) {
      setBcServerError(res.reason);
      toast.push("risk", res.reason);
      return;
    }
    toast.push("ok", `Claim ${claim.claimNo} recorded as ${humanise(to).toLowerCase()}.`);
    closeClaimDecision();
  }

  const claimColumns: Column<BuyerClaim>[] = [
    {
      key: "claimNo",
      header: "Claim",
      cell: (c) => <span className="mono">{c.claimNo}</span>,
      sortValue: (c) => c.claimNo,
    },
    {
      key: "shipment",
      header: "Shipment",
      cell: (c) => {
        const s = shipmentOf(c.shipmentId);
        return s ? <Link to={`/shipments/${s.id}`}>{s.shipmentNo}</Link> : <span className="muted">–</span>;
      },
      sortValue: (c) => shipmentOf(c.shipmentId)?.shipmentNo ?? "",
    },
    {
      key: "contract",
      header: "Contract",
      cell: (c) => {
        const ct = contractOf(c.contractId);
        return ct ? (
          <Link to={`/contracts/${ct.id}`}>{ct.contractNo}</Link>
        ) : (
          <span className="muted">–</span>
        );
      },
      sortValue: (c) => contractOf(c.contractId)?.contractNo ?? "",
    },
    {
      key: "raisedOn",
      header: "Raised on",
      cell: (c) => formatDate(c.raisedOn),
      sortValue: (c) => c.raisedOn,
    },
    {
      key: "reason",
      header: "Reason",
      cell: (c) => <StatusChip tone={toneFor(c.reason)} label={humanise(c.reason)} size="sm" />,
      sortValue: (c) => c.reason,
      filterOptions: [
        { value: "quality", label: "Quality" },
        { value: "service", label: "Service" },
      ],
      filterMatch: (c, v) => c.reason === v,
    },
    {
      key: "submitted",
      header: "Amount submitted",
      align: "right",
      cell: (c) => formatMoney(c.amountSubmitted),
      sortValue: (c) => c.amountSubmitted?.amount ?? 0,
    },
    {
      key: "state",
      header: "State",
      cell: (c) => <StatusChip tone={toneFor(c.state)} label={humanise(c.state)} size="sm" />,
      sortValue: (c) => c.state,
      filterOptions: [...new Set(claimRows.map((c) => c.state))].map((s) => ({
        value: s,
        label: humanise(s),
      })),
      filterMatch: (c, v) => c.state === v,
    },
    {
      key: "decidedOn",
      header: "Decided on",
      cell: (c) => (c.decidedOn ? formatDate(c.decidedOn) : <span className="muted">not decided</span>),
      sortValue: (c) => c.decidedOn ?? "",
    },
    {
      key: "approved",
      header: "Approved amount",
      align: "right",
      cell: (c) => formatMoney(c.approvedAmount),
      sortValue: (c) => c.approvedAmount?.amount ?? 0,
    },
    {
      key: "decision",
      header: "Decision",
      cell: (c) => {
        const allowed = nextStates(BUYER_CLAIM_TRANSITIONS, c.state);
        if (allowed.length === 0) {
          return (
            <span className="xsmall muted">
              Decided — {humanise(c.state).toLowerCase()} is terminal, so nothing is offered.
            </span>
          );
        }
        return (
          <span className="row">
            {allowed.includes("approved") ? (
              <button
                type="button"
                className="btn btn--primary btn--sm"
                onClick={() => openClaimDecision(c, "approved")}
              >
                Approve
              </button>
            ) : null}
            {allowed.includes("rejected") ? (
              <button type="button" className="btn btn--sm" onClick={() => openClaimDecision(c, "rejected")}>
                Reject
              </button>
            ) : null}
          </span>
        );
      },
    },
    {
      key: "note",
      header: "Note",
      cell: (c) => <span className="small muted">{c.note ?? "–"}</span>,
      sortValue: (c) => c.note ?? "",
      optional: true,
    },
  ];

  /* ---------------------------------------------------------------- *
   * Tab 3 — insurance
   * ---------------------------------------------------------------- */

  const marinePolicies = policyRows.filter((p) => p.kind === "marine_per_shipment");
  const inlandPolicies = policyRows.filter((p) => p.kind === "inland_master");
  const marineShipmentIds = new Set(marinePolicies.map((p) => p.shipmentId).filter(Boolean));
  const sailedWithoutMarineCover = shipmentRows.filter((s) => hasSailed(s) && !marineShipmentIds.has(s.id));

  function openIncidentStep(incident: InsuranceIncident, to: InsuranceIncidentState) {
    setPendingIncident({ incident, to });
    setIiAmount(incident.claimAmount ? String(incident.claimAmount.amount) : "");
    setIiCurrency(incident.claimAmount?.currency ?? "USD");
    setIiCompensation(incident.compensationStatus ?? "");
    setIiSubmitted(false);
    setIiServerError(null);
  }

  function closeIncidentStep() {
    setPendingIncident(null);
    setIiSubmitted(false);
    setIiServerError(null);
  }

  const iiErrors: Record<string, string> = {};
  if (pendingIncident?.to === "claim_built" && !(safeNumber(iiAmount, -1) > 0)) {
    iiErrors["ii-amount"] =
      "Enter the claim amount as a number greater than zero — a built claim carries its amount.";
  }
  if (pendingIncident?.to === "finalised" && !iiCompensation.trim()) {
    iiErrors["ii-compensation"] =
      "Record the compensation status — the claim is finalised with the compensation status updated (v2.0 §6.16).";
  }
  const iiSummaryErrors = iiSubmitted
    ? Object.entries(iiErrors).map(([field, message]) => ({ field, message }))
    : [];

  async function submitIncidentStep() {
    if (!pendingIncident) return;
    setIiSubmitted(true);
    setIiServerError(null);
    if (Object.keys(iiErrors).length > 0) return;
    const { incident, to } = pendingIncident;
    const res = await api.advanceInsuranceIncident(incident.id, to, {
      claimAmount: to === "claim_built" ? money(safeNumber(iiAmount, 0), iiCurrency) : undefined,
      compensationStatus: to === "finalised" ? iiCompensation.trim() : undefined,
    });
    if (!res.ok) {
      setIiServerError(res.reason);
      toast.push("risk", res.reason);
      return;
    }
    toast.push("ok", `Case ${incident.caseNo} recorded as ${humanise(to).toLowerCase()}.`);
    closeIncidentStep();
  }

  const marineColumns: Column<InsurancePolicy>[] = [
    {
      key: "policyNo",
      header: "Policy",
      cell: (p) => <span className="mono">{p.policyNo}</span>,
      sortValue: (p) => p.policyNo,
    },
    {
      key: "shipment",
      header: "Shipment",
      cell: (p) => {
        const s = shipmentOf(p.shipmentId);
        return s ? (
          <Link to={`/shipments/${s.id}`}>{s.shipmentNo}</Link>
        ) : (
          <span className="muted">not linked</span>
        );
      },
      sortValue: (p) => shipmentOf(p.shipmentId)?.shipmentNo ?? "",
    },
    {
      key: "route",
      header: "Covered route",
      cell: (p) => p.coveredAreas.join(" · "),
      sortValue: (p) => p.coveredAreas.join(" "),
    },
    {
      key: "from",
      header: "Valid from",
      cell: (p) => formatDate(p.validFrom),
      sortValue: (p) => p.validFrom ?? "",
    },
    { key: "to", header: "Valid to", cell: (p) => formatDate(p.validTo), sortValue: (p) => p.validTo ?? "" },
    {
      key: "contact",
      header: "Claim contact",
      cell: (p) => p.claimContact ?? <span className="muted">–</span>,
      sortValue: (p) => p.claimContact ?? "",
    },
  ];

  const inlandColumns: Column<InsurancePolicy>[] = [
    {
      key: "policyNo",
      header: "Policy",
      cell: (p) => <span className="mono">{p.policyNo}</span>,
      sortValue: (p) => p.policyNo,
    },
    {
      key: "areas",
      header: "Covered areas",
      cell: (p) => p.coveredAreas.join(" · "),
      sortValue: (p) => p.coveredAreas.join(" "),
    },
    {
      key: "from",
      header: "Valid from",
      cell: (p) => formatDate(p.validFrom),
      sortValue: (p) => p.validFrom ?? "",
    },
    { key: "to", header: "Valid to", cell: (p) => formatDate(p.validTo), sortValue: (p) => p.validTo ?? "" },
    {
      key: "contact",
      header: "Claim contact",
      cell: (p) => p.claimContact ?? <span className="muted">–</span>,
      sortValue: (p) => p.claimContact ?? "",
    },
    {
      key: "note",
      header: "Note",
      cell: (p) => <span className="small muted">{p.note ?? "–"}</span>,
      sortValue: (p) => p.note ?? "",
      optional: true,
    },
  ];

  const incidentColumns: Column<InsuranceIncident>[] = [
    {
      key: "caseNo",
      header: "Case",
      cell: (i) => <span className="mono">{i.caseNo}</span>,
      sortValue: (i) => i.caseNo,
    },
    {
      key: "reportedOn",
      header: "Reported on",
      cell: (i) => formatDate(i.reportedOn),
      sortValue: (i) => i.reportedOn,
    },
    {
      key: "kind",
      header: "Kind",
      cell: (i) => <StatusChip tone={toneFor(i.kind)} label={humanise(i.kind)} size="sm" />,
      sortValue: (i) => i.kind,
      filterOptions: [
        { value: "theft", label: "Theft" },
        { value: "fire", label: "Fire" },
        { value: "loss_in_transit", label: "Loss in transit" },
      ],
      filterMatch: (i, v) => i.kind === v,
    },
    { key: "location", header: "Location", cell: (i) => i.location, sortValue: (i) => i.location },
    {
      key: "shipment",
      header: "Shipment",
      cell: (i) => {
        const s = shipmentOf(i.shipmentId);
        return s ? <Link to={`/shipments/${s.id}`}>{s.shipmentNo}</Link> : <span className="muted">–</span>;
      },
      sortValue: (i) => shipmentOf(i.shipmentId)?.shipmentNo ?? "",
    },
    {
      key: "policy",
      header: "Policy",
      cell: (i) => <span className="mono small">{policyOf(i.policyId)?.policyNo ?? "–"}</span>,
      sortValue: (i) => policyOf(i.policyId)?.policyNo ?? "",
    },
    {
      key: "state",
      header: "State",
      cell: (i) => <StatusChip tone={toneFor(i.state)} label={humanise(i.state)} size="sm" />,
      sortValue: (i) => i.state,
    },
    {
      key: "amount",
      header: "Claim amount",
      align: "right",
      cell: (i) => formatMoney(i.claimAmount),
      sortValue: (i) => i.claimAmount?.amount ?? 0,
    },
    {
      key: "compensation",
      header: "Compensation status",
      cell: (i) => i.compensationStatus ?? <span className="muted">not recorded</span>,
      sortValue: (i) => i.compensationStatus ?? "",
    },
    {
      key: "advance",
      header: "Case step",
      cell: (i) => {
        const allowed = nextStates(INSURANCE_INCIDENT_TRANSITIONS, i.state);
        return (
          <ActionBar
            primary={
              allowed.length > 0
                ? allowed.map((to) => ({
                    label: `Mark as ${humanise(to).toLowerCase()}`,
                    tone: "primary" as const,
                    onClick: () => openIncidentStep(i, to),
                  }))
                : [
                    {
                      label: "Advance the case",
                      tone: "primary" as const,
                      disabled: true,
                      disabledReason: `"${humanise(i.state)}" is a terminal state — no further transition is permitted (v2.0 §6.16 exception 2).`,
                    },
                  ]
            }
          />
        );
      },
    },
    {
      key: "description",
      header: "Description",
      cell: (i) => <span className="small">{i.description}</span>,
      sortValue: (i) => i.description,
      optional: true,
    },
  ];

  return (
    <>
      <PageHeader
        moduleLabel="Close-out"
        crumbs={[{ label: "Home", to: "/" }, { label: "Close-out, claims & insurance" }]}
        title="Close-out, claims and insurance"
        meta="Phase 16 — customer feedback linked to the contract, the end buyer's claim and its approval, marine and inland cover, and insurance incident cases"
        recordKey={`${fbRows.length + claimRows.length + policyRows.length + incidentRows.length}`}
        recordDate="close-out records"
        tabs={<RecordTabs tabs={tabs} />}
      />

      <div className="page">
        <Banner tone="info" title="What this screen covers, and what sits elsewhere (v2.0 §6.16)">
          Phase 16 also holds the bank submittal, the collection and the sales order. Those are on the{" "}
          <Link to="/post-shipment">post-shipment and bank workspace</Link>, together with both alerts §6.16
          names as [PROPOSED] — a maturity date passed without payment, and the original bill of lading not
          dispatched with the vessel approaching the port of discharge (rule R22). Charges, including the
          storage and demurrage claim form, are on <Link to="/documents">documents and charges</Link>. Blocked
          and overdue items across every shipment are on <Link to="/exceptions">exceptions and risks</Link>.
          None of them is repeated here.
        </Banner>

        {/* ============================ feedback ============================ */}
        {active === "feedback" ? (
          <>
            <Banner tone="warn" title="Customer feedback is [PROPOSED] and the proposal is not yet written">
              §6.16 activity 5 records the requirement — "feedback is obtained from the final customer by the
              trader and logged, showing whether the customer is satisfied or has a complaint about the
              service or the commodity, and is linked to the contract" — and the workshop records that a
              proposal is to be prepared by IT. Until that proposal exists this screen holds the four fields
              the workshop names — contract, shipment, outcome and detail — and nothing more. No score, no
              category list and no follow-up workflow is invented here.
            </Banner>

            <div className="grid-2">
              <SummaryCard
                title="Satisfied against complaint"
                tone={complaintCount > 0 ? "warn" : fbRows.length > 0 ? "ok" : "accent"}
              >
                <p className="page__title">
                  {formatNumber(satisfiedCount)} of {formatNumber(fbRows.length)}
                </p>
                <p className="small muted">
                  logged as satisfied. {formatNumber(complaintCount)} complaint(s):{" "}
                  {formatNumber(serviceComplaints)} about the service, {formatNumber(commodityComplaints)}{" "}
                  about the commodity. The three outcomes are the ones §6.16 activity 5 names.
                </p>
              </SummaryCard>

              <SummaryCard
                title="Closed contracts with no feedback logged"
                tone={closedWithoutFeedback.length > 0 ? "warn" : "ok"}
              >
                <p className="page__title">{formatNumber(closedWithoutFeedback.length)}</p>
                {closedContracts.length === 0 ? (
                  <p className="small muted">
                    No contract in this data set has reached completed or partially completed, so there is no
                    close-out gap to list yet. Stated rather than left as a zero with no explanation.
                  </p>
                ) : closedWithoutFeedback.length === 0 ? (
                  <p className="small muted">
                    Every closed or partially completed contract has feedback against it.
                  </p>
                ) : (
                  <>
                    <ul className="doclist">
                      {closedWithoutFeedback.map((c) => (
                        <li key={c.id}>
                          <span className="doclist__name">
                            <Link to={`/contracts/${c.id}`}>{c.contractNo}</Link>
                            <span className="doclist__sub">
                              {counterpartyName(c.buyerId)} · {humanise(c.status)}
                            </span>
                          </span>
                        </li>
                      ))}
                    </ul>
                    <p className="xsmall muted" style={{ marginTop: "0.5rem" }}>
                      §6.16 states no rule requiring feedback, so this is reported as a gap and blocks
                      nothing.
                    </p>
                  </>
                )}
              </SummaryCard>
            </div>

            <DataTable
              caption="Customer feedback"
              rows={fbRows}
              columns={feedbackColumns}
              loading={feedback.loading}
              searchPlaceholder="Search by contract, buyer or what the customer said…"
              searchValue={(f) =>
                `${contractOf(f.contractId)?.contractNo ?? ""} ${counterpartyName(
                  contractOf(f.contractId)?.buyerId,
                )} ${f.detail} ${f.loggedBy}`
              }
              emptyTitle="No customer feedback logged"
              emptyBody="Feedback is obtained from the final customer by the trader and logged against the contract (v2.0 §6.16 activity 5, PROPOSED)."
              savedViews={[
                { key: "all", label: "All feedback" },
                {
                  key: "complaints",
                  label: "Complaints only",
                  description: "A complaint about the service or about the commodity.",
                  predicate: (f) => f.outcome !== "satisfied",
                },
                { key: "satisfied", label: "Satisfied", predicate: (f) => f.outcome === "satisfied" },
              ]}
            />

            <p className="small muted">
              Outcome values as the source words them: <strong>satisfied</strong>;{" "}
              <strong>complaint service</strong> — a complaint about the service;{" "}
              <strong>complaint commodity</strong> — a complaint about the commodity.
            </p>

            <form
              className="card card__body stack"
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                void submitFeedback();
              }}
            >
              <h3 className="card__title">Log customer feedback</h3>
              {cfServerError ? (
                <Banner tone="risk" title="The feedback could not be logged">
                  {cfServerError}
                </Banner>
              ) : null}
              <ErrorSummary title="The feedback could not be logged" errors={cfSummaryErrors} />

              <div className="fields">
                <FormRow
                  label="Contract"
                  htmlFor="cf-contract"
                  required
                  error={cfSubmitted ? cfErrors["cf-contract"] : undefined}
                  hint={
                    usingDeliveredFallback
                      ? "No contract has reached completed or partially completed in this data set, so the list shows contracts with a shipment that has sailed. §6.16 states no rule for when feedback may be logged."
                      : "Closed and partially completed contracts. Feedback is linked to the contract (§6.16 activity 5)."
                  }
                >
                  <SelectInput
                    id="cf-contract"
                    value={cfContract}
                    onChange={(v) => {
                      setCfContract(v);
                      setCfShipment("");
                    }}
                    required
                    error={cfSubmitted ? cfErrors["cf-contract"] : undefined}
                    options={feedbackContractOptions.map((c) => ({
                      value: c.id,
                      label: `${c.contractNo} — ${counterpartyName(c.buyerId)} (${humanise(c.status)})`,
                    }))}
                    placeholder="Select a contract…"
                  />
                </FormRow>

                <FormRow
                  label="Shipment"
                  htmlFor="cf-shipment"
                  hint="Optional. Leave empty where the feedback is about the contract rather than one shipment."
                >
                  <SelectInput
                    id="cf-shipment"
                    value={cfShipment}
                    onChange={setCfShipment}
                    disabled={!cfContract}
                    options={shipmentRows
                      .filter((s) => s.contractId === cfContract)
                      .map((s) => ({ value: s.id, label: `${s.shipmentNo} — ${humanise(s.status)}` }))}
                    placeholder={cfContract ? "Contract level — no shipment" : "Select a contract first"}
                  />
                </FormRow>

                <FormRow
                  label="Outcome"
                  htmlFor="cf-outcome"
                  required
                  error={cfSubmitted ? cfErrors["cf-outcome"] : undefined}
                >
                  <SelectInput
                    id="cf-outcome"
                    value={cfOutcome}
                    onChange={setCfOutcome}
                    required
                    error={cfSubmitted ? cfErrors["cf-outcome"] : undefined}
                    options={OUTCOME_OPTIONS}
                    placeholder="Select an outcome…"
                  />
                </FormRow>
              </div>

              <FormRow
                label="What the customer said"
                htmlFor="cf-detail"
                required
                error={cfSubmitted ? cfErrors["cf-detail"] : undefined}
                hint="Free text. The source names no structure for it."
              >
                <TextArea
                  id="cf-detail"
                  value={cfDetail}
                  onChange={setCfDetail}
                  required
                  error={cfSubmitted ? cfErrors["cf-detail"] : undefined}
                  rows={3}
                />
              </FormRow>

              <RequiredLegend />
              <p className="xsmall muted">
                Logged as {user?.displayName ?? "an unrecorded user"} on today's date. §6.16 names the trader
                as the person who obtains and logs the feedback.
              </p>
              <div className="factions">
                <button type="submit" className="btn btn--primary">
                  Log feedback
                </button>
              </div>
            </form>
          </>
        ) : null}

        {/* ============================= claims ============================= */}
        {active === "claims" ? (
          <>
            <Banner
              tone="info"
              title="What the system records, in the source's own words (v2.0 §6.16 activity 6)"
            >
              "A claim raised by the end buyer for quality or service is tracked against the shipment and its
              amount. The investigation is normally carried out offline by the operation team and is not
              tracked in the system; what the system records is the approval of the claim and the amount
              submitted." [AS-IS] There is therefore no investigation record, no assignee and no duration on
              this screen.
            </Banner>

            <Banner tone="warn" title="Two open decisions bear on this screen">
              <strong>G-30</strong> — {OPEN_DECISIONS["G-30"].title} Suggested owner:{" "}
              {OPEN_DECISIONS["G-30"].owner}. The existing workflow's storage and demurrage claim form implies
              a fuller record than the workshop describes, so both the submitted amount and the approval are
              held here and the ambiguity is left visible rather than resolved.
              <br />
              <strong>D5</strong> — {OPEN_DECISIONS["D5"].title} Suggested owner: {OPEN_DECISIONS["D5"].owner}
              . Whether demurrage is a commercial claim or a compliance case is part of the same open
              question.
            </Banner>

            <div className="grid-2">
              <SummaryCard title="Submitted against approved" tone="accent">
                <p className="page__title">{approvedTotal}</p>
                <p className="small muted">
                  approved, against {submittedTotal} submitted across {formatNumber(claimRows.length)}{" "}
                  claim(s). Amounts are summed per currency and never added across currencies.
                </p>
              </SummaryCard>
              <SummaryCard title="Awaiting a decision" tone={awaitingDecision.length > 0 ? "warn" : "ok"}>
                <p className="page__title">{formatNumber(awaitingDecision.length)}</p>
                <p className="small muted">
                  Raised and not yet approved or rejected. The state model §6.16 gives is raised → approved;
                  rejection is the unstated other outcome and is held as a state of its own.
                </p>
              </SummaryCard>
            </div>

            <DataTable
              caption="Buyer claims"
              rows={claimRows}
              columns={claimColumns}
              loading={claims.loading}
              searchPlaceholder="Search by claim number, shipment or contract…"
              searchValue={(c) =>
                `${c.claimNo} ${shipmentOf(c.shipmentId)?.shipmentNo ?? ""} ${
                  contractOf(c.contractId)?.contractNo ?? ""
                } ${c.reason}`
              }
              emptyTitle="No buyer claim recorded"
              emptyBody="A claim raised by the end buyer for quality or service is tracked against the shipment and its amount (v2.0 §6.16 activity 6)."
              savedViews={[
                { key: "all", label: "All claims" },
                {
                  key: "raised",
                  label: "Raised and undecided",
                  description: "Awaiting the approval that §6.16 says the system records.",
                  predicate: (c) => c.state === "raised",
                },
                { key: "approved", label: "Approved", predicate: (c) => c.state === "approved" },
                { key: "rejected", label: "Rejected", predicate: (c) => c.state === "rejected" },
              ]}
            />

            <TotalBanner
              label="Claim value approved"
              value={approvedTotal}
              derivation={`approved claims only, summed per currency; ${submittedTotal} submitted across ${claimRows.length} claim(s), ${awaitingDecision.length} still undecided`}
            />

            <CollapsibleSection title="Storage and demurrage claims" defaultOpen={false}>
              <p className="small">
                §6.16 lists a further output — "storage / demurrage claim form: Raised → Approved [AS-IS]" —
                which is a charge, not a buyer claim. Charges are already tracked on{" "}
                <Link to="/documents">documents and charges</Link>, with the five charge types and their
                states, so no second charge screen is built here. The claim form itself follows the same two
                steps as a buyer claim: it is raised and then approved.
              </p>
              <p className="small">
                Country variation: {countryName("TD")} does not track charges at all [AS-IS], so a charge or
                demurrage claim is not expected on a {countryName("TD")} shipment and its absence is not a
                gap.
              </p>
              <p className="small">
                Ownership is decision <strong>D5</strong> — {OPEN_DECISIONS["D5"].title} Suggested owner:{" "}
                {OPEN_DECISIONS["D5"].owner}. Until it is taken, no owner is asserted on any screen.
              </p>
            </CollapsibleSection>
          </>
        ) : null}

        {/* =========================== insurance =========================== */}
        {active === "insurance" ? (
          <>
            <Banner tone="info" title="Two kinds of cover, held two different ways (v2.0 §6.16)">
              "Marine cover policies are created and related to each shipment separately; inland cover is held
              as master policies per warehouse and operational area." [AS-IS] That is why this tab is two
              sections and not one table: a marine policy points at a shipment, a master policy points at
              places.
            </Banner>

            <CollapsibleSection
              title="Marine cover, per shipment"
              indicator={
                <StatusChip
                  tone={sailedWithoutMarineCover.length > 0 ? "warn" : "ok"}
                  label={`${marinePolicies.length} policy(ies)`}
                  size="sm"
                />
              }
            >
              <DataTable
                caption="Marine cover policies"
                rows={marinePolicies}
                columns={marineColumns}
                loading={policies.loading}
                searchPlaceholder="Search by policy number, shipment or route…"
                searchValue={(p) =>
                  `${p.policyNo} ${shipmentOf(p.shipmentId)?.shipmentNo ?? ""} ${p.coveredAreas.join(" ")}`
                }
                emptyTitle="No marine policy recorded"
                emptyBody="A marine cover policy is created and related to each shipment separately (v2.0 §6.16)."
              />
              {sailedWithoutMarineCover.length > 0 ? (
                <Banner tone="warn" title="Sailed shipments with no marine policy recorded">
                  Marine cover is created per shipment, so a shipment that has sailed without one is a gap in
                  the record. §6.16 states no blocking rule, so this reports and refuses nothing:{" "}
                  {sailedWithoutMarineCover.map((s, i) => (
                    <span key={s.id}>
                      {i > 0 ? ", " : ""}
                      <Link to={`/shipments/${s.id}`}>{s.shipmentNo}</Link> ({humanise(s.status)})
                    </span>
                  ))}
                  .
                </Banner>
              ) : (
                <p className="small muted">
                  Every shipment that has sailed or later has a marine policy against it.
                </p>
              )}
            </CollapsibleSection>

            <CollapsibleSection
              title="Inland cover, master policies"
              indicator={<StatusChip tone="info" label={`${inlandPolicies.length} master`} size="sm" />}
            >
              <p className="small">
                Inland cover is not per shipment. It is held as master policies per warehouse and operational
                area, so one policy covers many silos, plants and stuffing yards at once and no shipment
                appears against it.
              </p>
              <DataTable
                caption="Inland master policies"
                rows={inlandPolicies}
                columns={inlandColumns}
                loading={policies.loading}
                searchPlaceholder="Search by policy number or covered area…"
                searchValue={(p) => `${p.policyNo} ${p.coveredAreas.join(" ")} ${p.claimContact ?? ""}`}
                emptyTitle="No inland master policy recorded"
                emptyBody="Inland cover is held as master policies per warehouse and operational area (v2.0 §6.16)."
              />
            </CollapsibleSection>

            <CollapsibleSection title="Incident cases">
              <p className="small">
                §6.16 exception 2, as written: an insurance incident — theft or fire at a warehouse, facility
                or stuffing area, or loss in transit — is reported as a case with a date, location and brief
                description, the claim is built, and the claim is finalised with the compensation status
                updated. [AS-IS] Those three steps are the only states offered; advancing to claim built needs
                an amount and advancing to finalised needs a compensation status, and the service refuses
                either without it.
              </p>
              <DataTable
                caption="Insurance incident cases"
                rows={incidentRows}
                columns={incidentColumns}
                loading={incidents.loading}
                searchPlaceholder="Search by case number, location or description…"
                searchValue={(i) => `${i.caseNo} ${i.location} ${i.description} ${i.kind}`}
                emptyTitle="No incident case reported"
                emptyBody="An incident is reported as a case with a date, location and brief description (v2.0 §6.16 exception 2)."
                savedViews={[
                  { key: "all", label: "All cases" },
                  {
                    key: "open",
                    label: "Not yet finalised",
                    description:
                      "Reported or with the claim built, so the compensation status is still open.",
                    predicate: (i) => i.state !== "finalised",
                  },
                  { key: "finalised", label: "Finalised", predicate: (i) => i.state === "finalised" },
                ]}
              />
            </CollapsibleSection>
          </>
        ) : null}
      </div>

      {/* ---------------------- buyer claim decision ---------------------- */}
      <Dialog
        open={pendingClaim !== null}
        title={
          pendingClaim
            ? `${pendingClaim.claim.claimNo} — ${pendingClaim.to === "approved" ? "approve the claim" : "reject the claim"}`
            : "Decide the claim"
        }
        onClose={closeClaimDecision}
        tone={pendingClaim?.to === "approved" ? "info" : "warn"}
        footer={
          <>
            <button type="button" className="btn" onClick={closeClaimDecision}>
              Cancel
            </button>
            <button type="button" className="btn btn--primary" onClick={() => void submitClaimDecision()}>
              {pendingClaim?.to === "approved" ? "Record the approval" : "Record the rejection"}
            </button>
          </>
        }
      >
        {pendingClaim ? (
          <>
            {bcServerError ? (
              <Banner tone="risk" title="The decision was refused">
                {bcServerError}
              </Banner>
            ) : null}
            <ErrorSummary title="The decision could not be recorded" errors={bcSummaryErrors} />
            <FieldGrid
              columns={1}
              fields={[
                { label: "Claim number", value: pendingClaim.claim.claimNo, behaviour: "readonly" },
                {
                  label: "Shipment",
                  value: shipmentOf(pendingClaim.claim.shipmentId)?.shipmentNo,
                  behaviour: "inherited",
                },
                {
                  label: "Reason",
                  value: (
                    <StatusChip
                      tone={toneFor(pendingClaim.claim.reason)}
                      label={humanise(pendingClaim.claim.reason)}
                      size="sm"
                    />
                  ),
                  behaviour: "inherited",
                },
                {
                  label: "Amount submitted",
                  value: formatMoney(pendingClaim.claim.amountSubmitted),
                  behaviour: "inherited",
                },
                {
                  label: "Raised on",
                  value: formatDate(pendingClaim.claim.raisedOn),
                  behaviour: "inherited",
                },
              ]}
            />

            {pendingClaim.to === "approved" ? (
              <div className="fields">
                <FormRow
                  label="Approved amount"
                  htmlFor="bc-amount"
                  required
                  error={bcSubmitted ? bcErrors["bc-amount"] : undefined}
                  hint="The approval and the amount are what §6.16 says the system records. The service refuses an approval without an amount."
                >
                  <TextInput
                    id="bc-amount"
                    value={bcAmount}
                    onChange={setBcAmount}
                    required
                    inputMode="decimal"
                    error={bcSubmitted ? bcErrors["bc-amount"] : undefined}
                  />
                </FormRow>
                <FormRow
                  label="Currency"
                  htmlFor="bc-currency"
                  hint="Defaulted from the amount submitted. Money always carries its currency here."
                >
                  <SelectInput
                    id="bc-currency"
                    value={bcCurrency}
                    onChange={setBcCurrency}
                    options={CURRENCY_OPTIONS}
                  />
                </FormRow>
              </div>
            ) : (
              <p className="small muted">
                §6.16 states only "raised → approved". Rejection is the unstated other outcome, so it is
                recorded with a note and no amount.
              </p>
            )}

            <FormRow
              label="Note"
              htmlFor="bc-note"
              hint="Optional. The investigation itself is carried out offline and is not tracked here."
            >
              <TextArea id="bc-note" value={bcNote} onChange={setBcNote} rows={2} />
            </FormRow>
            <RequiredLegend />
          </>
        ) : null}
      </Dialog>

      {/* --------------------- insurance incident step --------------------- */}
      <Dialog
        open={pendingIncident !== null}
        title={
          pendingIncident
            ? `${pendingIncident.incident.caseNo} — mark as ${humanise(pendingIncident.to).toLowerCase()}`
            : "Advance the incident case"
        }
        onClose={closeIncidentStep}
        footer={
          <>
            <button type="button" className="btn" onClick={closeIncidentStep}>
              Cancel
            </button>
            <button type="button" className="btn btn--primary" onClick={() => void submitIncidentStep()}>
              Apply
            </button>
          </>
        }
      >
        {pendingIncident ? (
          <>
            {iiServerError ? (
              <Banner tone="risk" title="The case could not be advanced">
                {iiServerError}
              </Banner>
            ) : null}
            <ErrorSummary title="The case could not be advanced" errors={iiSummaryErrors} />
            <FieldGrid
              columns={1}
              fields={[
                { label: "Case number", value: pendingIncident.incident.caseNo, behaviour: "readonly" },
                {
                  label: "Kind",
                  value: (
                    <StatusChip
                      tone={toneFor(pendingIncident.incident.kind)}
                      label={humanise(pendingIncident.incident.kind)}
                      size="sm"
                    />
                  ),
                  behaviour: "inherited",
                },
                {
                  label: "Reported on",
                  value: formatDate(pendingIncident.incident.reportedOn),
                  behaviour: "inherited",
                },
                { label: "Location", value: pendingIncident.incident.location, behaviour: "inherited" },
                { label: "Description", value: pendingIncident.incident.description, behaviour: "inherited" },
                {
                  label: "Policy",
                  value: policyOf(pendingIncident.incident.policyId)?.policyNo,
                  behaviour: "inherited",
                },
                {
                  label: "Current state",
                  value: (
                    <StatusChip
                      tone={toneFor(pendingIncident.incident.state)}
                      label={humanise(pendingIncident.incident.state)}
                      size="sm"
                    />
                  ),
                },
              ]}
            />

            {pendingIncident.to === "claim_built" ? (
              <div className="fields">
                <FormRow
                  label="Claim amount"
                  htmlFor="ii-amount"
                  required
                  error={iiSubmitted ? iiErrors["ii-amount"] : undefined}
                  hint="A built claim carries its amount, so the service refuses this step without one."
                >
                  <TextInput
                    id="ii-amount"
                    value={iiAmount}
                    onChange={setIiAmount}
                    required
                    inputMode="decimal"
                    error={iiSubmitted ? iiErrors["ii-amount"] : undefined}
                  />
                </FormRow>
                <FormRow label="Currency" htmlFor="ii-currency">
                  <SelectInput
                    id="ii-currency"
                    value={iiCurrency}
                    onChange={setIiCurrency}
                    options={CURRENCY_OPTIONS}
                  />
                </FormRow>
              </div>
            ) : null}

            {pendingIncident.to === "finalised" ? (
              <FormRow
                label="Compensation status"
                htmlFor="ii-compensation"
                required
                error={iiSubmitted ? iiErrors["ii-compensation"] : undefined}
                hint='Free text. §6.16 says the claim "is finalised with the compensation status updated" and does not name the values it may take, so none are invented here.'
              >
                <TextInput
                  id="ii-compensation"
                  value={iiCompensation}
                  onChange={setIiCompensation}
                  required
                  error={iiSubmitted ? iiErrors["ii-compensation"] : undefined}
                />
              </FormRow>
            ) : null}
            <RequiredLegend />
          </>
        ) : null}
      </Dialog>
    </>
  );
}
