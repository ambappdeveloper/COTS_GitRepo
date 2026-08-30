/**
 * The integrated journey, as navigation.
 *
 * Every step below comes from `COTS_Integrated_Workflows.md` (WF-INT-01 … WF-INT-14). Each step
 * names the screen in the Core, Shared or Export prototype where that step is actually performed.
 *
 * Two rules this file exists to enforce:
 *   1. every `to` is a route that exists — in the Core route table, the Shared route table, or the
 *      Export prototype's own route table;
 *   2. where the workflow defines a step for which no screen was built, the step carries
 *      `unavailable` and is rendered as a stated gap. It is never given a link that goes nowhere.
 *
 * v1.3 — TWO CHANGES, AND ONE THING DELIBERATELY NOT CHANGED
 * ---------------------------------------------------------
 * **Changed.** Every Export step now names its phase in workflow v2.3's twenty-three-phase numbering
 * and links by that phase's own key, so no step in this file still implies the sixteen-phase order.
 * The fourteen v1.2 keys all still resolve — see `exportTarget.ts` — so this is a change of naming
 * and not of reachability.
 *
 * **Not changed.** The fourteen integrated workflows themselves. `COTS_Integrated_Workflows.md` was
 * written against the sixteen-phase Export process and is the authority for how Core and Shared are
 * integrated with Export; nothing in the Export update alters what it says. In particular **no new
 * WF-INT workflow has been invented for the seven phases v2.3 inserted.** Those seven — the seasonal
 * purchase plan, the budget, funds, the purchase agreement, the receiving location, the material
 * receipt and the warehouse receipt — have no integrated workflow at all, and that absence is a real
 * finding rather than something to paper over. It is stated as `INTAKE_INTEGRATION_GAP` below and
 * shown on the journey map, and the capability links those phases *would* need are carried on
 * `exportProcess.ts` marked `proposed`, where a reader can see they are proposals.
 */

import type { Owner } from './recordMap';
import { phaseByKey } from './exportProcess';

export interface JourneyStep {
  /** e.g. WF-INT-01 / 4 */
  wf: string;
  step: number;
  title: string;
  owner: Owner;
  /** route inside this integrated mockup; Export screens are `/export/<key>` */
  to?: string;
  /**
   * The Export phase this step's work belongs to, as a phase key from `exportProcess.ts`.
   *
   * It is stated per step and **not** derived from `to`, because several Export screens serve more
   * than one phase: `/export/documents` is the landing screen for phase 20 and also carries phase
   * 19's free days and phase 21's charges, and `/export/bank` serves phase 22 while close-out is
   * phase 23. An earlier draft labelled these steps by their link target and got five of twenty-two
   * attributions wrong, in two cases contradicting `documentChain.ts` in the same change.
   *
   * The label is rendered from the model by `phaseLabel()`, so the number and the phase name can
   * never disagree with `exportProcess.ts`.
   */
  phaseKey?: string;
  /** why this screen, in business terms */
  note: string;
  /** set when the workflow step has no screen anywhere — shown as a gap, never linked */
  unavailable?: string;
}

export interface JourneyWorkflow {
  id: string;
  title: string;
  trigger: string;
  outcome: string;
  steps: JourneyStep[];
}

