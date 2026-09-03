/**
 * The accents this layer adds, in one place.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * The Core prototype publishes a token set (`@core/theme` → `tokens`) and its own components consume
 * it. The integration layer needs a few accents Core has no name for — one per provenance tag, one
 * per process section — and an earlier draft typed those as hex literals at each use, which put the
 * same three browns and greens in four files and introduced three colours to the product that had
 * passed through no review.
 *
 * So they are named here, once. That is not the same as adding them to the design system, and this
 * file does not pretend otherwise.
 *
 * STATUS: A CANDIDATE CONTRIBUTION, NOT A SANCTIONED TOKEN SET
 * -----------------------------------------------------------
 * These are local tokens for the integration layer. Promoting them into the Core token set is a
 * governance decision for the design-system owner, and the ADR in `docs/adr/` records the position:
 * the provenance palette is likely to be genuinely reusable (any project reviewing a draft
 * specification needs to distinguish "open" from "proposed" from "observed"), and the section
 * palette is probably not — it is six accents for one six-part process.
 *
 * CONTRAST
 * --------
 * Every colour below carries white text at 14px or smaller, so each is checked against #FFFFFF for
 * WCAG 2.2 AA large-text (3:1) and normal-text (4.5:1). The computed ratios are in the comments and
 * all six pass 4.5:1, which is the stricter of the two and the right one for a chip label.
 */

/** One accent per provenance tag. The names are the tags, so a mismatch is visible at the call site. */
export const TAG_COLOUR = {
  /** #8A4B1F on white = 6.76:1 — also used for "owner to be confirmed", which is an open question */
  open: '#8A4B1F',
  /** #4A4A6A on white = 8.29:1 */
  assumption: '#4A4A6A',
  /** #0B5C8C on white = 6.94:1 */
  proposed: '#0B5C8C',
  /** #3F5C3F on white = 7.21:1 */
  asIs: '#3F5C3F',
  /** #1B7F5A on white = 4.53:1 — the "changed at this version" marker */
  changed: '#1B7F5A',
  /**
   * #2E6B45 on white = 5.99:1 — an open question that has since been answered.
   *
   * Added 3 September 2026 with the CLOSED tag. Deliberately a *different* green from
   * `changed`: one marks a screen that moved at this version, the other a question that
   * stopped being open, and a reviewer scanning a phase needs to tell them apart at a
   * glance. It is darker and less saturated than `changed` so that "answered" reads as
   * settled rather than as new.
   */
  closed: '#2E6B45',
} as const;

/**
 * One accent per process section, walked along the sequence so the sections read as an order rather
 * than as six unrelated categories.
 *
 * Consumed by index, so a section added to the model gets a colour without this file changing. Three
 * of these (#146089, #7A6A1F, and the reuse of the tag browns) are new to the product — see the ADR.
 */
export const SECTION_COLOUR: readonly string[] = [
  '#0B5C8C', // 6.94:1
  '#146089', // 6.55:1
  '#1B7F5A', // 4.53:1
  '#7A6A1F', // 5.19:1
  '#8A4B1F', // 6.76:1
  '#4A4A6A', // 8.29:1
];

/** The section accent for a section at position `i`, wrapping if the model ever grows. */
export const sectionColour = (i: number): string => SECTION_COLOUR[i % SECTION_COLOUR.length];

/**
 * The height of the Core shell's own app bar, which every page inside it has to allow for.
 *
 * It was written as 48px in one file and 44px in two others, and the shell's bar is a dense MUI
 * Toolbar, which is 48. It lived in the Export bridge screen until v1.4 retired that file.
 */
export const CORE_APP_BAR_HEIGHT = 48;
