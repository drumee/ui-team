const contextmenu = require('builtins/contextmenu/skeleton/index');

module.exports = function (ui) {
  const pfx = 'media-context-menu';

  ui.contextmenuItems = ['download', 'rename', 'organize', 'makeACopy', 'chat', 'remove'];

  return Skeletons.Box.Y({
    className: `${pfx}__dropdown`,
    sys_pn: 'context-menu',
    dataset: { state: '0' },
    kids: [contextmenu(ui)],
  });
};
