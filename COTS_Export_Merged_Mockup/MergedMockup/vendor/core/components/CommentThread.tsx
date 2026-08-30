import React from 'react';
import {
  Alert, Autocomplete, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControl, InputLabel, MenuItem, Paper, Select, Stack, TextField, Tooltip, Typography
} from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import AlternateEmailIcon from '@mui/icons-material/AlternateEmail';
import { useStore } from '../store';
import { tokens } from '../theme';
import { EmptyState, HandOffBanner, PlaceholderNote, SectionBand, StatusChip } from './shared';
import { Comment6, EDIT_WINDOW_MINUTES, Visibility } from '../mockData/c6';

import { DOC_TYPES as C7_DOC_TYPES } from '../mockData/c7';

/** the governed C07 document types — a comment attachment is classified like any other document */
const DOC_TYPES = C7_DOC_TYPES.map((t) => t.name);

/**
 * C06 1.1–1.6 — the comment panel, in the same position on every operational and
 * master record. WF-C6-01 Steps 1–9 and WF-C6-02 Steps 1–3.
 */
export const CommentThread: React.FC<{
  recordKey: string;
  recordName: string;
  objectType: string;
  country: string;
  route?: string;
  /** the owning module, used when an attachment becomes a C07 document */
  module?: string;
  /** hides the return-reason banner where the caller shows it elsewhere */
  hideReturnBanner?: boolean;
}> = ({ recordKey, recordName, objectType, country, route, module = 'Shared modules', hideReturnBanner }) => {
  const s = useStore();
  const all = s.commentsFor(recordKey);
  const roots = all.filter((c) => !c.parentId);
  const repliesOf = (id: string) => all.filter((c) => c.parentId === id);
  const def = s.visibilityDefault(objectType);
  const returnReason = s.returnReasonFor(recordKey);

  const [replyTo, setReplyTo] = React.useState<Comment6 | null>(null);
  const [text, setText] = React.useState('');
  const [visibility, setVisibility] = React.useState<Visibility>(def.default);
  const [mention, setMention] = React.useState<string | null>(null);
  const attachmentsApply = s.stepApplies(country, 'c6-attachments');
  const [attachName, setAttachName] = React.useState('');
  const [attachType, setAttachType] = React.useState(DOC_TYPES[0]);
  const [refusal, setRefusal] = React.useState<string | null>(null);
  const [editing, setEditing] = React.useState<Comment6 | null>(null);
  const [editText, setEditText] = React.useState('');
  const [blocked, setBlocked] = React.useState<string | null>(null);
  const [versionsOf, setVersionsOf] = React.useState<Comment6 | null>(null);

  React.useEffect(() => { setVisibility(def.default); }, [def.default]);

  const post = () => {
    const res = s.addComment({
      recordKey, recordName, objectType, country, route,
      author: s.currentUser?.name ?? '—',
      role: s.currentUser?.assignments.find((a) => a.status === 'Active')?.role ?? '—',
      text: text.trim(),
      visibility,
      parentId: replyTo?.id,
      mention: mention ?? undefined,
      attachment: attachName.trim() ? { name: attachName.trim(), docType: attachType } : undefined
    });
    if (!res.ok) { setRefusal(res.refusedMention ?? 'The comment could not be posted.'); return; }
    // C6 / WF-C6-01 / Step 6 → C7 / WF-C7-01 — the attachment is stored as a document on the record
    if (attachName.trim()) {
      s.uploadDocument({
        fileName: attachName.trim(), sizeMB: 1.0, docType: attachType,
        recordKey, recordName, objectType, country, module, route, fromComment: true
      });
    }
    setText(''); setMention(null); setAttachName(''); setReplyTo(null); setRefusal(null);
  };

  const CommentCard: React.FC<{ c: Comment6; nested?: boolean }> = ({ c, nested }) => {
    const left = s.editWindowLeft(c);
    const editable = !c.isDecision && !c.removed && left > 0 && c.author === (s.currentUser?.name ?? '');
    return (
      <Box sx={{ ml: nested ? 4 : 0, mb: 1 }}>
        <Paper
          variant="outlined"
          sx={{
            p: 1.5,
            borderLeft: c.isDecision ? `3px solid ${tokens.primaryDark}` : nested ? `3px solid ${tokens.border}` : undefined,
            bgcolor: c.removed ? '#FAFBFC' : c.isDecision ? '#F5F9FC' : '#fff'
          }}
        >
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ mb: 0.5, gap: 0.5 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 500 }}>{c.author}</Typography>
            <Chip size="small" label={c.role.replace(/_/g, ' ').toLowerCase()} sx={{ height: 18, fontSize: 10.5 }} />
            <Chip size="small" variant="outlined" label={c.country} sx={{ height: 18, fontSize: 10.5 }} />
            <Typography sx={{ fontSize: 12, color: tokens.textSecondary }}>{c.at}</Typography>
            <Box sx={{ flex: 1 }} />
            <Chip
              size="small" variant="outlined" label={c.visibility}
              sx={{ height: 18, fontSize: 10.5, borderColor: c.visibility === 'Internal only' ? tokens.border : tokens.amber, color: c.visibility === 'Internal only' ? tokens.textSecondary : tokens.amber }}
            />
            {c.isDecision && (
              <Tooltip disableInteractive title="A decision comment cannot be edited or removed, so that the approval history remains truthful — WF-C6-02 / Step 2">
                <Chip size="small" icon={<LockOutlinedIcon sx={{ fontSize: 13 }} />}
                      label={`Decision — ${c.decisionOutcome ?? 'recorded'}`}
                      sx={{ height: 18, fontSize: 10.5, bgcolor: '#E4EEF6', color: tokens.primaryDark }} />
              </Tooltip>
            )}
          </Stack>

          {c.removed ? (
            <Typography sx={{ fontSize: 13, fontStyle: 'italic', color: tokens.textSecondary }}>
              Comment removed by {c.removed.by} at {c.removed.at}. The original content remains available to audit and
              compliance — WF-C6-01 / Step 8.
            </Typography>
          ) : (
            <Typography sx={{ fontSize: 13.5, whiteSpace: 'pre-wrap' }}>{c.text}</Typography>
          )}

          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ mt: 0.75, gap: 0.5 }}>
            {c.mention && (
              <Chip size="small" icon={<AlternateEmailIcon sx={{ fontSize: 13 }} />} label={c.mention}
                    sx={{ height: 19, fontSize: 10.5 }} />
            )}
            {c.attachment && (
              <Tooltip disableInteractive title="Stored through C7 Documents and inheriting the access rules of the record — WF-C6-01 / Step 6">
                <Chip size="small" variant="outlined" icon={<AttachFileIcon sx={{ fontSize: 13 }} />}
                      label={`${c.attachment.name} · ${c.attachment.docType}`} sx={{ height: 19, fontSize: 10.5 }} />
              </Tooltip>
            )}
            {c.editedAt && (
              <Button size="small" sx={{ fontSize: 11, p: 0, minWidth: 0 }} onClick={() => setVersionsOf(c)}>
                Edited at {c.editedAt} — {(c.versions?.length ?? 1)} version(s)
              </Button>
            )}
          </Stack>

          {!c.removed && (
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
              {!c.isDecision && (
                <Button size="small" sx={{ fontSize: 11.5 }} onClick={() => { setReplyTo(c); setText(''); }}>Reply</Button>
              )}
              {editable && (
                <>
                  <Button size="small" sx={{ fontSize: 11.5 }} onClick={() => { setEditing(c); setEditText(c.text); }}>Edit</Button>
                  <Button size="small" color="error" sx={{ fontSize: 11.5 }}
                          onClick={() => { const r = s.removeComment(c.id); if (!r.ok) setBlocked(r.why ?? null); }}>
                    Remove
                  </Button>
                  <Typography sx={{ fontSize: 11, color: tokens.textSecondary }}>
                    {left} minute(s) left in the edit window
                  </Typography>
                </>
              )}
              {!c.isDecision && !editable && !c.removed && (
                <Typography sx={{ fontSize: 11, color: tokens.textSecondary }}>
                  {c.author !== (s.currentUser?.name ?? '')
                    ? 'Only the author may edit or remove a comment.'
                    : `The edit window of ${EDIT_WINDOW_MINUTES} minutes has expired — this comment is now fixed.`}
                </Typography>
              )}
              {c.isDecision && (
                <Typography sx={{ fontSize: 11, color: tokens.textSecondary }}>
                  Written by C4 with the decision; it cannot be edited or removed by anyone.
                </Typography>
              )}
            </Stack>
          )}
        </Paper>
        {repliesOf(c.id).map((r) => <CommentCard key={r.id} c={r} nested />)}
      </Box>
    );
  };

  return (
    <Box>
      {/* WF-C6-02 / Step 3 — the returning comment, prominently */}
      {!hideReturnBanner && returnReason && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <b>Reason for return — {returnReason.author}, {returnReason.at}</b>
          <Typography sx={{ fontSize: 13.5, mt: 0.5 }}>{returnReason.text}</Typography>
          <Typography sx={{ fontSize: 12, mt: 0.5, opacity: 0.85 }}>
            C6 / WF-C6-02 / Step 3 — the returning comment is presented prominently to the requester as the reason for
            return, and stays until the record is resubmitted.
          </Typography>
        </Alert>
      )}

      <Paper variant="outlined" sx={{ mb: 2 }}>
        <SectionBand>{replyTo ? `Reply to ${replyTo.author}` : 'Add a comment'}</SectionBand>
        <Box sx={{ p: 2 }}>
          {replyTo && (
            <Alert severity="info" sx={{ mb: 1.5, fontSize: 12.5 }}
                   action={<Button size="small" color="inherit" onClick={() => setReplyTo(null)}>Cancel reply</Button>}>
              Replying to {replyTo.author}, {replyTo.at}: “{replyTo.text.slice(0, 90)}{replyTo.text.length > 90 ? '…' : ''}”.
              The reply is threaded beneath it — WF-C6-01 / Step 3.
            </Alert>
          )}
          <TextField
            fullWidth multiline minRows={2} size="small"
            placeholder={replyTo ? 'Write a reply' : 'Comment on this record'}
            value={text} onChange={(e) => setText(e.target.value)}
          />
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ mt: 1.5 }} alignItems={{ md: 'center' }}>
            <FormControl size="small" sx={{ minWidth: 230 }}>
              <InputLabel>Visibility</InputLabel>
              <Select label="Visibility" value={visibility} onChange={(e) => setVisibility(e.target.value as Visibility)}>
                <MenuItem value="Internal only">Internal only</MenuItem>
                <MenuItem value="Visible to external parties">Visible to external parties</MenuItem>
              </Select>
            </FormControl>
            <Autocomplete
              size="small" sx={{ minWidth: 240 }}
              options={s.users.map((u) => u.name)}
              value={mention} onChange={(_, v) => { setMention(v); setRefusal(null); }}
              renderInput={(p) => <TextField {...p} label="Mention a colleague" />}
            />
            {/* C10 / WF-C10-01 / Step 3 — attachments on comments are a configurable step per country */}
            {attachmentsApply ? (
              <>
                <TextField
                  size="small" sx={{ minWidth: 200 }} label="Attach a file (name)"
                  value={attachName} onChange={(e) => setAttachName(e.target.value)}
                />
                <FormControl size="small" sx={{ minWidth: 190 }} disabled={!attachName.trim()}>
                  <InputLabel>Document type</InputLabel>
                  <Select label="Document type" value={attachType} onChange={(e) => setAttachType(e.target.value)}>
                    {DOC_TYPES.map((d) => <MenuItem key={d} value={d}>{d}</MenuItem>)}
                  </Select>
                </FormControl>
              </>
            ) : (
              <Typography sx={{ fontSize: 12, color: tokens.amber, maxWidth: 320 }}>
                Attachments on comments do not apply in {country} — C10 / WF-C10-01 / Step 3. The control is
                hidden rather than disabled, because a step that does not apply is not presented.
              </Typography>
            )}
            <Box sx={{ flex: 1 }} />
            <Button variant="contained" size="small" disabled={!text.trim()} onClick={post}>
              {replyTo ? 'Post reply' : 'Post comment'}
            </Button>
          </Stack>

          <Typography sx={{ fontSize: 12, color: tokens.textSecondary, mt: 1 }}>
            <b>{objectType}</b> defaults to <b>{def.default.toLowerCase()}</b>. {def.why} Setting external visibility is a
            deliberate act — WF-C6-01 / Step 4. Author, role, country and time are captured by the system, not typed.
          </Typography>

          {refusal && (
            <Alert severity="error" sx={{ mt: 1.5, fontSize: 12.5 }}>
              <b>Mention refused.</b> {refusal}
            </Alert>
          )}
          {attachName.trim() && (
            <Alert severity="info" sx={{ mt: 1.5, fontSize: 12.5 }}>
              The file is stored through <b>C7 Documents</b> and inherits the access rules of this record — it does not
              acquire its own. Posting will create a document of type <b>{attachType}</b> on this record, versioned and
              listed on its Documents tab — C6 / WF-C6-01 / Step 6 and C7 / WF-C7-01.
            </Alert>
          )}
          <PlaceholderNote>
            Business confirmation required: whether external users are permitted to comment, and on which record types
            (WF-C6-01 / Step 4). External visibility is shown here as a setting on an internal author's comment; no
            external composer is built.
          </PlaceholderNote>
        </Box>
      </Paper>

      {roots.length === 0
        ? <EmptyState message="No comments on this record" hint="Discussion stays attached to the transaction rather than living in email." />
        : roots.map((c) => <CommentCard key={c.id} c={c} />)}

      {all.length > 0 && (
        <Paper variant="outlined" sx={{ mt: 2 }}>
          <Box sx={{ p: 2 }}>
            <Stack spacing={1}>
              <HandOffBanner target="C8 / WF-C8-01 Capturing an Audit Entry" passed="Every comment version, edit and removal" />
              <HandOffBanner target="C5 / WF-C5-01 Event-Driven Notifications" passed="The mention notification, where the mentioned user may view the record" />
              <HandOffBanner label="DEPENDENCY" target="C1 / WF-C1-03 Role, Permission and Access Scope Management" passed="The mentioned user and the record" returned="Whether they may view it" />
              <HandOffBanner target="C7 / WF-C7-01 Upload, Classification and Extraction" passed="A file attached to a comment, stored as a document inheriting the record's access rules" />
            </Stack>
          </Box>
        </Paper>
      )}

      {/* edit in place, inside the window */}
      <Dialog open={!!editing} onClose={() => setEditing(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontSize: 16 }}>Edit comment</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ fontSize: 12.5, mb: 2 }}>
            {editing ? `${s.editWindowLeft(editing)} minute(s) remain in the ${EDIT_WINDOW_MINUTES}-minute edit window.` : ''}
            {' '}Every version is retained, so the comment can still be read as it was first written — WF-C6-01 / Step 7.
          </Alert>
          <TextField fullWidth multiline minRows={4} size="small" value={editText} onChange={(e) => setEditText(e.target.value)} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditing(null)}>Cancel</Button>
          <Button variant="contained" disabled={!editText.trim()}
                  onClick={() => {
                    if (!editing) return;
                    const r = s.editComment(editing.id, editText.trim());
                    if (!r.ok) setBlocked(r.why ?? null);
                    setEditing(null);
                  }}>
            Save edit
          </Button>
        </DialogActions>
      </Dialog>

      {/* version history */}
      <Dialog open={!!versionsOf} onClose={() => setVersionsOf(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontSize: 16 }}>Comment versions</DialogTitle>
        <DialogContent>
          {(versionsOf?.versions ?? []).map((v, i) => (
            <Paper key={i} variant="outlined" sx={{ p: 1.5, mb: 1, bgcolor: i === (versionsOf?.versions?.length ?? 1) - 1 ? '#F5F9FC' : '#FAFBFC' }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                <Typography sx={{ fontSize: 12.5, fontWeight: 500 }}>Version {i + 1}</Typography>
                <Typography sx={{ fontSize: 12, color: tokens.textSecondary }}>{v.at} · {v.by}</Typography>
                {i === (versionsOf?.versions?.length ?? 1) - 1 && <StatusChip status="Current" />}
              </Stack>
              <Typography sx={{ fontSize: 13 }}>{v.text}</Typography>
            </Paper>
          ))}
          <Typography sx={{ fontSize: 12.5, color: tokens.textSecondary }}>
            Every version is retained in the audit trail — WF-C6-01 / Step 7 and HAND-OFF → C8 / WF-C8-01.
          </Typography>
        </DialogContent>
        <DialogActions><Button onClick={() => setVersionsOf(null)}>Close</Button></DialogActions>
      </Dialog>

      {/* refusals: expired window, decision comment */}
      <Dialog open={!!blocked} onClose={() => setBlocked(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontSize: 16 }}>This comment cannot be changed</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ fontSize: 13 }}>{blocked}</Alert>
        </DialogContent>
        <DialogActions><Button onClick={() => setBlocked(null)}>Close</Button></DialogActions>
      </Dialog>
    </Box>
  );
};
