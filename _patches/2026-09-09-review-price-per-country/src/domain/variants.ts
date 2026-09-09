/**
 * Country / operating-unit profiles.
 *
 * Evidence for every flag is cited on the profile itself. The overall matrix is
 * PROVISIONAL — the workshop notes record that an authoritative country/execution-
 * contract matrix is being prepared ("To be prepared by Hiba") and is not in the
 * workspace. See decision D3 in export-process-update.md §14.
 */

import type { AppUser, CountryProfile, CountryUnit } from "./types";

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
    /*
     * Bank details per split shipment — 9 September 2026, "Request bank details only for Sudan".
     *
     * Modelled as a country flag rather than a check on the country code, which is what
     * `usesLogisticsServiceRequest` above does for the other rule the workshop notes record as
     * Sudan-only. The next country that needs it is then a configuration change.
     *
     * [OPEN] Whether it really is Sudan only. Every captured execution plan named a bank and a
     * branch, including the Chad, Ethiopian and Tanzanian ones, which is evidence that the bank
     * is known outside Sudan even if it is not *asked for* there. The instruction says Sudan, so
     * Sudan is what is configured; the other four profiles are false and their shipments say the
     * details are not required rather than that no bank exists.
     */
    requiresShipmentBankDetails: true,
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
    requiresShipmentBankDetails: false,
    hasInlandTransitLeg: true,
    inlandLegLabel: "Ethiopia → Djibouti by land",
    /* The second country the cargo is priced in — see `transitCountry` on the type. */
    transitCountry: "Djibouti",
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
    requiresShipmentBankDetails: false,
    hasInlandTransitLeg: true,
    inlandLegLabel: "Chad → port overland (transit clearance)",
    /* Douala is in Cameroon; the overland leg crosses into it. */
    transitCountry: "Cameroon",
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
    requiresShipmentBankDetails: false,
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
    requiresShipmentBankDetails: false,
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

/* ================================================================== *
 * THE SESSION'S OPERATING COUNTRY
 *
 * WHY THIS EXISTS. The instruction of 3 September 2026 removed the country
 * drop-down from the receiving-location plan line, and gave the reason: the country
 * is already known — Core reads it when the user signs in to COTS. The drop-down
 * existed only because this module had no way to reach that setting, which made a
 * screen ask for something the system already had, and made two answers to one
 * question possible.
 *
 * WHAT IT READS, IN ORDER. `AppUser.country` first, which is where the Core session
 * puts it inside the merged mock-up and where the demo accounts put it standalone.
 * Failing that, the country **name** at the end of the session's `unit` string: the
 * integration layer composes that field as `"<org unit> · <active country>"`, so
 * "Port Sudan Execution · Sudan" yields Sudan and therefore SD. Failing both, the
 * first configured country, flagged as a fallback.
 *
 * WHY THE FALLBACK IS FLAGGED RATHER THAN SILENT. A defaulted country presented as a
 * confirmed one is exactly the defect the drop-down was removed to avoid — a screen
 * asserting a scope nobody chose. `resolved: false` lets a screen say "reading the
 * default" instead, which is honest and is one line on the screen.
 * ================================================================== */

export interface ActiveCountry {
  code: CountryUnit;
  name: string;
  /** false where neither the session nor the account named a country */
  resolved: boolean;
  /** where the answer came from, for saying so on screen */
  source: "session" | "unit" | "default";
}

/** A country name as the Core session writes it — "Sudan" — back to its code. */
export function countryUnitByName(name?: string): CountryUnit | undefined {
  if (!name) return undefined;
  const wanted = name.trim().toLowerCase();
  return COUNTRY_ORDER.find((c) => COUNTRY_PROFILES[c].name.toLowerCase() === wanted);
}

export function activeCountryOf(
  user: Pick<AppUser, "country" | "unit"> | null | undefined,
): ActiveCountry {
  if (user?.country && COUNTRY_PROFILES[user.country]) {
    return {
      code: user.country,
      name: countryName(user.country),
      resolved: true,
      source: "session",
    };
  }
  /* The integration layer writes `unit` as "<org unit> · <active country>". */
  const tail = user?.unit?.split("·").pop();
  const fromUnit = countryUnitByName(tail);
  if (fromUnit) {
    return { code: fromUnit, name: countryName(fromUnit), resolved: true, source: "unit" };
  }
  const fallback = COUNTRY_ORDER[0];
  return { code: fallback, name: countryName(fallback), resolved: false, source: "default" };
}

/**
 * The countries a contract's price is recorded against — 9 September 2026.
 *
 * "If country is Sudan user can add price for Sudan only; for other countries user can add price
 * between one or two countries."
 *
 * One entry for the origin, and a second for the transit country where the profile names one.
 * Sudan, Tanzania and Mozambique load in their own country and return one leg; Chad and Ethiopia
 * cross into Cameroon and Djibouti and return two.
 *
 * Exported from here rather than computed on the screen so that the form and the service layer
 * cannot disagree about which countries are allowed — the service refuses a price against any
 * leg this does not return.
 */
export function reviewPriceLegsFor(contract: { origin: CountryUnit }): {
  leg: "origin" | "transit";
  countryName: string;
}[] {
  const profile = COUNTRY_PROFILES[contract.origin];
  if (!profile) return [];
  const legs: { leg: "origin" | "transit"; countryName: string }[] = [
    { leg: "origin", countryName: profile.name },
  ];
  if (profile.transitCountry) {
    legs.push({ leg: "transit", countryName: profile.transitCountry });
  }
  return legs;
}
