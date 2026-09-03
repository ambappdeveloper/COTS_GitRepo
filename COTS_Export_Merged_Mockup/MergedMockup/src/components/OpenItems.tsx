/**
 * OpenItems — what is not decided, shown where the decision would otherwise be assumed.
 *
 * A specification under review carries statements that are not yet business fact: something nobody
 * has answered, something inferred from silence, something recommended but not agreed. A screen that
 * renders those as ordinary behaviour turns a draft into a requirement, which is the single most
 * expensive mistake a mockup can make.
 *
 * So this component renders each as what it is.
 *
 * **Domain-neutral, with one qualification worth stating rather than glossing.** No business term
 * appears in it, and every item's own text comes from the caller. The *tag vocabulary* below does
 * not: the four tags, their meanings and their colours are fixed here. They are the vocabulary the
 * COTS workflow documents use, so a consumer with a different one would need this set to become a
 * prop. Until there is a second consumer that needs it, it is a constant — see the note on reuse in
 * the README.
 *
 *   · OPEN       — nobody has answered it. Neutral UI, no default behaviour hangs off it.
 *   · ASSUMPTION — a reading taken so that a screen could exist at all. Reversible, and the caller
 *                  should say in one place what to change.
 *   · PROPOSED   — recommended, not agreed. Not to be enforced.
 *   · AS-IS      — observed practice in a live system. Not a question at all, and included because a
 *                  taxonomy that cannot say "this is simply how it works today" forces observed fact
 *                  into one of the other three, which inverts the reader's sense of how settled it is.
 *
 * Ordering is deliberate: OPEN, ASSUMPTION, PROPOSED, then AS-IS — descending uncertainty. The
 * caller's own order within a tag is preserved.
 */

import React from 'react';
import { Box, Chip, Collapse, Link as MuiLink, Paper, Stack, Typography } from '@mui/material';
import { TAG_COLOUR } from './tokens';

/**
 * `CLOSED` joined the vocabulary on 3 September 2026, when a follow-up instruction
 * answered two questions the process model had carried as OPEN.
 *
 * An answered question is retagged rather than deleted, and it keeps its own text. The
 * useful half of such a record is not the answer — that is in the phase's fields by then
 * — it is that the question was asked at all, and what the prototype did while it went
 * unanswered. A reviewer who remembers raising it can see it was heard.
 */
export type OpenTag = 'OPEN' | 'CLOSED' | 'ASSUMPTION' | 'PROPOSED' | 'AS-IS';

export interface OpenItemRow {
  tag: OpenTag;
  text: string;
  /** the decision or gap identifier the source gives the item, where it gives one */
  ref?: string;
}

export interface OpenItemsProps {
  items: OpenItemRow[];
  title?: string;
  /** one line explaining why the list is on the screen at all */
  intro?: string;
  /** collapse past this many rows behind a "show all" control. 0 shows everything. */
  previewCount?: number;
  dense?: boolean;
  /** false to drop the tag legend where several of these sit on one screen */
  legend?: boolean;
}

/* CLOSED sits after OPEN: the unanswered questions come first, because they are the ones
   a reviewer is being asked to do something about. */
const TAG_ORDER: OpenTag[] = ['OPEN', 'CLOSED', 'ASSUMPTION', 'PROPOSED', 'AS-IS'];

const TAG_STYLE: Record<OpenTag, { bg: string; fg: string; meaning: string }> = {
  OPEN: {
    bg: TAG_COLOUR.open,
    fg: '#fff',
    meaning: 'Nobody has answered this. No behaviour on this screen depends on an answer.',
  },
  CLOSED: {
    bg: TAG_COLOUR.closed,
    fg: '#fff',
    meaning:
      'Was open, and has since been answered. Kept rather than deleted, so that a question a reviewer raised can be seen to have been heard.',
  },
  ASSUMPTION: {
    bg: TAG_COLOUR.assumption,
    fg: '#fff',
    meaning: 'A reading taken so that a screen could exist. Reversible, and named as reversible.',
  },
  PROPOSED: {
    bg: TAG_COLOUR.proposed,
    fg: '#fff',
    meaning: 'Recommended and not agreed. Shown, and not enforced.',
  },
  'AS-IS': {
    bg: TAG_COLOUR.asIs,
    fg: '#fff',
    meaning: 'Observed practice in a live system today. Not a question, and not a proposal.',
  },
};

