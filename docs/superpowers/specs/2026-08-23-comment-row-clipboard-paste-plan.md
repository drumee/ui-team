# Paste an image onto a comment row

**Date:** 2026-08-23
**Area:** `src/drumee/builtins/window/tasks/` (task panel, Activity / comments)
**Status:** implemented on `fix/tasks-comment-attachments` (plan + amendment below)

## Goal

Ctrl/Cmd+V with an image in the clipboard attaches that image to the comment
under the cursor, on the same terms as dropping a file on it. A screenshot
should reach a comment without first being saved to disk.

## What exists today

- **Pasting inside an editor already works, and means something else.**
  `_onEditorPaste` ([index.js:6371](../../../src/drumee/builtins/window/tasks/index.js#L6371))
  is bound per mention editor (`_initDescEditor` … `editorEl.onpaste`). An
  `image/*` item there is uploaded and inserted as an **inline image at the
  caret** (`_insertPastedImage` → `_uploadInlineImage`, `imgMarker`). That is a
  body-text feature; the plan below leaves it alone, and the amendment at the end
  changes it for exactly one scope (`comment-edit`).
- **A posted comment row has no editor and no caret**, so a paste over one has
  no target at all today: the event goes to `document` and nothing handles it.
- **Dropping** on a row already does exactly what we want the paste to do:
  `resolveZone` ([drop-zones.js](../../../src/drumee/builtins/window/tasks/drop-zones.js))
  → `_dropOnCommentRow` ([index.js:4448](../../../src/drumee/builtins/window/tasks/index.js#L4448)),
  which stages onto `_rowUploads`, paints the chip, uploads and links via
  `task.comment_link_file`. The row has no submit, so the drop *is* the commit.
- `_trackPointer` ([index.js:4722](../../../src/drumee/builtins/window/tasks/index.js#L4722))
  already keeps `_lastPointer` for the positionless window-manager route, and
  `_dropPointEl` ([index.js:4249](../../../src/drumee/builtins/window/tasks/index.js#L4249))
  already turns a coordinate into "the element of ours under it".

The whole feature is therefore a new **entry point** into machinery that
already exists, not new attachment machinery.

## Decisions

| Question | Decision |
|---|---|
| Paste target | The zone under the cursor, resolved through the same `ZONES` table a drop uses. With the cursor inside the panel but over no zone, fall back to the **comment composer draft**. |
| Cursor outside this panel | Ignored entirely — see *Multiple panels*. |
| File types | `image/*` only. Anything else falls through to normal paste behaviour. |
| Caret in an editor | The editor's own paste wins, and the document handler stands down — detected via `e.defaultPrevented`, which `_onEditorPaste` already sets for an image. What that paste *means* per editor: see the amendment below. |
| Busy row | Accepts a paste, exactly as it accepts a further drop. |
| Commit timing | Inherited from the zone: a row commits immediately, a composer/reply/detail/create zone queues on that draft until its own submit. |

### Assumptions

1. ~~Pasting while the caret sits in a comment editor keeps inserting inline,
   even if the cursor happens to hover a different row.~~ **Superseded — see the
   amendment below.** Focus still beats hover: whichever meaning applies, it is
   the focused editor's own handler that decides, not the cursor.
2. A clipboard image usually arrives named `image.png` (Chromium) or unnamed.
   Repeated screenshots therefore collide by name; that is already handled —
   `_resolveAvailableName` now de-duplicates against `_rowUploads` siblings.
3. No new locale strings. The chip appearing in the strip is the feedback.

## Design

### 1. One document-level `paste` listener

Installed from `onDomRefresh` ([index.js:412](../../../src/drumee/builtins/window/tasks/index.js#L412))
beside `_installDnd` / `_trackPointer`, removed in `onBeforeDestroy`
([index.js:261](../../../src/drumee/builtins/window/tasks/index.js#L261)) next to
the existing `_pointerTracker` / `_pointerRelease` teardown.

Document level, not `this.el`, because a paste with nothing focused has no
target inside the panel to bubble from. Non-capture, so an editor's own
`onpaste` runs first and can claim the event.

### 2. Refusals, in order (cheapest first)

```
e.defaultPrevented              → an editor handled it (inline image). Return.
target is inside a contenteditable → the caret owns the paste. Return.
no image/* file in clipboardData → not ours. Return, browser does its thing.
no _detailId                    → no comment surface open. Return.
!_mayWriteTasks()               → free via _zoneFor returning null.
cursor not inside this.el       → another panel's paste (or none). Return.
```

### 3. Target resolution — `_pasteZone()`

Reuses `_dropPointEl({clientX, clientY})` on the remembered pointer position,
then `_activeUploadScope`, i.e. the same `ZONES` walk and the same
`isOwnComment` / surface-open guards a drop gets. Ownership, permissions and
"is that surface even open" therefore need no new rules.

Two deliberate differences from `_pointerScope`
([index.js:4781](../../../src/drumee/builtins/window/tasks/index.js#L4781)):

- **No `POINTER_TTL`.** That 2 s window exists because a *drop* follows a
  mousemove within a frame or two. A paste follows a keystroke, and the pointer
  may have been still for minutes — its position is not stale, it is simply
  where the mouse is. `elementsFromPoint` hit-tests live, so a wheel-scroll
  under a motionless cursor resolves to whatever is under it now, matching
  `:hover`.
- **A `mouseleave` on the panel root clears `_lastPointer`**, so a cursor that
  has left the panel cannot resolve to the row it exited over. That is what
  turns "cursor elsewhere" into the composer fallback rather than a surprise
  attachment.

Fallback when no zone resolves but the cursor is inside the panel: synthesise
the `comment` zone (the composer) via `_draftForKey("comment", {create: true})`,
which is how a drop on the composer already allocates its draft.

### 4. Dispatch — extract what `_onFilesDropped` already does

`_onFilesDropped` ([index.js:4843](../../../src/drumee/builtins/window/tasks/index.js#L4843))
holds the zone→destination rule: `comment-row` commits through
`_dropOnCommentRow`, everything else stashes on a draft and refreshes that
strip. Extract its body verbatim into

```js
async _attachFilesToZone(zone, files)
```

and have both `_onFilesDropped` and the paste handler call it. No behaviour
change for drops; one rule, two entry points — the same reason `resolveZone`
was factored out for the three drag routes.

### 5. Naming

`file.name || "pasted-image.png"`. `_splitFilename` and `_resolveAvailableName`
do the rest at upload time (`_finalizePendingName`), so a second screenshot
becomes `image(1).png` instead of overwriting the first.

## Steps

| # | File | Change |
|---|---|---|
| 1 | `index.js` | Extract `_attachFilesToZone(zone, files)` from `_onFilesDropped`; `_onFilesDropped` becomes the zone-resolution + refusal wrapper that calls it. Pure refactor — the existing drop harnesses must stay green with no edits. |
| 2 | `index.js` | `_clipboardImages(e)`: read `clipboardData.items` (kind `file`, type `image/*`), `getAsFile()`, fall back to `clipboardData.files` filtered to `image/*`. Returns `File[]`. |
| 3 | `index.js` | `_pasteZone()`: `_lastPointer` → `_dropPointEl` → `_activeUploadScope`, no TTL; null when the cursor is outside `this.el`; composer fallback when inside but off-zone. |
| 4 | `index.js` | `_onPasteAttach(e)`: the refusal ladder from §2, then `e.preventDefault()` and `_attachFilesToZone(zone, files)`. `preventDefault` only once we have committed to handling it, so a refused paste still behaves normally. |
| 5 | `index.js` | `_installPasteAttach()` from `onDomRefresh`; listener + the `mouseleave` clear removed in `onBeforeDestroy` alongside `_pointerTracker`. |

No changes to `skeleton/` or `skin/`: the chip, its spinner and its ✕ already
render from `_rowUploads` / the draft strips.

## Edge cases

- **Multiple panels.** Two folder windows with the Task tab open both hear the
  document paste. `_dropPointEl`'s `this.el.contains` test means only the panel
  under the cursor resolves a zone, and the composer fallback is gated on the
  same containment — so exactly one panel claims a paste, or none does.
- **Someone else's comment.** `resolveZone` already refuses a row whose
  `author_uid` is not the viewer, and falls through to *no* zone rather than to
  the enclosing surface — so a paste over another author's comment lands on the
  composer, never silently on their comment.
- **Screenshot with no name / no extension.** Falls back to `pasted-image.png`;
  `_isImageExt` then still yields a thumbnail preview in the staged strips.
- **Paste with the detail closed** (board view): ignored, browser default.
- **Clipboard with an image *and* text** (copying a cell from a spreadsheet):
  we take the image and `preventDefault`, so the text is not also pasted
  somewhere. Matches `_onEditorPaste`'s existing precedence.
- **A very large pasted image** behaves like a large dropped file: chip first,
  upload after, because staging no longer waits on the folder listing.

## Verification

Offline harnesses in the style already used for this area (they lift the real
methods and stub only the boundaries):

1. `_clipboardImages` — picks image items, ignores `text/*` items, tolerates a
   missing `items` (files-only) clipboard, returns `[]` for a plain-text paste.
2. Refusal ladder — `defaultPrevented`, caret in a contenteditable, no detail
   open, cursor outside `this.el`: each returns without calling
   `_attachFilesToZone` and without `preventDefault`.
3. Dispatch — a `comment-row` zone reaches `_dropOnCommentRow` with the pasted
   files; a `comment` zone reaches `_stashPendingFiles` + `_refreshPendingList`;
   another author's row resolves to the composer fallback.
4. `_pasteZone` — resolves with a pointer position minutes old (no TTL), and
   resolves to null after a `mouseleave`.
5. Regression — every existing drop harness passes unedited after step 1.

Manual, on stage (cannot be done on this box — no `task` table in any local
instance): screenshot → hover a row → paste → chip appears and commits; paste
with the cursor off-row → lands on the composer and sends with the comment;
paste twice → two distinctly named files; paste while typing in the composer →
still an inline image.

## Out of scope

- Changing the editors' inline-image paste in any way.
- Non-image clipboard files (decided: images only).
- Pasting onto the task **detail** Attachments block from outside the panel, or
  anywhere with the Task tab closed.
- Copying an attachment *out* of a comment to the clipboard.

## Amendment, 2026-08-23 — paste in edit mode attaches

Implemented after the plan above, on the same branch.

An image pasted into the **`comment-edit`** editor now attaches to that comment
instead of being inserted inline at the caret. A row being edited is the same
surface a drop and the paperclip beside it already attach to
(`comment-row:<id>`), and it commits immediately for the same reason: a row has
no submit of its own for files. Every clipboard image is taken, not just the
first — the attachment strip holds a list, where the caret could only ever take
one.

**Deliberately this scope only.** The main composer, the reply box and both
description editors keep the inline image at the caret, unchanged. The trade-off
accepted here: a paste is no longer a route to an inline image *in a comment
being edited*. Inline images already stored in a comment body still render, and
the description editors keep the feature outright.

The change is four lines inside the existing image branch of `_onEditorPaste`
([index.js](../../../src/drumee/builtins/window/tasks/index.js)); the document
handler from the plan needs no change at all, since `_onEditorPaste` still calls
`preventDefault` and `_onPasteAttach` still stands down on `defaultPrevented`.

Verified per scope: `comment-edit` attaches and inlines nothing; `comment`,
`comment-reply`, `detail` and `create` still inline; two clipboard images both
attach with distinct names; a text paste in edit mode attaches nothing; and an
edit scope with no `_editingCommentId` falls back to the inline path.
