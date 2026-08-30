/**
 * SectionNav — a long ordered list of destinations, grouped so it stays navigable.
 *
 * The problem it solves: a process with twenty-three steps cannot become twenty-three top-level
 * navigation entries, and flattening it into one scrolling list of thirty-odd links is no better.
 * Grouping the entries into a handful of sections makes the list readable while leaving the order
 * exactly as the caller supplied it — the grouping is presentation, the order is the process.
 *
 * Domain-neutral: sections, items, an optional number badge per item, an optional current item, and
 * an optional right-hand meta line. No COTS terminology, no assumptions about what a step is.
 *
 * Renders as nested lists — a list of sections, each with its own list of items — so assistive
 * technology reads the structure rather than a wall of links, and each section can be reached by
 * heading.
 */

import React from 'react';
import { Box, Chip, Paper, Stack, Typography } from '@mui/material';
import { Link } from 'react-router-dom';

export interface SectionNavItem {
  key: string;
  label: string;
  to: string;
  /** small leading badge — a step number, a code. Omitted renders no badge. */
  badge?: string;
  /** one line under the label */
  hint?: string;
  /** right-hand meta, e.g. an owner or a count */
  meta?: string;
  /** rendered muted, with the reason in its title, for a destination that exists but is qualified */
  qualifier?: string;
}

export interface SectionNavSection {
  section: string;
  /** one line under the section heading */
  note?: string;
  /** accent for the section's left edge */
  colour?: string;
  items: SectionNavItem[];
}

export interface SectionNavProps {
  sections: SectionNavSection[];
  /** the item key in force, marked with aria-current */
  currentKey?: string;
  /** heading level for the section titles, so the page's outline stays correct */
  headingLevel?: 'h2' | 'h3' | 'h4';
  dense?: boolean;
  columns?: 1 | 2;
  /**
   * Accessible name for the navigation landmark. Given one, the component renders a `<nav>`; without
   * one it renders a plain container, because an unnamed landmark is noise in a landmark list.
   */
  ariaLabel?: string;
}

export const SectionNav: React.FC<SectionNavProps> = ({
  sections,
  currentKey,
  headingLevel = 'h3',
  dense = false,
  columns = 1,
  ariaLabel,
}) => (
  <Box
    {...(ariaLabel ? { component: 'nav' as const, 'aria-label': ariaLabel } : {})}
    sx={{
      display: 'grid',
      gridTemplateColumns: { xs: '1fr', md: columns === 2 ? '1fr 1fr' : '1fr' },
      gap: 1.5,
      alignItems: 'start',
    }}
  >
    {sections.map((sec) => (
      <Paper
        key={sec.section}
        variant="outlined"
        sx={{ p: dense ? 1.25 : 1.75, borderLeft: sec.colour ? `3px solid ${sec.colour}` : undefined }}
      >
        <Typography component={headingLevel} sx={{ fontSize: 14, fontWeight: 600, m: 0 }}>
          {sec.section}
        </Typography>
        {sec.note && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25, mb: 1 }}>
            {sec.note}
          </Typography>
        )}

        {/*
          `role="list"` alongside `listStyle: 'none'`.
          Safari with VoiceOver drops list semantics from a list whose markers are removed, which
          would have made this component's own promise — "assistive technology reads the structure" —
          false in the one browser that most needs it.
        */}
        <Stack component="ul" role="list" spacing={0.4} sx={{ listStyle: 'none', m: 0, p: 0 }}>
          {sec.items.map((item) => {
            const isCurrent = item.key === currentKey;
            return (
              <Box component="li" key={item.key}>
                <Box
                  component={Link}
                  to={item.to}
                  aria-current={isCurrent ? 'page' : undefined}
                  sx={{
                    display: 'flex',
                    flexWrap: { xs: 'wrap', sm: 'nowrap' },
                    alignItems: 'flex-start',
                    gap: 1,
                    px: 1,
                    py: 0.55,
                    borderRadius: 1,
                    textDecoration: 'none',
                    color: 'text.primary',
                    bgcolor: isCurrent ? 'rgba(11,92,140,0.10)' : 'transparent',
                    '&:hover': { bgcolor: 'rgba(0,0,0,0.05)' },
                    '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 1 },
                  }}
                >
                  {item.badge && (
                    <Chip
                      size="small"
                      label={item.badge}
                      sx={{
                        height: 18,
                        minWidth: 26,
                        fontSize: '0.62rem',
                        fontWeight: 700,
                        flexShrink: 0,
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    />
                  )}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontSize: 13, fontWeight: isCurrent ? 600 : 400, lineHeight: 1.35 }}>
                      {item.label}
                    </Typography>
                    {item.hint && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.35 }}>
                        {item.hint}
                      </Typography>
                    )}
                  </Box>
                  {item.qualifier && (
                    <Chip
                      size="small"
                      variant="outlined"
                      label={item.qualifier}
                      title={item.qualifier}
                      sx={{ height: 18, fontSize: '0.6rem', flexShrink: 0 }}
                    />
                  )}
                  {/*
                    The meta line wraps under the label at narrow widths rather than being hidden.
                    It used to be `display: { xs: 'none' }`, and the landing page passes the phase
                    owner through it — so on a phone the twelve confirmed owners disappeared and only
                    the "to be confirmed" qualifier was left, which reads as though nothing has an
                    owner at all.
                  */}
                  {item.meta && (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{
                        flexShrink: 0,
                        maxWidth: { xs: '100%', sm: 190 },
                        textAlign: { xs: 'left', sm: 'right' },
                        order: { xs: 3, sm: 0 },
                        flexBasis: { xs: '100%', sm: 'auto' },
                      }}
                    >
                      {item.meta}
                    </Typography>
                  )}
                </Box>
              </Box>
            );
          })}
        </Stack>
      </Paper>
    ))}
  </Box>
);

export default SectionNav;
