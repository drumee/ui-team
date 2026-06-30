# Document print in edit mode — hide the stale toolbar Print

**Date:** 2026-06-30
**Status:** implemented + verified live.
**Scope:** `ui-team` only — one file's behavior (menu.js); index.js delegate code removed.

## Problem

Editing an office document (`.doc/.docx/.rtf`), then clicking the document window's
header **Print** icon shows a **stale** print preview (pre-edit content). **Cmd/Ctrl+P**
shows the correct, updated content.

## Root cause

- Editing opens the office editor in a nested iframe chain: Drumee (`bibi.drumee.in`) →
  `euroffice.html` wrapper (same-origin, bare loader) → OnlyOffice/euroffice editor
  (`euroffice.drumee.io`, **cross-origin**). The live document — and the editor's own
  Print button `#btn-print` — live in the cross-origin editor.
- The header **Print** icon (`player/document/skeleton/menu.js`) fetches the server PDF
  `SERVICE.media.pdf` → `info.pdf`, a conversion built once at upload and **never re-run
  on demand** (`server-team/service/media.js`). During edit it is **stale**.
- **Cmd/Ctrl+P works** because the editor itself handles it and prints its live document.

## Decision

**Hide the header Print icon while editing.** In edit mode the office editor exposes its
own Print (`#btn-print` / Cmd+P) that prints the live document; the Drumee header Print
would print the stale server PDF, so it is removed in that mode. In view/preview mode the
icon stays — there the served PDF equals the displayed/saved document, so printing it is
correct.

(A delegate approach — keep the icon and `postMessage` the editor to click `#btn-print` —
was prototyped and reverted: it required wiring the separate cross-origin euroffice build,
and the editor already surfaces its own Print, so hiding the redundant Drumee icon in edit
mode is simpler and ships entirely in ui-team.)

## The change

`src/drumee/builtins/player/document/skeleton/menu.js` — gate the `print` action on
`ui.mget(_a.mode) != _a.edit`, mirroring the file's existing edit↔preview swap. The menu
rebuilds on every mode change (`updateMenu()` in `edit()`'s iframe onLoad and in
`preview()`), so the icon disappears entering edit and returns on leaving it. No change to
`case "print"` (it stays correct for view/preview and is simply not reachable via the icon
during edit).

## Testing (manual — no test runner)

1. Open a `.docx` → it opens in EurOffice edit mode → the header toolbar shows
   Download / Download-PDF / Preview / Maximize / Fullscreen / Close — **no Print**.
   (Verified live: `printPresent: false` in edit mode.)
2. Print the live document via the editor's own Print (`#btn-print` / Cmd+P).
3. Switch to Preview (eye) / open a doc in view mode → the Print icon **returns** and
   prints the server PDF (== displayed/saved document).

## Non-goals

The deeper server-side staleness (an editor save never rebuilds `info.pdf`, so preview /
download-PDF / PDFium viewer of an edited office doc can be stale/404/racy — see the audit)
is a separate server-team follow-up.
