/**
 * Country / operating-unit profiles.
 *
 * Evidence for every flag is cited on the profile itself. The overall matrix is
 * PROVISIONAL — the workshop notes record that an authoritative country/execution-
 * contract matrix is being prepared ("To be prepared by Hiba") and is not in the
 * workspace. See decision D3 in export-process-update.md §14.
 */

import type { CountryProfile, CountryUnit } from "./types";

export const COUNTRY_PROFILES: Record<CountryUnit, CountryProfile> = {
  SD: {
    code: "SD",
    name: "Sudan",
    partnerEntity: "Invictus / Sayga / Green Zone",
    usesExportContract: true,
    usesExportForms: true,
    usesExportPermit: false,
    startsFromCommercialInvoice: false,
    usesLogisticsServiceRequest: true,
    hasInlandTransitLeg: false,
    loadPort: "Port Sudan",
    regulators: [
      "Customs",
      "SSMO",
      "Plant Protection",
      "Health Ministry",
      "Chamber of Commerce",
      "Ministry of Trade",
    ],
    simplifiedDocumentTracking: false,
    evidence: [
      "Export/Execution & Operation Processes.vsdx p2 (13-lane Sudan detail)",
      "COTS - Workshop Notes: EX contract and EX form applicable; Service request for logistics applicable to Sudan only",
      "Export/OBL Process.pdf; Export/Phyto & Fum and COO.pdf",
    ],
  },
  ET: {
    code: "ET",
    name: "Ethiopia",
    partnerEntity: "African Lakes (ALE) / Amros (Djibouti)",
    usesExportContract: true,
    usesExportForms: false,
    usesExportPermit: true,
    startsFromCommercialInvoice: false,
    usesLogisticsServiceRequest: false,
    hasInlandTransitLeg: true,
    inlandLegLabel: "Ethiopia → Djibouti by land",
    loadPort: "Djibouti",
    regulators: ["Export permit authority", "Authorities sampling"],
    simplifiedDocumentTracking: false,
    evidence: [
      "COTS - Workshop Notes: EX contract applicable in Ethiopia; EX form mainly Sudan",
      "Export/Export Processes.vsdx p3: 'Use purchase contract to apply for Export Permit'",
      "Export/Export Processes.vsdx p2-p3: stuffing location decision, cargo moved to Djibouti via land",
      "Export/Ethiopia & Chad Execution.vsdx p1: ALE Execution, Amros Finance, Invictus FP&A lanes",
    ],
  },
  TD: {
    code: "TD",
    name: "Chad",
    partnerEntity: "Renatus",
    usesExportContract: true,
    usesExportForms: false,
    usesExportPermit: false,
    startsFromCommercialInvoice: false,
    usesLogisticsServiceRequest: false,
    hasInlandTransitLeg: true,
    inlandLegLabel: "Chad → port overland (transit clearance)",
    loadPort: "Douala",
    regulators: ["Customs", "Transit authorities"],
    simplifiedDocumentTracking: true,
    evidence: [
      "Export/Export Processes.vsdx p1 (Chad operations)",
      "Export/Ethiopia & Chad Execution.vsdx p2: trucks loading & weighting, trucks movement, trucks clearance, issue transit documents",
      "Export Screnshots/Chad Execution Tab/Chad Shipment Execution: transit and arrival status fields (unused - decision D8)",
      "Export Screnshots/Chad Execution Tab/Chad Shipment Documents Tracking: originals only for COO, Fumigation, Phyto; no charge tracking",
    ],
  },
  TZ: {
    code: "TZ",
    name: "Tanzania",
    partnerEntity: "—",
    usesExportContract: false,
    usesExportForms: false,
    usesExportPermit: true,
    startsFromCommercialInvoice: false,
    usesLogisticsServiceRequest: false,
    hasInlandTransitLeg: false,
    loadPort: "Dar es Salaam",
    regulators: ["TRA", "TANCIS", "Atomic authority", "Customs"],
    simplifiedDocumentTracking: false,
    evidence: [
      "COTS - Workshop Notes: 'Ex contract is not applicable in all countries (not applicable in Tanzania…)'",
      "Export/Tanzania Shipping Process.pdf: Export Permit, Booking, CFS stuffing, Report on TANCIS, VGM, TRA Release Order, Atomic Certificate, Warphage & Port Charges, EFD Receipt",
    ],
  },
  MZ: {
    code: "MZ",
    name: "Mozambique",
    partnerEntity: "Merek",
    usesExportContract: false,
    usesExportForms: false,
    usesExportPermit: false,
    startsFromCommercialInvoice: true,
    usesLogisticsServiceRequest: false,
    hasInlandTransitLeg: false,
    loadPort: "Beira",
    regulators: ["Customs", "Official authorities"],
    simplifiedDocumentTracking: false,
    evidence: [
      "COTS - Workshop Notes: 'In Mozambique the process for PC execution starts with issuing commercial invoice document to start the process with the customs and official authorities.'",
      "Export/MOZ Execution process v1.pdf",
    ],
  },
};

export const COUNTRY_ORDER: CountryUnit[] = ["SD", "ET", "TD", "TZ", "MZ"];

export function countryName(code: CountryUnit): string {
  return COUNTRY_PROFILES[code]?.name ?? code;
}
