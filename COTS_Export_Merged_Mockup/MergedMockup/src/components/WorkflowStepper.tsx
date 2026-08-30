/**
 * WorkflowStepper — where you are in an ordered process, and how to move one step either way.
 *
 * Deliberately generic. It knows about ordered steps, groups of steps and a current position, and
 * nothing about export, contracts, phases or any COTS terminology. Every label it renders comes from
 * its props, so the same component serves an approval route in Core, a case lifecycle in Shared, or
 * the twenty-three-phase Export process, which is what it was first built for.
 *
 * Two things it does that a plain MUI `<Stepper>` does not, and which are the reason it exists:
 *
 *   1. **It stays usable at twenty-three steps.** A horizontal stepper with twenty-three labelled
 *      nodes is unreadable at any width. This renders the *group* and the position in words, and the
 *      steps as a compact rail of targets whose accessible name carries the full label — so the
 *      sequence is visible without the labels competing for width.
 *
 *   2. **Previous and next are the group's own neighbours in the real sequence**, passed in rather
 *      than computed here, because only the caller knows whether its process allows a step to be
 *      skipped. This component never decides that.
 *
 * It asserts nothing about progress. A step is the current one, earlier in the sequence, or later —
 * never "complete" and never "visited", because both are claims about what has happened, and this
 * component can only see where the reader is standing.
 */

import React from 'react';
import { Box, Button, Chip, Stack, Tooltip, Typography } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { Link } from 'react-router-dom';

export interface WorkflowStep {
  /** position in the sequence, 1-based. Used for the label, never re-sorted. */
  no: number;
  label: string;
  /** the group this step belongs to, used as the heading when it is the current step's group */
  group: string;
  /** where the step opens */
  to: string;
}

export interface WorkflowStepperProps {
  steps: WorkflowStep[];
  /** the step number in force, if any. Absent renders the rail with nothing marked current. */
  currentNo?: number;
  /** the step to the left and the step to the right, in the caller's own sequence */
  prev?: WorkflowStep;
  next?: WorkflowStep;
  /** what one step is called in this process — "phase", "stage", "step". Defaults to "step". */
  unit?: string;
  /** shown above the rail; defaults to the current step's group */
  heading?: string;
  /** true to drop the heading row and render the rail alone, for a dense strip */
  compact?: boolean;
  /** accessible name for the rail. Defaults to a sentence built from `unit`. */
  ariaLabel?: string;
  /** the accent used for the current step. Defaults to the MUI primary colour. */
  colour?: string;
}