export const WORKFLOWS: JourneyWorkflow[] = [
  {
    id: 'WF-INT-11',
    title: 'Sign-in, country context and module access',
    trigger: 'A user signs in to COTS to work on Core, Shared or Export activity.',
    outcome:
      'One session whose country, role and permission scope were established by Core, and inside which all Shared and Export work runs.',
    steps: [
      {
        wf: 'WF-INT-11',
        step: 1,
        title: 'Sign in',
        owner: 'core',
        to: '/login',
        note: 'Credentials validated through the C12 integration layer; a failed attempt counts against the lockout threshold.',
      },
      {
        wf: 'WF-INT-11',
        step: 3,
        title: 'Set the active country',
        owner: 'core',
        to: '/select-country',
        note: 'The session carries the country scope; switching country reloads every screen in the new country.',
      },
      {
        wf: 'WF-INT-11',
        step: 4,
        title: 'Apply the country configuration',
        owner: 'core',
        to: '/c10/countries/SD',
        note: 'Which process steps apply, which document checklists are mandatory, which rules and formats are in force.',
      },
      {
        wf: 'WF-INT-11',
        step: 5,
        title: 'Assemble the primary navigation',
        owner: 'integration',
        to: '/',
        note: 'Export, Shared Modules, Reports and Administration within the active country. Import and Distribution is shown as a later phase.',
      },
      {
        wf: 'WF-INT-11',
        step: 6,
        title: 'Decide what the role may do',
        owner: 'core',
        to: '/c1/effective-permissions',
        note: 'Permissions per business object, with the reason and the granting role shown where an action is unavailable.',
      },
      {
        wf: 'WF-INT-11',
        step: 9,
        title: 'Resolve the role to a person',
        owner: 'shared',
        to: '/s10/roles',
        note: 'The directory links the account to a holder, so an approval raised anywhere reaches somebody. A gap is an operational risk.',
      },
      {
        wf: 'WF-INT-11',
        step: 10,
        title: 'Record the session',
        owner: 'core',
        to: '/c8/search',
        note: 'Business activity in the audit trail (C8); technical events in the system log (C9).',
      },
    ],
  },
  {
    id: 'WF-INT-12',
    title: 'Enabling a Shared Module service for a consuming module',
    trigger: 'A module needs a business capability that a Shared module already provides.',
    outcome: 'Each Shared capability is built once and reused, bound by configuration or by a link, under change control.',
    steps: [
      {
        wf: 'WF-INT-12',
        step: 3,
        title: 'Configure the service per consumer and country',
        owner: 'core',
        to: '/c10/countries/SD/steps',
        note: 'Quality control points, document checklists and rules are configuration per process step, not a copy of the capability.',
      },
      {
        wf: 'WF-INT-12',
        step: 3,
        title: 'One non-conformity register, whichever module raised it',
        owner: 'shared',
        to: '/s03/ncs',
        note: 'An export stuffing gate and an import goods-receipt inspection are the same S03 capability at two configured points.',
      },
      {
        wf: 'WF-INT-12',
        step: 6,
        title: 'Publish the service’s reports once',
        owner: 'core',
        to: '/c11/reports',
        note: 'Into the C11 catalogue, where each user’s country and permission scope decides what they see.',
      },
      {
        wf: 'WF-INT-12',
        step: 7,
        title: 'Resolve approvals and notifications',
        owner: 'core',
        to: '/c4/routes',
        note: 'The C4 engine against the S10 role holders, whichever module the work arose in.',
      },
      {
        wf: 'WF-INT-12',
        step: 8,
        title: 'Register the consumer under change control',
        owner: 'core',
        to: '/c10/changes',
        note: 'The set of modules a Shared service serves is visible and versioned.',
      },
    ],
  },
  {
    id: 'WF-INT-01',
    title: 'Trade deal to contract setup readiness',
    trigger: 'A trader agrees a trade deal with a buyer and communicates it to Dubai Execution.',
    outcome:
      'A purchase contract with a locked cost basis, a cleared counterparty, quality and document requirements, and a recorded readiness confirmation.',
    steps: [
      {
        wf: 'WF-INT-01',
        step: 1,
        title: 'Govern the buyer and the commodity first',
        owner: 'core',
        to: '/c3/domains/buyer',
        note: 'A buyer or commodity that is not yet an approved master record cannot appear on a deal.',
      },
      {
        wf: 'WF-INT-01',
        step: 2,
        title: 'Run the cost estimate',
        owner: 'shared',
        to: '/s02/calculator',
        note: 'S02 Costing. An expired element blocks the estimate outright rather than producing a partial result.',
      },
      {
        wf: 'WF-INT-01',
        step: 3,
        title: 'Declare short or long position',
        owner: 'shared',
        to: '/s02/deal',
        note: 'Short position makes the cost calculation mandatory and informs sourcing of the shortfall.',
      },
      {
        wf: 'WF-INT-01',
        step: 4,
        title: 'Attach and lock the costing snapshot',
        owner: 'shared',
        to: '/s02/deal',
        note: 'CS-0271 locks to DEAL-0455. S02 owns the snapshot; every record downstream inherits the reference read-only.',
      },
      {
        wf: 'WF-INT-01',
        step: 5,
        title: 'Counterparty compliance check',
        owner: 'core',
        to: '/c4/approvals',
        note: 'The Compliance team approves a new counterparty on its own C4 route before the contract can proceed.',
      },
      {
        wf: 'WF-INT-01',
        step: 6,
        title: 'Record the purchase contract',
        owner: 'export',
        to: '/export/contract',
        phaseKey: 'contract',
        note: 'The contract is issued in SAP; COTS records SAP-88104 as its reference and holds the execution view.',
      },
      {
        wf: 'WF-INT-01',
        step: 7,
        title: 'Contract quality terms',
        owner: 'shared',
        to: '/s03/contracts',
        note: 'Standards default from master data and may be varied for the buyer; any variation is recorded.',
      },
      {
        wf: 'WF-INT-01',
        step: 8,
        title: 'Check the lots against quantity and tolerance',
        owner: 'export',
        to: '/export/contract-new',
        phaseKey: 'contract',
        note: 'The ceiling is enforced on entry: 1,300 MT + 5 % across three lots.',
      },
      {
        wf: 'WF-INT-01',
        step: 10,
        title: 'Alert the four teams',
        owner: 'core',
        to: '/inbox',
        note: 'C5 notifications and a task each for quality, execution, processing and financial planning.',
      },
      {
        wf: 'WF-INT-01',
        step: 12,
        title: 'Publish the contract position',
        owner: 'core',
        to: '/c11/reports',
        note: 'Approval history, quality terms and the document requirement list, recorded in C8 and published through C11.',
      },
    ],
  },
  {
    id: 'WF-INT-02',
    title: 'Contract to cargo readiness and stock allocation',
    trigger: 'A purchase contract is setup-confirmed and must be broken into shipment lots.',
    outcome: 'Each lot has a planning record, confirmed cargo, allocated stock of the contracted grade, and a visible position.',
    steps: [
      {
        wf: 'WF-INT-02',
        step: 1,
        title: 'Create the execution planning record per lot',
        owner: 'export',
        to: '/export/freight',
        phaseKey: 'freight',
        note: 'Numbered against the contract, with port of loading, shipper, bank, seasonality and owner.',
      },
      {
        wf: 'WF-INT-02',
        step: 3,
        title: 'Take availability from the approved season plan',
        owner: 'shared',
        to: '/s01/processing',
        note: 'The S01 master plan and weekly processing plan give expected finished goods availability for the lot.',
      },
      {
        wf: 'WF-INT-02',
        step: 4,
        title: 'Confirm warehouse capacity',
        owner: 'shared',
        to: '/s01/warehouse',
        note: 'Sufficient capacity confirms the storage position; a shortfall follows WF-INT-03.',
      },
      {
        wf: 'WF-INT-02',
        step: 6,
        title: 'Carry the inspection grade onto the stock',
        owner: 'shared',
        to: '/s03/inspections',
        note: 'Stock blocked by an open non-conformity cannot be allocated until it is resolved.',
      },
      {
        wf: 'WF-INT-02',
        step: 8,
        title: 'Identify stock held under the stock management agreement',
        owner: 'shared',
        to: '/s06',
        note: 'The S06 position identifies SMA stock before allocation. Whether it may be allocated to an export contract is an open business point.',
      },
      {
        wf: 'WF-INT-02',
        step: 9,
        title: 'Monitor the short and long position',
        owner: 'shared',
        to: '/s01/sourcing',
        note: 'A shortfall shows the lot as short and is taken into the sourcing plan for purchase.',
      },
      {
        wf: 'WF-INT-02',
        step: 10,
        title: 'Publish cargo readiness and allocation',
        owner: 'export',
        to: '/export/allocation',
        phaseKey: 'allocation',
        note: 'Planning, execution and processing work from the same position.',
      },
    ],
  },
  {
    id: 'WF-INT-03',
    title: 'Warehouse capacity shortfall to approved capacity',
    trigger: 'Expected and current stock for the season exceeds available storage capacity.',
    outcome: 'Capacity is secured through an approved request, or carried as a visible forecast shortfall.',
    steps: [
      {
        wf: 'WF-INT-03',
        step: 1,
        title: 'Analyse capacity against the approved plans',
        owner: 'shared',
        to: '/s01/warehouse',
        note: 'Per city and per warehouse, using the volumes from the master, sourcing and processing plans.',
      },
      {
        wf: 'WF-INT-03',
        step: 4,
        title: 'Raise a warehouse request',
        owner: 'shared',
        to: '/s01/warehouse',
        note: 'Country, city, capacity required, required-from date and justification.',
      },
      {
        wf: 'WF-INT-03',
        step: 5,
        title: 'Route it for multi-department approval',
        owner: 'core',
        to: '/c4/approvals',
        note: 'Executed by the C4 engine with holders resolved from the S10 directory. The departments and their order are an open business point.',
      },
      {
        wf: 'WF-INT-03',
        step: 8,
        title: 'Publish utilisation and forecast shortfall',
        owner: 'core',
        to: '/c11/cards',
        note: 'Capacity utilisation appears at the point of planning as a card, not only as a report.',
      },
    ],
  },
  {
    id: 'WF-INT-04',
    title: 'Export authorisation and pre-clearance custody',
    trigger: 'An execution planning record requires the export authorisation its country demands.',
    outcome: 'The authorisation is issued, reconciled against the contract quantity, and in recorded custody.',
    steps: [
      {
        wf: 'WF-INT-04',
        step: 1,
        title: 'Read the country configuration',
        owner: 'core',
        to: '/c10/countries/SD/steps',
        note: 'Which instrument applies, which authorities are involved, which custody points receive the pack. A step not configured is marked not applicable.',
      },
      {
        wf: 'WF-INT-04',
        step: 2,
        title: 'Request the authorisation instrument',
        owner: 'export',
        to: '/export/country-prerequisites',
        phaseKey: 'country-prerequisites',
        note: 'Against the planning number, through the exporting entity configured for the country.',
      },
      {
        wf: 'WF-INT-04',
        step: 4,
        title: 'Track issuance and attach the instrument',
        owner: 'export',
        to: '/export/country-prerequisites',
        phaseKey: 'country-prerequisites',
        note: 'Issued number, dates, bank and actual quantity recorded; expiry before the planned shipment date is flagged.',
      },
      {
        wf: 'WF-INT-04',
        step: 4,
        title: 'File the scanned instrument',
        owner: 'core',
        to: '/c7/register',
        note: 'C7 holds the document, its version and its access control; C7 expiry monitoring raises the flag.',
      },
      {
        wf: 'WF-INT-04',
        step: 8,
        title: 'Record custody of the pre-clearance pack',
        owner: 'export',
        to: '/export/clearance',
        phaseKey: 'clearance',
        note: 'OPU then PZU in Sudan. Custody is a prerequisite of the clearance submission.',
      },
      {
        wf: 'WF-INT-04',
        step: 10,
        title: 'Audit the issuance and custody events',
        owner: 'core',
        to: '/c8/search',
        note: 'Issuing-authority and bank turnaround are published through C11.',
      },
    ],
  },
  {
    id: 'WF-INT-05',
    title: 'Freight rate to booking and shipping instruction',
    trigger: 'Cargo is confirmed ready for a shipment lot and freight must be secured.',
    outcome: 'An approved freight offer, a booking appropriate to the shipment type, an issued shipping instruction and recorded free-day exposure.',
    steps: [
      {
        wf: 'WF-INT-05',
        step: 1,
        title: 'Maintain the freight rate grid',
        owner: 'shared',
        to: '/s05/rates',
        note: 'By lane, container size, line and validity. A stale rate makes the dependent cost element expired.',
      },
      {
        wf: 'WF-INT-05',
        step: 2,
        title: 'Feed the costing element from the same grid',
        owner: 'shared',
        to: '/s02',
        note: 'The freight estimated on the contract and the rate used for booking come from one place.',
      },
      {
        wf: 'WF-INT-05',
        step: 4,
        title: 'Select and approve the offer',
        owner: 'core',
        to: '/c4/approvals',
        note: 'On the configured C4 freight offer route. An offer past its validity cannot be selected.',
      },
      {
        wf: 'WF-INT-05',
        step: 5,
        title: 'Raise the service request and shipping instruction',
        owner: 'shared',
        to: '/s05/requests',
        note: 'The service request to logistics applies in Sudan only; other countries contract transport directly.',
      },
      {
        wf: 'WF-INT-05',
        step: 7,
        title: 'Book the shipment',
        owner: 'export',
        to: '/export/freight',
        phaseKey: 'freight',
        note: 'Booking number, line, vessel and ETA at the port of loading, with the confirmation attached.',
      },
      {
        wf: 'WF-INT-05',
        step: 7,
        title: 'Road, bulk vessel and air shipment information sets',
        owner: 'export',
        note: 'Only container shipments are covered today.',
        unavailable:
          'Business confirmation required: the shipment information sets for road, bulk vessel and air freight. Both the Shared logistics workflow and the Export process record these as not yet designed.',
      },
      {
        wf: 'WF-INT-05',
        step: 9,
        title: 'Record free days at both ports',
        owner: 'export',
        to: '/export/shipping-instructions',
        phaseKey: 'shipping-instructions',
        note: 'So detention, demurrage and port storage exposure can be monitored.',
      },
    ],
  },
  {
    id: 'WF-INT-06',
    title: 'Clearance and regulatory activities',
    trigger: 'A booked shipment with its pre-clearance pack in recorded custody is ready for customs.',
    outcome: 'The shipment is cleared with every applicable regulatory activity recorded and evidenced.',
    steps: [
      {
        wf: 'WF-INT-06',
        step: 1,
        title: 'Submit the clearance service request',
        owner: 'shared',
        to: '/s05/clearance',
        note: 'With the export contract and the EX forms, provided custody has been recorded.',
      },
      {
        wf: 'WF-INT-06',
        step: 2,
        title: 'Lodge the customs declaration and obtain release',
        owner: 'export',
        to: '/export/clearance',
        phaseKey: 'clearance',
        note: 'Declaration number recorded, release document attached.',
      },
      {
        wf: 'WF-INT-06',
        step: 4,
        title: 'Record the regulatory activities',
        owner: 'export',
        to: '/export/clearance',
        phaseKey: 'clearance',
        note: 'SSMO, plant protection and fumigation, phytosanitary, health or veterinary, SPC — each with its own state.',
      },
      {
        wf: 'WF-INT-06',
        step: 5,
        title: 'Inspect at the configured control point',
        owner: 'shared',
        to: '/s03',
        note: 'A failure raises a non-conformity in S03 and blocks the affected stock from dispatch.',
      },
      {
        wf: 'WF-INT-06',
        step: 8,
        title: 'Publish the clearance position to logistics',
        owner: 'shared',
        to: '/s05/clearance',
        note: 'One clearance position, read by both logistics and execution.',
      },
      {
        wf: 'WF-INT-06',
        step: 10,
        title: 'Apply the country variations',
        owner: 'export',
        to: '/export/variants',
        note: 'Tanzania adds TANCIS and the VGM filing; Chad adds transit clearance for the overland leg.',
      },
    ],
  },
  {
    id: 'WF-INT-07',
    title: 'Stuffing, loading and movement to port',
    trigger: 'Cargo is cleared and the booking is confirmed, so loading may begin.',
    outcome: 'Cargo stuffed under surveyor supervision, sealed, traceably coded and delivered to the carrier at port.',
    steps: [
      {
        wf: 'WF-INT-07',
        step: 1,
        title: 'Receive and inspect the empty containers',
        owner: 'export',
        to: '/export/stuffing',
        phaseKey: 'stuffing',
        note: 'Surveyor inspection report before the empties move to the stuffing location.',
      },
      {
        wf: 'WF-INT-07',
        step: 4,
        title: 'Weigh the trucks and track the movement',
        owner: 'shared',
        to: '/s05',
        note: 'Loaded against received quantity, tracked in S05. A difference becomes a compliance case.',
      },
      {
        wf: 'WF-INT-07',
        step: 5,
        title: 'Follow stuffing progress daily',
        owner: 'export',
        to: '/export/stuffing',
        phaseKey: 'stuffing',
        note: 'A daily progress report for as many days as the operation takes.',
      },
      {
        wf: 'WF-INT-07',
        step: 6,
        title: 'Inspect at the stuffing area',
        owner: 'shared',
        to: '/s03/inspections',
        note: 'A failed inspection holds stuffing and raises a non-conformity.',
      },
      {
        wf: 'WF-INT-07',
        step: 7,
        title: 'Seal and record the traceability coding',
        owner: 'export',
        to: '/export/stuffing',
        phaseKey: 'stuffing',
        note: 'Traceability coding and batch coding are two separate codes, both recorded, linked, and neither driving allocation.',
      },
      {
        wf: 'WF-INT-07',
        step: 8,
        title: 'Record the local shunting trips',
        owner: 'shared',
        to: '/s05/shunting',
        note: 'For the monthly transportation cost allocation.',
      },
      {
        wf: 'WF-INT-07',
        step: 11,
        title: 'Issue the stuffing report',
        owner: 'export',
        to: '/export/stuffing',
        phaseKey: 'stuffing',
        note: 'The surveyor’s report is what starts WF-INT-08.',
      },
    ],
  },
  {
    id: 'WF-INT-08',
    title: 'Shipping documents, charges and close-out',
    trigger: 'The stuffing report is received and the shipping documents must be produced and issued.',
    outcome: 'Originals issued, the bill of lading with the customer before arrival, charges settled, the contract closed with its cost basis intact.',
    steps: [
      {
        wf: 'WF-INT-08',
        step: 1,
        title: 'The whole document chain, with Core and Shared injected',
        owner: 'integration',
        to: '/document-chain',
        note: 'The seven phases of the export document chain and, at each one, the module that provides what the review says is missing.',
      },
      {
        wf: 'WF-INT-08',
        step: 2,
        title: 'Obtain the draft bill of lading',
        owner: 'export',
        to: '/export/documents',
        phaseKey: 'documents',
        note: 'From the shipping line, against the service request and final shipping instruction.',
      },
      {
        wf: 'WF-INT-08',
        step: 3,
        title: 'Record the customer’s amendment as a comment',
        owner: 'core',
        to: '/c6/discussions',
        note: 'The reason for a returned draft is a comment on the record (C6), not a lost e-mail.',
      },
      {
        wf: 'WF-INT-08',
        step: 6,
        title: 'Move each document through its states',
        owner: 'export',
        to: '/export/documents',
        phaseKey: 'documents',
        note: 'Not issued → draft received → confirmed → original received. No state may be skipped or reversed.',
      },
      {
        wf: 'WF-INT-08',
        step: 6,
        title: 'Store, version and control access to the documents',
        owner: 'core',
        to: '/c7/register',
        note: 'C7 holds them; an expiring certificate blocks the operation it supports.',
      },
      {
        wf: 'WF-INT-08',
        step: 9,
        title: 'Track and settle the five charge types',
        owner: 'export',
        to: '/export/charges',
        phaseKey: 'charges',
        note: 'Local invoice, freight invoice, detention, port storage and other.',
      },
      {
        wf: 'WF-INT-08',
        step: 11,
        title: 'Record the bank submittal',
        owner: 'export',
        to: '/export/bank',
        phaseKey: 'bank',
        note: 'Amount under collection, maturity date and the airway bill the documents travelled by.',
      },
      {
        wf: 'WF-INT-08',
        step: 14,
        title: 'Close out the contract',
        owner: 'export',
        to: '/export/close-out',
        phaseKey: 'close-out',
        note: 'Vessel, bill of lading, invoice, weights, actual quantity and value; the contract set to completed or partially completed.',
      },
      {
        wf: 'WF-INT-08',
        step: 15,
        title: 'Compare the locked estimate against actual',
        owner: 'shared',
        to: '/s02/performance',
        note: 'The snapshot inherited from the deal against the settled charges. Raw material cost is not compared — COTS holds no inventory value.',
      },
    ],
  },
  {
    id: 'WF-INT-09',
    title: 'Exception, claim and compliance case',
    trigger: 'A buyer raises a claim, a stock variance is detected, an incident occurs, or an exchange fails.',
    outcome: 'Every exception is visible in one queue, routed to the module that owns it, and closed with its evidence.',
    steps: [
      {
        wf: 'WF-INT-09',
        step: 1,
        title: 'Collect the exceptions in one queue',
        owner: 'export',
        to: '/export/exceptions',
        note: 'Blocked steps, overdue milestones and open risks, each linking to its record.',
      },
      {
        wf: 'WF-INT-09',
        step: 1,
        title: 'Queue and retry a failed exchange',
        owner: 'core',
        to: '/c12/error-queue',
        note: 'Under the C12 recovery policy, logged in C9, with the business record kept open until it succeeds.',
      },
      {
        wf: 'WF-INT-09',
        step: 2,
        title: 'Register a commercial claim',
        owner: 'shared',
        to: '/s07/register',
        note: 'Buyer, contract, shipment and cause. Theft, fire, accident or damage is an insurance case in S04 instead.',
      },
      {
        wf: 'WF-INT-09',
        step: 4,
        title: 'Value and approve the claim',
        owner: 'shared',
        to: '/s07/claim/CL-0181',
        note: 'On the configured C4 claims route; the decision comment cannot afterwards be edited.',
      },
      {
        wf: 'WF-INT-09',
        step: 6,
        title: 'Raise the variance case',
        owner: 'shared',
        to: '/s04/case/VAR-0051',
        note: 'From discharge, truck receipt or a warehouse balance check, with its evidence.',
      },
      {
        wf: 'WF-INT-09',
        step: 7,
        title: 'Approve on the operational compliance route',
        owner: 'core',
        to: '/c4/routes',
        note: 'Compliance Manager, Head of Department, Finance Manager; the adjustment passes to Inventory Finance through C12.',
      },
      {
        wf: 'WF-INT-09',
        step: 9,
        title: 'Publish open cases with their ageing',
        owner: 'core',
        to: '/c11/reports',
        note: 'Every decision recorded in the audit trail.',
      },
    ],
  },
  {
    id: 'WF-INT-10',
    title: 'Material and transport support for export execution',
    trigger: 'Packaging or operational material is required, or cargo and material must be moved.',
    outcome: 'Material planned, purchased, received and quality-cleared; every movement requested, tracked and reconciled.',
    steps: [
      {
        wf: 'WF-INT-10',
        step: 2,
        title: 'Govern the supplier before the purchase order',
        owner: 'core',
        to: '/c3/domains/supplier',
        note: 'A supplier that is not an approved master record cannot receive a purchase order.',
      },
      {
        wf: 'WF-INT-10',
        step: 3,
        title: 'Record the material purchase',
        owner: 'export',
        to: '/export/material',
        note: 'Purchase order reference, supplier, commodity, contracted quantity and each delivery drawn against it.',
      },
      {
        wf: 'WF-INT-10',
        step: 4,
        title: 'Record receipt per truck',
        owner: 'export',
        to: '/export/material',
        note: 'Plate number, gross weight and packaging counts; net weight is derived, not typed.',
      },
      {
        wf: 'WF-INT-10',
        step: 5,
        title: 'Inspect on arrival',
        owner: 'shared',
        to: '/s03/inspections',
        note: 'Against the commodity standard held in master data. A rejection raises a non-conformity and blocks the material.',
      },
      {
        wf: 'WF-INT-10',
        step: 6,
        title: 'Run the storage inspection and pest control programmes',
        owner: 'shared',
        to: '/s03/programmes',
        note: 'To their schedule, prompted through C5.',
      },
      {
        wf: 'WF-INT-10',
        step: 7,
        title: 'Raise the transportation service request',
        owner: 'shared',
        to: '/s05/requests',
        note: 'At least two days ahead, with quantity, contacts, commodity and urgency.',
      },
      {
        wf: 'WF-INT-10',
        step: 8,
        title: 'Track the movement against the request',
        owner: 'shared',
        to: '/s05',
        note: 'Loaded and received quantity and dates. A difference follows WF-INT-09.',
      },
    ],
  },
  {
    id: 'WF-INT-13',
    title: 'Contract amendment, cancellation and short close',
    trigger: 'Commercial terms change after execution has started, or a contract or lot must be stopped.',
    outcome: 'An amended contract with revalidated lots, allocations, instruments and cost basis — or a clean close with its reason recorded.',
    steps: [
      {
        wf: 'WF-INT-13',
        step: 1,
        title: 'Record the amended terms as a new version',
        owner: 'export',
        to: '/export/contract',
        phaseKey: 'contract',
        note: 'Against the existing SAP reference, retaining the previous version and its history.',
      },
      {
        wf: 'WF-INT-13',
        step: 2,
        title: 'Revalidate the lots against quantity and tolerance',
        owner: 'export',
        to: '/export/contract',
        phaseKey: 'contract',
        note: 'An amended quantity below what is already planned refuses, and states the overshoot.',
      },
      {
        wf: 'WF-INT-13',
        step: 4,
        title: 'Release allocation above the amended quantity',
        owner: 'shared',
        to: '/s06',
        note: 'Back to the position.',
      },
      {
        wf: 'WF-INT-13',
        step: 5,
        title: 'Revalidate the authorisation instruments',
        owner: 'export',
        to: '/export/country-prerequisites',
        phaseKey: 'country-prerequisites',
        note: 'Excess quantity carried as a balance or reduced with the issuing authority; expiry re-checked.',
      },
      {
        wf: 'WF-INT-13',
        step: 6,
        title: 'Take a second costing snapshot',
        owner: 'shared',
        to: '/s02/deal',
        note: 'Both are retained, so the basis of each decision stays visible.',
      },
      {
        wf: 'WF-INT-13',
        step: 10,
        title: 'Audit the amendment',
        owner: 'core',
        to: '/c8/search',
        note: 'Author, reason and the version it replaced.',
      },
    ],
  },
  {
    id: 'WF-INT-14',
    title: 'Daily triage from the Export operations dashboard',
    trigger: 'A user opens COTS to find what needs attention today.',
    outcome: 'One board, filtered to the runner’s own country and permission scope, reaching the record that needs action.',
    steps: [
      {
        wf: 'WF-INT-14',
        step: 2,
        title: 'Start from the springboard',
        owner: 'export',
        to: '/export/home',
        note: 'What is late, due today, due this week, due this month, open risks and open shipments.',
      },
      {
        wf: 'WF-INT-14',
        step: 3,
        title: 'Read the operations dashboard',
        owner: 'export',
        to: '/export/dashboard',
        note: 'Risk alerts, shipment status, contract consumption, pending actions and upcoming milestones.',
      },
      {
        wf: 'WF-INT-14',
        step: 4,
        title: 'Publish its cards on the one reporting engine',
        owner: 'core',
        to: '/c11/cards',
        note: 'The Export module’s content in the C11 catalogue — not a second reporting system.',
      },
      {
        wf: 'WF-INT-14',
        step: 6,
        title: 'Work the pending-actions queue',
        owner: 'integration',
        to: '/inbox',
        note: 'One Actions Inbox across Core and Shared, with the Export queue reached from it.',
      },
      {
        wf: 'WF-INT-14',
        step: 7,
        title: 'Act from the alert',
        owner: 'export',
        to: '/export/exceptions',
        note: 'A blocked or overdue step opens in the exceptions queue and follows WF-INT-09.',
      },
      {
        wf: 'WF-INT-14',
        step: 8,
        title: 'See the same board filtered by your own scope',
        owner: 'core',
        to: '/c11/role-dashboards',
        note: 'Two holders of one role in different countries see different numbers.',
      },
    ],
  },
];

