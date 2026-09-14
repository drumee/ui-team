# Access panel in the chat column — design

**Status:** approved 2026-09-12
**Plan:** `docs/superpowers/plans/2026-09-12-access-panel-in-chat-column.md`

## Problem

In a workspace, the desk rail's **Access** (`desk-module-sidebar__item`, service
`rail-access`) opens the members panel (`permission_restricted`,
`.permission-restricted__main`) as a 360px drawer inside the folder window's
dialog wrapper (`.window__wrapper-modal`). That wrapper is a later sibling of
`window-folder__split-body` and, when open, a transparent 100%×100% box over it,
so the file grid behind the drawer stops taking clicks. Every other rail item
(Files, Chat, Task, Meet) is a *view* of the split body, switched by
`showFolderTab(tab)` stamping `data-view`; Access is the one that is not.

## Decisions

| Question | Decision |
|---|---|
| Where the panel appears | In the **chat column**: `files | gutter | members`, the members panel in `window__chat-panel`'s slot, with the chat panel's card look. |
| Rail behaviour | Access is **a tab like Files/Chat**. Other rail items switch away and bring the chat column back. Clicking Access again while it is up does nothing. |
| Close ✕ in column mode | **Removed.** The rail is the way out. |
| Which openers move | **Rail Access only** (desktop rail and phone rail, both `rail-access`). The workspace header's link icon, the create-workspace follow-up, the reward flow, window/hub.js settings and the folder topbar/overflow entries keep their current drawer or modal. |
| Compact (split body ≤700px) | **Members full width**, like the Chat tab on compact. |

## Design

1. **Routing (desk).** `_railAccess(opt)` with `opt.members` calls
   `w.showFolderTab("access")` and raises the window, keeping its current
   preamble (`_navigated`, `mtab`, `_leaveSectionScreen`, ending unrelated
   in-window tours and waiting for them). Without `opt.members` — the header
   icon's `_workspaceAccessFromHeader` — it keeps sending `folder-manage-access`.
2. **Folder window.** `showFolderTab` gains an `access` view. On first entry the
   members panel is appended to the split body once
   (`{ kind: "permission_restricted", mode: "column", sys_pn: "folder-access-panel", … }`),
   like the task board; re-entry refreshes its member list. An open Settings or
   secure-share drawer is cleared on entry so the matrix is never on screen
   twice. The Files toolbar gates ("+ New", view toggle) treat `access` like
   `files`, because the file grid stays on screen.
3. **Members panel.** `mode: "column"` stamps `data-mode="column"` on the root
   and omits the ✕. Drawer mode is unchanged.
4. **Skin.** Folder: the panel is hidden in the split body by default;
   `[data-view="access"]` uses the Files grid (`var(--files-w) 12px minmax(0,1fr)`),
   shows files and gutter, hides chat/thread rail/file-thread panel/tasks/
   meeting, and shows the members panel as a card (r=8, 5% hairline,
   `--normal-bg-90`). Compact: members full width. Restricted:
   `__ui[data-mode="column"]` drops the absolute 360px dock for a cell-filling
   panel.

## Risks

- The chat column can be narrower than the 360px the panel was drawn for on a
  small desktop; member rows and the role description card must be checked
  there.
- `showFolderTab` never re-feeds the split body; if something else does, the
  mounted panel goes with it — the same exposure the task board already has.
