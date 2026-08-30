/**
 * Springboard and drawer icons.
 *
 * Drawn here rather than pulled from an icon font or a vendor set: the review brief forbids
 * copying the reference application's iconography, and inline SVG keeps the bundle honest
 * (no network request, no licence question). Each icon is a 24-unit line drawing using
 * currentColor, so it inherits the theme automatically.
 *
 * Icons are decorative. Every tile and link states its purpose in text as well, so nothing
 * depends on recognising a glyph.
 */

import type { IconName } from "./modules";

const PATHS: Record<IconName, React.ReactNode> = {
  dashboard: (
    <>
      <rect x="3" y="3" width="7.5" height="7.5" rx="1.5" />
      <rect x="13.5" y="3" width="7.5" height="4.5" rx="1.5" />
      <rect x="13.5" y="10.5" width="7.5" height="10.5" rx="1.5" />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" />
    </>
  ),
  contract: (
    <>
      <path d="M6 3h8l4 4v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
      <path d="M14 3v4h4" />
      <path d="M7.5 11h7M7.5 14h7M7.5 17h4" />
    </>
  ),
  shipment: (
    <>
      <rect x="3" y="7" width="12" height="9" rx="1" />
      <path d="M15 10h3.2l2.3 3v3H15z" />
      <circle cx="7" cy="18.5" r="1.8" />
      <circle cx="17.5" cy="18.5" r="1.8" />
      <path d="M6.5 10.5v2M9.5 10.5v2M12 10.5v2" />
    </>
  ),
  preclearance: (
    <>
      <rect x="4.5" y="4" width="15" height="17" rx="2" />
      <path d="M9 4V2.8h6V4" />
      <path d="M8.5 12.5l2.5 2.5 4.5-5" />
      <path d="M8.5 8h7" />
    </>
  ),
  clearance: (
    <>
      <path d="M12 2.8l7 2.6v6c0 4.6-3 8-7 9.8-4-1.8-7-5.2-7-9.8v-6Z" />
      <path d="M8.8 11.8l2.4 2.4 4-4.6" />
    </>
  ),
  stuffing: (
    <>
      <rect x="3" y="9" width="18" height="11" rx="1.5" />
      <path d="M6.5 9v11M10 9v11M14 9v11M17.5 9v11" />
      <path d="M8 6l4-3 4 3" />
      <path d="M12 3v5" />
    </>
  ),
  document: (
    <>
      <path d="M8 2.8h6.5L19 7.3V19a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V4.8a2 2 0 0 1 2-2Z" />
      <path d="M14.5 2.8v4.5H19" />
      <path d="M5 6.5A2 2 0 0 0 3 8.5V20a2 2 0 0 0 2 2h8" opacity="0.55" />
    </>
  ),
  bank: (
    <>
      <path d="M3.5 9.5 12 4l8.5 5.5" />
      <path d="M5.5 9.5V19M9.8 9.5V19M14.2 9.5V19M18.5 9.5V19" />
      <path d="M3 21h18" />
    </>
  ),
  material: (
    <>
      <rect x="2.5" y="6.5" width="11" height="8.5" rx="1" />
      <path d="M13.5 9.5h4l3.5 3.5V15h-7.5z" />
      <circle cx="6.5" cy="17.5" r="1.7" />
      <circle cx="17" cy="17.5" r="1.7" />
      <path d="M8.2 17.5h7.1" />
    </>
  ),
  variants: (
    <>
      <circle cx="6" cy="5.5" r="2.2" />
      <circle cx="18" cy="12" r="2.2" />
      <circle cx="18" cy="19" r="2.2" />
      <path d="M6 7.7V17a2 2 0 0 0 2 2h7.8" />
      <path d="M6 7.7c0 2.4 1.6 4.3 4 4.3h5.8" />
    </>
  ),
  exceptions: (
    <>
      <path d="M12 3.8 21 19.5H3Z" />
      <path d="M12 9.5v4.6" />
      <circle cx="12" cy="16.8" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),
  reference: (
    <>
      <path d="M4 5.5A2 2 0 0 1 6 3.5h4.5V20H6a2 2 0 0 0-2 2Z" />
      <path d="M20 5.5a2 2 0 0 0-2-2h-4.5V20H18a2 2 0 0 1 2 2Z" />
      <path d="M10.5 3.5v16.5M13.5 3.5v16.5" opacity="0.55" />
    </>
  ),
  /* --- workflow v2.0 additions --- */
  // Origination: a rising price line with the decision point marked — the offer and its costing.
  origination: (
    <>
      <path d="M3 19.5h18" />
      <path d="M4.5 16.5 9 11l3.5 3L20 5.5" />
      <circle cx="9" cy="11" r="1.7" />
      <path d="M16.5 5.5H20V9" />
    </>
  ),
  // Allocation: stacked lots with one drawn off to a contract.
  allocation: (
    <>
      <rect x="3" y="12.5" width="6.5" height="7.5" rx="1" />
      <rect x="10.5" y="12.5" width="6.5" height="7.5" rx="1" />
      <rect x="6.7" y="4.5" width="6.5" height="6.5" rx="1" opacity="0.55" />
      <path d="M18.5 9.5h3M20 8v3" />
    </>
  ),
  // Movement: a route between two points with a waypoint.
  movement: (
    <>
      <circle cx="5" cy="17.5" r="2.2" />
      <circle cx="19" cy="6.5" r="2.2" />
      <path d="M7 16.2c3.4-1 4.2-2.6 4.6-4.4.5-2.1 1.9-3.3 5.3-3.9" />
      <path d="M11.8 11.2h.02" />
      <circle cx="11.9" cy="11.4" r="1.4" opacity="0.55" />
    </>
  ),
  // Freight rates: a grid with a currency mark, the rate table by month.
  rates: (
    <>
      <rect x="3" y="4.5" width="18" height="15" rx="2" />
      <path d="M3 9.5h18M9 9.5v10M15 9.5v10" opacity="0.55" />
      <path d="M11.4 12.8h2.6M11.4 15.4h2.6M12.7 11.5v5.2" />
    </>
  ),
  // Sourcing intake: a bag on a weighbridge.
  sourcing: (
    <>
      <path d="M9 4.5h6l1.5 3c1.6 1.2 2.5 3 2.5 5.2 0 2-1.6 3.6-3.6 3.6H8.6C6.6 16.3 5 14.7 5 12.7c0-2.2.9-4 2.5-5.2Z" />
      <path d="M3 19.5h18" />
      <path d="M5.5 19.5v-1.6M18.5 19.5v-1.6" />
    </>
  ),
  // Close-out: a closed loop with a tick.
  closeout: (
    <>
      <path d="M20.5 12a8.5 8.5 0 1 1-3.1-6.6" />
      <path d="M21 4.5V9h-4.5" />
      <path d="M8.6 12.2l2.5 2.5 4.6-5" />
    </>
  ),
  // Process map: numbered phases in sequence.
  processmap: (
    <>
      <rect x="3" y="4" width="6" height="5" rx="1.2" />
      <rect x="15" y="4" width="6" height="5" rx="1.2" />
      <rect x="3" y="15" width="6" height="5" rx="1.2" />
      <rect x="15" y="15" width="6" height="5" rx="1.2" />
      <path d="M9 6.5h6M18 9v6M15 17.5H9M6 15V9" />
    </>
  ),
};

export function Icon({ name, size = 26 }: { name: IconName; size?: number }) {
  return (
    <svg
      className="icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  );
}

export const ICON_NAMES = Object.keys(PATHS) as IconName[];