/**
 * The seven phases workflow v2.3 inserted have no integrated workflow.
 *
 * This is the one genuinely new integration finding the Export update produces, and it is stated
 * rather than filled in. `COTS_Integrated_Workflows.md` defines fourteen workflows, WF-INT-01 to
 * WF-INT-14, all written against the sixteen-phase Export process. Workflow v2.3 then inserted seven
 * phases *ahead* of that process — the origin-side intake chain — and no integrated workflow was
 * written for any of them.
 *
 * So for phases 01–07 there is no source that says which Core or Shared capability the work uses.
 * Three things follow, and all three are deliberate:
 *
 *   · **no WF-INT workflow is invented here.** Writing one would turn an integration design nobody
 *     has agreed into something a reviewer would read as agreed;
 *   · the capability links those phases carry in `exportProcess.ts` are all marked `proposed`, and
 *     the capability rail renders a proposal differently from a stated binding;
 *   · the underlying business question is already on the record as the workflow's own **G-31 and
 *     D-23** — whether export owns the origin-side intake chain at all, or sourcing does. Until that
 *     is answered, which module's capabilities these phases should reach is not answerable either.
 */
export const INTAKE_INTEGRATION_GAP = {
  phases: '01–07',
  title: 'The origin-side intake chain has no integrated workflow',
  detail:
    'WF-INT-01 to WF-INT-14 were written against the sixteen-phase Export process. Workflow v2.3 inserted seven phases ahead of it — the seasonal purchase plan, the budget, funds, the purchase agreement, the receiving location, the material receipt and the warehouse receipt — and no integrated workflow covers any of them. No WF-INT workflow has been invented for them here.',
  blockedBy:
    'G-31 / D-23 — whether export owns the origin-side intake chain, or sourcing does. §2.2 excluded it; v2.3 brings it in on a business instruction of 26 August 2026, and records the reversal rather than resolving it. Until that is settled, which module’s capabilities these phases reach is not settled either.',
  seeInstead: '/export',
} as const;