export const OpenItems: React.FC<OpenItemsProps> = ({
  items,
  title = 'What is not decided here',
  intro = 'Carried from the source with its own tag. None of it is treated as confirmed behaviour on this screen.',
  previewCount = 0,
  dense = false,
  legend = true,
}) => {
  const [expanded, setExpanded] = React.useState(false);

  const sorted = React.useMemo(() => {
    const out: OpenItemRow[] = [];
    for (const tag of TAG_ORDER) out.push(...items.filter((i) => i.tag === tag));
    // anything with an unrecognised tag is kept rather than dropped
    out.push(...items.filter((i) => !TAG_ORDER.includes(i.tag)));
    return out;
  }, [items]);

  if (sorted.length === 0) return null;

  const cut = previewCount > 0 && sorted.length > previewCount ? previewCount : sorted.length;
  const head = sorted.slice(0, cut);
  const tail = sorted.slice(cut);

  const counts = TAG_ORDER.map((tag) => ({ tag, n: items.filter((i) => i.tag === tag).length })).filter(
    (c) => c.n > 0,
  );

  return (
    <Paper variant="outlined" sx={{ p: dense ? 1.25 : 1.75 }}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap', gap: 0.5 }}>
        <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{title}</Typography>
        {counts.map(({ tag, n }) => (
          <Chip
            key={tag}
            size="small"
            label={`${n} ${tag.toLowerCase()}`}
            title={TAG_STYLE[tag].meaning}
            sx={{ height: 18, fontSize: '0.6rem', bgcolor: TAG_STYLE[tag].bg, color: TAG_STYLE[tag].fg }}
          />
        ))}
      </Stack>
      {intro && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25, mb: 1 }}>
          {intro}
        </Typography>
      )}

      <Stack component="ul" role="list" spacing={0.75} sx={{ listStyle: 'none', m: 0, p: 0 }}>
        {head.map((item, i) => (
          <Row key={`h-${i}`} item={item} />
        ))}
      </Stack>

      {tail.length > 0 && (
        <>
          <Collapse in={expanded}>
            <Stack component="ul" role="list" spacing={0.75} sx={{ listStyle: 'none', m: 0, mt: 0.75, p: 0 }}>
              {tail.map((item, i) => (
                <Row key={`t-${i}`} item={item} />
              ))}
            </Stack>
          </Collapse>
          <MuiLink
            component="button"
            type="button"
            onClick={() => setExpanded((e) => !e)}
            aria-expanded={expanded}
            sx={{ mt: 1, fontSize: 12.5, cursor: 'pointer' }}
          >
            {expanded ? 'Show fewer' : `Show the other ${tail.length}`}
          </MuiLink>
        </>
      )}

      {/*
        The legend is visible text.
        It used to be a `title` attribute on each tag chip, which put the meaning of the whole
        taxonomy behind a hover on an element MUI renders as a non-focusable div — unreachable by
        keyboard and absent on touch, for the one piece of text that tells the reader how settled any
        of this is.
      */}
      {legend && counts.length > 0 && (
        <Box sx={{ mt: 1.25, pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
          {counts.map(({ tag }) => (
            <Typography key={tag} variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.5 }}>
              <Box component="span" sx={{ fontWeight: 700 }}>
                {tag}
              </Box>{' '}
              — {TAG_STYLE[tag].meaning}
            </Typography>
          ))}
        </Box>
      )}
    </Paper>
  );
};

const Row: React.FC<{ item: OpenItemRow }> = ({ item }) => {
  const style = TAG_STYLE[item.tag] ?? TAG_STYLE.OPEN;
  return (
    <Box component="li" sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
      <Chip
        size="small"
        label={item.tag}
        title={style.meaning}
        sx={{ height: 18, fontSize: '0.58rem', fontWeight: 700, flexShrink: 0, bgcolor: style.bg, color: style.fg }}
      />
      <Typography sx={{ fontSize: 12.5, lineHeight: 1.4, flex: 1 }} color="text.secondary">
        {item.text}
        {item.ref && (
          <Chip
            size="small"
            variant="outlined"
            component="span"
            label={item.ref}
            sx={{ height: 16, fontSize: '0.58rem', ml: 0.75, verticalAlign: 'middle' }}
          />
        )}
      </Typography>
    </Box>
  );
};

export default OpenItems;
