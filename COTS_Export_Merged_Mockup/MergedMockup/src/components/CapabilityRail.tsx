/**
 * CapabilityRail — the platform capabilities a screen uses, as links to where they already live.
 *
 * This is the component that keeps a module from rebuilding what the platform already provides. On
 * any screen that needs an approval, a document, an audit entry, a comment thread, a quality
 * inspection or a movement record, the rail names that capability and links to the existing screen
 * that owns it — so the reviewer can see that the capability is reused, and a developer reading the
 * mockup is not tempted to build a second one inside the module.
 *
 * Domain-neutral. It knows a code, a label, a colour, a destination and *why the link exists*. It
 * knows nothing about which modules exist or what they are called.
 *
 * THE `basis` FIELD IS THE POINT.
 * A capability link is either something a source document states, or something this layer proposes.
 * Rendering both identically would quietly turn a proposal into a requirement, which is exactly what
 * the workflow documents ask not to happen. So the basis is always visible:
 *
 *   · `stated`   — a source binds this screen to this capability. Rendered plainly.
 *   · `workflow` — a source names the capability for this step without binding the screen.
 *   · `proposed` — no source states the binding; this layer suggests it. Rendered dashed, and
 *                  labelled as a proposal in its own tooltip and in the legend.
 */

import React from 'react';
import { Box, Chip, Paper, Stack, Tooltip, Typography } from '@mui/material';
import { Link } from 'react-router-dom';

export type CapabilityBasis = 'stated' | 'workflow' | 'proposed';

export interface CapabilityItem {
  /** the capability's own code in the consuming organisation's terms — C04, S03, … */
  code: string;
  label: string;
  /** where the capability already lives */
  to: string;
  /** accent for the owning area, supplied by the caller */
  colour: string;
  basis: CapabilityBasis;
  /**
   * False where the signed-in account may not reach this capability.
   *
   * An unavailable item is still shown — the point of the rail is that the capability exists and is
   * reused, which is true whoever is looking — but it is rendered as text rather than a link, with
   * the reason beside it. Showing a link and then refusing it is the failure this exists to avoid.
   * Defaults to true, so a caller with no permission model gets the previous behaviour.
   */
  available?: boolean;
  /** why it is unavailable. Shown on the item; required in practice whenever `available` is false. */
  unavailableReason?: string;
}

export interface CapabilityRailProps {
  items: CapabilityItem[];
  title?: string;
  /** one line under the title, for the rule the rail exists to serve */
  intro?: string;
  /** false to drop the legend where the rail is used repeatedly on one screen */
  legend?: boolean;
  dense?: boolean;
  /**
   * The provenance vocabulary. Defaults to the three values `CapabilityBasis` names; override to
   * reuse the component with a different one rather than editing this file.
   */
  basisText?: Record<CapabilityBasis, string>;
  basisLabel?: Record<CapabilityBasis, string>;
}

const DEFAULT_BASIS_TEXT: Record<CapabilityBasis, string> = {
  stated: 'The integrated workflow binds this step to this capability.',
  workflow: 'The process document names this capability for this step, without binding the screen.',
  proposed:
    'No source states this binding. It is proposed here because this is where the capability already lives — treat it as a suggestion, not as confirmed behaviour.',
};

const DEFAULT_BASIS_LABEL: Record<CapabilityBasis, string> = {
  stated: 'stated',
  workflow: 'named',
  proposed: 'proposed',
};

