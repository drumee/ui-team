/**
 * Sidebar workpace item (refactored)
 */

const folderIcon = require("../../../../builtins/media/grid/template/folder");

function getFolderIcon(ui, nodeRole, isWorkspace) {
  const model = ui.model.toJSON();
  return folderIcon({
    ...model,
    filetype: isWorkspace ? _a.hub : _a.folder,
    role: isWorkspace ? 'desk' : nodeRole,
    widgetId: ui._id || _.uniqueId('workspace-icon-'),
    isAttachment: 1,
  });
}

function fileIconName(filetype, ext) {
  if (filetype === _a.image) return 'image';
  if (filetype === _a.video) return 'video';
  if (filetype === _a.audio) return 'desktop_musicfile';
  if (ext === 'pdf') return 'file-pdf';
  if (filetype === 'markdown' || ext === 'md') return 'markdown';
  return 'desktop_docfile';
}

// ---------- Export ----------
module.exports = function (ui) {
  const fig = ui.fig.family;
  const level = ui.mget("level") || 0;
  const isSearchResult = !!ui.mget('result_type');
  const isMessage = ui.mget('result_type') === 'message';
  const nodeRole = ui.mget("nodeRole") || (isSearchResult ? "result" : (level ? "folder" : "workspace"));
  const hasChevron = nodeRole === "folder";
  const isWorkspace = nodeRole === "workspace";
  const filetype = ui.mget(_a.filetype);
  // Message hits carry no filename/filetype — label from the preview and show a
  // chat glyph instead of a file/folder icon.
  const isFolderLike = !isMessage && (filetype === _a.hub || filetype === _a.folder || isWorkspace || nodeRole === "folder");
  const rowName = isMessage ? (ui.mget('preview') || '') : ui.mget(_a.filename);

  return [
    Skeletons.Box.X({
      className: `${fig}__row`,
      service: ui.mget(_a.service),
      uiHandler: [ui],
      radio: ui.mget(_a.radio),
      dataset: { level, role: nodeRole },
      kids: [
        hasChevron ? Skeletons.Note({
          className: `${fig}__chevron`,
          service: "toggle-tree",
          uiHandler: [ui],
          bubble: 0,
        }) : null,
        isFolderLike ? Skeletons.Element({
          className: `${fig}__icon ${ui.mget(_a.area) || ''}`,
          content: getFolderIcon(ui, nodeRole, isWorkspace || filetype === _a.hub),
        }) : Skeletons.Image.Svg({
          className: `${fig}__icon file ${isMessage ? 'message' : (filetype || '')}`,
          ico: isMessage ? 'apps-chat' : fileIconName(filetype, ui.mget(_a.ext)),
        }),
        Skeletons.Note({ className: `${fig}__name`, content: rowName }),
      ],
    }),
    Skeletons.Box.Y({
      className: `${fig}__children`,
      sys_pn: "children",
      partHandler: ui,
      dataset: { level },
    }),
  ];
};
