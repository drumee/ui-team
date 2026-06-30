# Document toolbar in edit mode — hide the stale PDF actions

**Date:** 2026-06-30
**Status:** implemented.
**Scope:** `ui-team` only — one file's behavior (`player/document/skeleton/menu.js`).

## Problem

Editing an office document (`.doc/.docx/.rtf`), then using the document window's header
actions that render the **server-side PDF** shows **stale** (pre-edit) content:

- **Print** icon → stale print preview. (Cmd/Ctrl+P shows the correct, updated content.)
- **Download as PDF** icon → downloads the pre-edit PDF.
- **Preview** (eye) icon → reloads the pre-edit server render.

## Root cause

- Editing opens the office editor in a nested iframe chain: Drumee (`bibi.drumee.in`) →
  `euroffice.html` wrapper (same-origin, bare loader) → OnlyOffice/euroffice editor
  (`euroffice.drumee.io`, **cross-origin**). The live document — and the editor's own
  Print button `#btn-print` — live in the cross-origin editor.
- Print and Download-as-PDF fetch the server PDF `SERVICE.media.pdf` → `info.pdf`, a
  conversion built once at upload and **never re-run on demand**
  (`server-team/service/media.js`). Preview (`preview()`) reloads the same server render.
  During edit all three are **stale**.
- **Cmd/Ctrl+P works** because the editor itself handles it and prints its live document.

## Decision

**Hide Print, Preview and Download-as-PDF while editing.** In edit mode the office editor
is the only accurate view of the document; every header action that surfaces the server
render (`info.pdf`) would show pre-edit content, so all three are removed in that mode. The
editor exposes its own Print (`#btn-print` / Cmd+P) for the live document. In view/preview
mode the icons stay — there the served PDF equals the displayed/saved document.

**Exit from edit mode:** the header's window **close** control (`_e.close` → `goodbye`)
remains, so hiding the Preview/eye toggle does not trap the user. (Re-opening the doc lands
in view mode.)

(A delegate approach — keep Print and `postMessage` the editor to click `#btn-print` — was
prototyped and reverted: it required wiring the separate cross-origin euroffice build, and
the editor already surfaces its own Print, so hiding the redundant Drumee actions in edit
mode is simpler and ships entirely in ui-team.)

## The change

`src/drumee/builtins/player/document/skeleton/menu.js` — compute
`const isEditing = ui.mget(_a.mode) == _a.edit;` once, then:

- `download-pdf`: gate on `ui.mget(_a.ext) != _a.pdf && !isEditing`.
- `preview` (eye): removed from the `mode == edit` branch; only offer `edit` when
  `!isEditing && Platform.get("doc_editor")`.
- `print`: gate on `!isEditing`.

The menu rebuilds on every mode change (`updateMenu()` in `edit()`'s iframe onLoad and in
`preview()`), so the icons disappear entering edit and return on leaving it. The action
handlers (`case "print" / "download-pdf" / "preview"` in `index.js`) are unchanged — they
stay correct for view/preview and are simply not reachable via the toolbar during edit.

## Testing (manual — no test runner)

1. Open a `.docx` → EurOffice edit mode → the header toolbar shows
   Download / Maximize / Fullscreen / Close — **no Print, Preview or Download-PDF**.
2. Print the live document via the editor's own Print (`#btn-print` / Cmd+P).
3. Close the doc (or open a doc in view mode) → the Print + Download-PDF icons **return**
   and print/download the server PDF (== displayed/saved document); Edit is offered.

## Non-goals

The deeper server-side staleness (an editor save never rebuilds `info.pdf`, so preview /
download-PDF / PDFium viewer of an edited office doc can be stale/404/racy — see the audit)
is a separate server-team follow-up.