export const CapabilityRail: React.FC<CapabilityRailProps> = ({
  items,
  title = 'Capabilities this step uses',
  intro = 'Reached where they already live. Nothing here is a second copy built inside this module.',
  legend = true,
  dense = false,
  basisText = DEFAULT_BASIS_TEXT,
  basisLabel = DEFAULT_BASIS_LABEL,
}) => {
  if (items.length === 0) return null;

  const BASIS_TEXT = basisText;
  const BASIS_LABEL = basisLabel;
  const bases = Array.from(new Set(items.map((i) => i.basis)));
  const blocked = items.filter((i) => i.available === false).length;

  return (
    <Paper variant="outlined" sx={{ p: dense ? 1.25 : 1.75 }}>
      <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{title}</Typography>
      {intro && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
          {intro}
        </Typography>
      )}

      <Stack component="ul" role="list" spacing={0.5} sx={{ listStyle: 'none', m: 0, p: 0 }}>
        {items.map((item, i) => {
          const available = item.available !== false;

          const body = (
            <>
              <Chip
                size="small"
                label={item.code}
                sx={{
                  height: 18,
                  fontSize: '0.62rem',
                  fontWeight: 700,
                  flexShrink: 0,
                  bgcolor: available ? item.colour : 'transparent',
                  color: available ? '#fff' : 'text.secondary',
                  border: available ? undefined : '1px solid',
                  borderColor: available ? undefined : 'divider',
                }}
              />
              <Typography
                sx={{ fontSize: 12.5, lineHeight: 1.35, flex: 1 }}
                color={available ? 'text.primary' : 'text.secondary'}
              >
                {item.label}
              </Typography>
              {/*
                The basis is a word as well as a border style. A dashed edge alone would carry the
                distinction by appearance only, which is exactly what SC 1.4.1 forbids.
              */}
              {item.basis !== 'stated' && (
                <Chip
                  size="small"
                  variant="outlined"
                  label={BASIS_LABEL[item.basis]}
                  sx={{ height: 18, fontSize: '0.6rem', flexShrink: 0 }}
                />
              )}
              {!available && (
                <Chip
                  size="small"
                  label="not in your scope"
                  sx={{ height: 18, fontSize: '0.6rem', flexShrink: 0 }}
                />
              )}
            </>
          );

          const frame = {
            display: 'flex',
            alignItems: 'flex-start',
            gap: 1,
            px: 1,
            py: 0.6,
            textDecoration: 'none',
            borderLeft: '3px solid',
            borderLeftColor: available ? item.colour : 'divider',
            borderRadius: '0 4px 4px 0',
            bgcolor: item.basis === 'proposed' ? 'transparent' : 'rgba(0,0,0,0.015)',
            ...(item.basis === 'proposed' ? { borderLeftStyle: 'dashed' } : {}),
          } as const;

          return (
            <Box component="li" key={`${item.code}-${item.to}-${i}`}>
              {available ? (
                /*
                 * `describeChild` is not optional here, and the reason is easy to get wrong.
                 *
                 * MUI's Tooltip, with `describeChild` false — its default — sets `aria-label={title}`
                 * on the child and spreads it *before* the child's own props. So a link with no
                 * aria-label of its own has its text replaced as its accessible name, and every link
                 * in this rail would announce the same one-sentence explanation of `basis` instead of
                 * its code and label. With `describeChild` the tooltip becomes `aria-describedby` and
                 * the link keeps its own name.
                 */
                <Tooltip title={BASIS_TEXT[item.basis]} describeChild disableInteractive>
                  <Box
                    component={Link}
                    to={item.to}
                    sx={{
                      ...frame,
                      color: 'text.primary',
                      '&:hover': { bgcolor: 'rgba(0,0,0,0.05)' },
                      '&:focus-visible': { outline: '2px solid', outlineColor: item.colour, outlineOffset: 1 },
                    }}
                  >
                    {body}
                  </Box>
                </Tooltip>
              ) : (
                /* Not a link, because following it would only reach a refusal. */
                <Box sx={frame}>{body}</Box>
              )}
              {!available && item.unavailableReason && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', pl: 2, pt: 0.25 }}>
                  {item.unavailableReason}
                </Typography>
              )}
            </Box>
          );
        })}
      </Stack>

      {/*
        The legend is visible text rather than a tooltip, so it reaches touch and keyboard users. It
        is the only place the reader is told what a dashed edge means.
      */}
      {legend && (bases.length > 1 || blocked > 0) && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
          {bases.includes('proposed') || bases.includes('workflow')
            ? 'A dashed edge and the word “proposed” mark a link this layer proposes rather than one a source states; “named” marks one the process document names without binding the screen. '
            : 'Every link above is one a source states. '}
          {blocked > 0 &&
            `${blocked} of ${items.length} ${blocked === 1 ? 'is' : 'are'} outside this account’s module scope and shown without a link, because following one would only reach a refusal.`}
        </Typography>
      )}
    </Paper>
  );
};

export default CapabilityRail;
