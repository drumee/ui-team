/* ==================================================================== *
* Widget skeleton automatically generated on 2026-04-01T14:02:19.133Z
* npm run add-widget -- --fig=breadcrumb.item --dest=src/drumee/modules/desk/breadcrumb/item
* ==================================================================== */

/**
 * 
 * @param {*} ui 
 * @returns 
 */

// The workspace/folder icon — the area-tinted shape from
// media/grid/template/folder, the single source this app renders it from (the
// desk sidebar and the workspace switcher both go through it).
//
// This replaces four raw-drumee-folder-{blue,purple,orange,green} names that
// exist in NEITHER sprite: they were computed into a variable the skeleton
// never used, so the breadcrumb has always drawn a bare name with no icon at
// all. The template returns an HTML STRING, hence Element + content rather
// than Image.Svg + ico — passing markup as an icon NAME builds
// `<use href="#<markup>">` and renders nothing.
const folderArt = require("media/grid/template/folder");

module.exports = function (ui) {
  const filename = ui.mget(_a.filename);
  const filetype = ui.mget(_a.filetype);
  const isHub = filetype == _a.hub;
  // A SECTION crumb — Settings, Get help, Plan, Calendar, Inbox, Contacts,
  // Trash, Admin console — is a LABEL, not a node: desk_breadcrumb is fed a
  // bare {filename} for it (_updateContext), there is no folder behind it to
  // draw and nothing to navigate to. So it renders as text alone: no workspace
  // glyph, no leading "/" (it is always the only crumb in the track) and no
  // click target. The workspace switcher's caret beside it hides too — see
  // desk/skin/topbar.scss.
  const isSection = !!ui.mget("isSection");

  let nid = ui.mget(_a.nid);
  let pid = ui.mget(_a.pid);
  if (ui.mget(_a.filetype) == _a.hub) {
    nid = ui.mget(_a.home_id);
    pid = "0";
  }
  const pfx = ui.fig.family;
  let index = ui.getIndex()

  // The tab's contents: the glyph only for a real node, then the name.
  const tabKids = [];
  if (!isSection) {
    tabKids.push(
      Skeletons.Element({
        className: `${pfx}__icon ${ui.mget(_a.area) || ""}`,
        content: folderArt({
          area: ui.mget(_a.area),
          filetype: isHub ? _a.hub : _a.folder,
          role: isHub ? "desk" : "",
          widgetId: _.uniqueId("crumb-icon-"),
          // No kebab in a breadcrumb: there is nothing for it to act on.
          isAttachment: 1,
        }),
      }),
    );
  }
  tabKids.push(
    Skeletons.Note({
      content: filename,
      className: `${pfx}__filename`,
    }),
  );

  const kids = [];
  // "/" per the frame (59:55943), not the old "›".
  // A separator BETWEEN crumbs, never before the first one.
  //
  // Every crumb used to prepend one unconditionally, so the track opened with
  // a stray "/" floating to the left of the workspace — a path that reads
  // "/ Workspace / Folder" instead of "Workspace / Folder". The index is
  // already resolved above for the crumb's own ordering, so the first tab
  // simply skips it.
  if (!isSection && index > 0) {
    kids.push(
      Skeletons.Note({
        content: "/",
        className: `${pfx}__separator`,
      }),
    );
  }
  kids.push(
    Skeletons.Box.X({
      className: `${pfx}__tab`,
      kidsOpt: { active: 0 },
      kids: tabKids,
    }),
  );

  return Skeletons.Box.X({
    debug: __filename,
    className: `${pfx}__main${isSection ? ` ${pfx}__main--section` : ""}`,
    dataset: { current: ui.mget("isCurrent") ? 1 : 0 },
    // Inert for a section label: nothing to browse to, so it carries neither
    // the service nor a handler for one.
    uiHandler: isSection ? undefined : [ui],
    filetype: ui.mget(_a.filetype),
    home_id: ui.mget(_a.home_id),
    filename,
    filepath: ui.mget(_a.filepath),
    nid,
    hub_id: ui.mget(_a.hub_id),
    pid,
    service: isSection ? undefined : _a.browse,
    kidsOpt: {
      active: 0
    },
    kids,
  });
}