export const WorkflowStepper: React.FC<WorkflowStepperProps> = ({
  steps,
  currentNo,
  prev,
  next,
  unit = 'step',
  heading,
  compact = false,
  ariaLabel,
  colour,
}) => {
  const total = steps.length;
  const current = steps.find((s) => s.no === currentNo);
  const accent = colour ?? 'primary.main';

  return (
    <Box>
      {!compact && (
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          alignItems={{ sm: 'center' }}
          sx={{ mb: 0.75 }}
        >
          <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{heading ?? current?.group ?? ''}</Typography>
          {current && (
            <Chip
              size="small"
              label={`${unit} ${current.no} of ${total}`}
              sx={{ height: 20, fontSize: '0.68rem' }}
            />
          )}
          <Box sx={{ flex: 1 }} />
          {/*
            The two buttons carry the neighbouring steps' full names, which can be long — "Draft,
            confirmed and original documents" is one — so their width is capped responsively and the
            pair is allowed to wrap. Two fixed 260px buttons in a row overflowed the page between
            about 560 and 700 CSS pixels, and at 200% zoom.
          */}
          <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', rowGap: 0.5, minWidth: 0 }}>
            <Button
              size="small"
              variant="outlined"
              disabled={!prev}
              component={prev ? Link : 'button'}
              {...(prev ? { to: prev.to } : {})}
              startIcon={<ChevronLeftIcon sx={{ fontSize: 16 }} />}
              sx={{ textTransform: 'none', fontSize: '0.72rem', maxWidth: { xs: 160, sm: 200, lg: 260 }, minWidth: 0 }}
            >
              <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {prev ? `${prev.no}. ${prev.label}` : `No earlier ${unit}`}
              </Box>
            </Button>
            <Button
              size="small"
              variant="outlined"
              disabled={!next}
              component={next ? Link : 'button'}
              {...(next ? { to: next.to } : {})}
              endIcon={<ChevronRightIcon sx={{ fontSize: 16 }} />}
              sx={{ textTransform: 'none', fontSize: '0.72rem', maxWidth: { xs: 160, sm: 200, lg: 260 }, minWidth: 0 }}
            >
              <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {next ? `${next.no}. ${next.label}` : `No later ${unit}`}
              </Box>
            </Button>
          </Stack>
        </Stack>
      )}

      {/*
        The rail. An ordered list, so a screen reader reads it as the sequence it is, and each item
        is a link whose accessible name is the full step label — the number alone would tell a
        non-sighted reader nothing.
      */}
      <Box
        component="ol"
        role="list"
        aria-label={ariaLabel ?? `The ${total} ${unit}s of this process, in order`}
        sx={{
          display: 'flex',
          listStyle: 'none',
          m: 0,
          p: 0,
          gap: '2px',
          overflowX: 'auto',
        }}
      >
        {steps.map((s) => {
          const isCurrent = s.no === currentNo;
          /*
           * "Earlier in the sequence" is derived here from the current position, and is deliberately
           * not a caller-supplied list of visited steps.
           *
           * A `visited` prop invited exactly one mistake, and the first caller made it: it passed
           * every step below the current one, so opening phase 22 from a bookmark marked twenty-one
           * phases as reached when none had been. This component has no way to know what a user has
           * done, and its own documentation says it asserts nothing about progress — so it offers no
           * way to say so. What is left is a position cue, which is honest and is all the rail needs.
           */
          const isBefore = currentNo != null && s.no < currentNo;
          return (
            <Box component="li" key={s.no} sx={{ flex: '1 1 0', minWidth: 16 }}>
              {/*
                `describeChild`, for the same reason as elsewhere: without it MUI's Tooltip replaces
                the link's accessible name with the tooltip prose, and the name is the only thing
                that tells a non-sighted reader which phase this bar is.
              */}
              <Tooltip title={`${s.no}. ${s.label} — ${s.group}`} describeChild disableInteractive>
                <Box
                  component={Link}
                  to={s.to}
                  aria-current={isCurrent ? 'step' : undefined}
                  sx={{
                    /*
                      The bar is 6px; the target is 24px.
                      SC 2.5.8 wants at least 24×24 CSS pixels, and the 24px-spacing exception cannot
                      apply here because the bars sit 2px apart. So the link is a 24px-tall block with
                      the bar drawn inside it by a border, and the whole height is clickable. An
                      earlier draft made the 6px bar the target itself.
                    */
                    display: 'flex',
                    alignItems: 'center',
                    height: 24,
                    textDecoration: 'none',
                    outlineOffset: 1,
                    '&:focus-visible': { outline: '2px solid', outlineColor: accent },
                    '&:hover span[data-bar]': { bgcolor: isCurrent ? accent : 'rgba(0,0,0,0.62)' },
                  }}
                >
                  <Box
                    component="span"
                    data-bar
                    aria-hidden
                    sx={{
                      display: 'block',
                      width: '100%',
                      height: 6,
                      borderRadius: 3,
                      /*
                        Both greys are at least 3:1 against white, which SC 1.4.11 requires of a
                        component boundary. The previous values were 1.35:1 and 2.38:1.
                      */
                      bgcolor: isCurrent ? accent : isBefore ? 'rgba(0,0,0,0.56)' : 'rgba(0,0,0,0.38)',
                    }}
                  />
                  <Box component="span" sx={visuallyHidden}>
                    {/*
                      The position is in the name, not only in the colour. SC 1.4.1: the difference
                      between a phase before the current one and a phase after it must not be carried
                      by a shade of grey alone.
                    */}
                    {`${unit} ${s.no} of ${total}, ${s.label}${
                      isCurrent ? ', the current ' + unit : isBefore ? ', earlier in the sequence' : ', later in the sequence'
                    }`}
                  </Box>
                </Box>
              </Tooltip>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

/**
 * Off-screen but readable by assistive technology.
 *
 * The units are explicit and that is not cosmetic. In MUI's `sx` a unitless number on a size
 * property is a *multiplier of 100%*, so `width: 1` resolves to `width: 100%` — the usual
 * visually-hidden recipe, pasted into `sx`, gives every hidden label a full-width absolutely
 * positioned box. Twenty-three of them extended the document to twice the viewport and put a
 * horizontal scrollbar on the page. `'1px'` is what was meant.
 *
 * `position: fixed` rather than `absolute`, so the box cannot extend the document even if a future
 * caller renders the rail outside a positioned ancestor.
 */
const visuallyHidden = {
  position: 'fixed' as const,
  width: '1px',
  height: '1px',
  padding: 0,
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  clipPath: 'inset(50%)',
  border: 0,
  whiteSpace: 'nowrap' as const,
};

export default WorkflowStepper;
