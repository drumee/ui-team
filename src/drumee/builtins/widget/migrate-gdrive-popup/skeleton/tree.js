/**
 * Migrate-gdrive popup — recursive tree-rows builder for Selected mode.
 * Reads the popup instance's lazy cache + selection sets and returns the row
 * skeletons fed into the `gdrive-tree` container.
 *
 * No tri-state: checking a folder includes its whole subtree. Descendants of
 * a checked folder render greyed/disabled ("included via parent") — to pick a
 * subset, uncheck the parent first.
 */
const INDENT_PX = 18;
const { filesize } = require('@drumee/ui-essentials');

module.exports = function (ui) {
  const pfx = ui.fig.family;

  const indent = (depth) => ({ paddingLeft: `${depth * INDENT_PX}px` });

  const infoRow = (content, depth, kind) => Skeletons.Note({
    className: `${pfx}__tree-info`,
    dataset: kind ? { kind } : undefined,
    styleOpt: indent(depth),
    content,
  });

  // One item row: caret (folders) + checkbox + icon + name.
  const itemRow = (item, depth, checked, implied) => {
    const isFolder = !!item.is_folder;
    const expanded = isFolder && ui.isExpanded(item.id);

    const caret = isFolder
      ? Skeletons.Button.Svg({
          className: `${pfx}__tree-caret`,
          // Single caret icon; SCSS rotates it -90deg when collapsed
          // (no caret-right icon exists in the sprite).
          ico: 'apps-caret-down',
          service: 'gdrive-tree-expand',
          gid: item.id,
          uiHandler: [ui],
          dataset: { state: expanded ? '1' : '0' },
        })
      : Skeletons.Box.X({ className: `${pfx}__tree-caret ${pfx}__tree-caret--leaf` });

    // Checkbox. Implied (ancestor checked) → shown checked + disabled.
    const box = Skeletons.Box.X({
      className: `${pfx}__tree-check`,
      dataset: { state: (checked || implied) ? '1' : '0', disabled: implied ? '1' : '' },
      service: implied ? null : 'gdrive-tree-check',
      gid: item.id,
      gtype: isFolder ? 'folder' : 'file',
      uiHandler: implied ? undefined : [ui],
      kidsOpt: { active: 0 },
      kids: [Skeletons.Box.Y({ className: `${pfx}__tree-check-mark` })],
    });

    return Skeletons.Box.X({
      className: `${pfx}__tree-row`,
      styleOpt: indent(depth),
      dataset: implied ? { implied: '1' } : undefined,
      kids: [
        caret,
        box,
        Skeletons.Image.Svg({
          // 'dock-folder' is the folder glyph that actually exists in the sprite
          // (there is no '--icon-folder' symbol); 'app-file' for regular files.
          ico: isFolder ? 'dock-folder' : 'app-file',
          className: `${pfx}__tree-ico`,
        }),
        Skeletons.Note({ className: `${pfx}__tree-name`, content: item.name }),
        // Right-aligned size (Figma 1639:52297). Drive only reports sizes for
        // FILES — folders render without one.
        item.size ? Skeletons.Note({
          className: `${pfx}__tree-size`,
          content: filesize(parseInt(item.size, 10) || 0),
        }) : null,
      ].filter(Boolean),
    });
  };

  // Recursively render one folder's level into a flat rows array.
  const renderLevel = (folderId, depth, ancestorChecked) => {
    const rows = [];
    const node = ui.getTreeNode(folderId);

    if (!node) {
      if (ui.isTreeLoading(folderId)) rows.push(infoRow(LOCALE.MIGRATE_GDRIVE_TREE_LOADING || 'Loading…', depth));
      return rows;
    }
    if (node.error) {
      rows.push(infoRow(LOCALE.MIGRATE_GDRIVE_TREE_ERROR || "Couldn't load this folder", depth, 'error'));
      return rows;
    }
    if (!node.items.length) {
      rows.push(infoRow(LOCALE.MIGRATE_GDRIVE_TREE_EMPTY || 'No items', depth));
      return rows;
    }

    for (const item of node.items) {
      const checked = item.is_folder ? ui.isFolderChecked(item.id) : ui.isFileChecked(item.id);
      rows.push(itemRow(item, depth, checked, ancestorChecked));
      if (item.is_folder && ui.isExpanded(item.id)) {
        // A loading child folder with no cache yet still shows its spinner row.
        if (ui.getTreeNode(item.id) || ui.isTreeLoading(item.id)) {
          rows.push(...renderLevel(item.id, depth + 1, ancestorChecked || checked));
        }
      }
    }
    if (node.next_page_token) {
      rows.push(Skeletons.Note({
        className: `${pfx}__tree-more`,
        styleOpt: indent(depth),
        content: LOCALE.MIGRATE_GDRIVE_LOAD_MORE || 'Load more',
        service: 'gdrive-tree-more',
        gid: folderId,
        uiHandler: [ui],
      }));
    }
    return rows;
  };

  return renderLevel('root', 0, false);
};