/**
 * The steps that make up the demonstration spine, in the order the work happens.
 *
 * v1.3 adds the two intake steps at the head, because the process now starts at phase 01 and a spine
 * that began at the deal would still be showing the old order. They are marked as the intake chain,
 * whose relationship to the contract spine is exactly what G-31 / D-23 leaves open: the mock-up's
 * purchase agreement links to a seasonal purchase plan, and nothing links either to PC-2041.
 */
export const SPINE_ROUTE: { wf: string; label: string; to: string; owner: Owner; note?: string }[] = [
  { wf: 'WF-INT-11', label: 'Sign in and set the country', to: '/login', owner: 'core' },
  {
    wf: '§6.1–6.2',
    label: 'Plan the season and write the budget',
    to: '/export/seasonal-plan',
    owner: 'export',
    note: 'Phases 01–02. No integrated workflow covers these — see INTAKE_INTEGRATION_GAP.',
  },
  {
    wf: '§6.3–6.7',
    label: 'Fund, agree and receive at origin',
    to: '/export/purchase-agreement',
    owner: 'export',
    note: 'Phases 03–07, the Material Management Portal chain. Whether export or sourcing owns it is G-31 / D-23.',
  },
  { wf: 'WF-INT-01', label: 'Cost the deal and lock the snapshot', to: '/s02/deal', owner: 'shared' },
  { wf: 'WF-INT-01', label: 'Record the purchase contract', to: '/export/contract', owner: 'export' },
  { wf: 'WF-INT-02', label: 'Plan the lots and allocate stock', to: '/s01/processing', owner: 'shared' },
  { wf: 'WF-INT-04', label: 'Authorise and take custody', to: '/export/country-prerequisites', owner: 'export' },
  { wf: 'WF-INT-06', label: 'Clear the shipment', to: '/s05/clearance', owner: 'shared' },
  { wf: 'WF-INT-07', label: 'Stuff, seal and move to port', to: '/export/stuffing', owner: 'export' },
  { wf: 'WF-INT-08', label: 'Issue documents and close out', to: '/export/bank', owner: 'export' },
];

export function workflow(id: string): JourneyWorkflow | undefined {
  return WORKFLOWS.find((w) => w.id === id);
}

/**
 * The phase label for a step — `Phase 21 · Final document assembly and charges` — read from the
 * process model rather than typed on the step.
 *
 * This is the whole reason `phaseKey` exists rather than a `phaseLabel` string: the number and the
 * name come from `exportProcess.ts`, so a renumbering there cannot leave a stale label here, and a
 * key that does not resolve returns undefined rather than rendering a wrong phase.
 */
export function phaseLabel(step: JourneyStep): string | undefined {
  if (!step.phaseKey) return undefined;
  const phase = phaseByKey(step.phaseKey);
  if (!phase) return undefined;
  return `Phase ${String(phase.no).padStart(2, '0')} · ${phase.name}`;
}

/** Every internal destination the journey model uses, for the link check in the walkthrough. */
export function allJourneyTargets(): string[] {
  const out = new Set<string>();
  WORKFLOWS.forEach((w) => w.steps.forEach((s) => s.to && out.add(s.to)));
  SPINE_ROUTE.forEach((s) => out.add(s.to));
  return Array.from(out).sort();
}
