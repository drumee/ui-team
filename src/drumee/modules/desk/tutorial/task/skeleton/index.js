const { folderHeader, tabBar } = require('../../skeleton/toolkit');

const COLUMNS = [
  {
    id: 'todo',
    label: 'To Do',
    color: '#b0b0b8',
    count: 1,
    faded: true,
    cards: [
      { title: 'Title Unit', tag: 'Research',  tagKey: 'research' },
      { title: 'Title Unit', tag: 'Analysis',  tagKey: 'analysis' },
      { title: 'Title Unit', tag: 'Cancel',    tagKey: 'cancel' },
      { title: 'Title Unit', tag: 'Dev',       tagKey: 'dev' },
    ],
  },
  {
    id: 'inprogress',
    label: 'In Progress',
    color: '#5ba4cf',
    count: 1,
    faded: true,
    cards: [
      { title: 'Title Unit', tag: 'Design',     tagKey: 'design' },
      { title: 'Title Unit', tag: 'Cancel',     tagKey: 'cancel' },
      { title: 'Title Unit', tag: 'Analysis',   tagKey: 'analysis' },
      { title: 'Title Unit', tag: 'In Progess', tagKey: 'inprogress' },
    ],
  },
  {
    id: 'review',
    label: 'To review',
    color: '#ec9488',
    count: 4,
    faded: false,
    cards: [
      { title: 'Design System',       tag: 'Design',    tagKey: 'design' },
      { title: 'Product Updated',     tag: 'Product',   tagKey: 'product' },
      { title: 'Q1 Research',         tag: 'Analysis',  tagKey: 'analysis' },
      { title: 'June Marketing Plan', tag: 'Marketing', tagKey: 'marketing' },
    ],
  },
  {
    id: 'complete',
    label: 'Complete',
    color: '#61bd4f',
    count: null,
    faded: false,
    cards: [
      { title: 'Bug fix',       tag: 'Dev',    tagKey: 'dev' },
      { title: 'Customer list', tag: 'Sale',   tagKey: 'sale' },
      { title: 'Rebranding',    tag: 'Design', tagKey: 'design' },
    ],
  },
];

function taskTabBar(ui, pfx) {
  return Skeletons.Box.X({
    className: `${pfx}__tabs`,
    kids: [
      Skeletons.Button.Label({ ico: 'apps-folder-card', className: `${pfx}__tab`,        label: LOCALE.FILES || 'Files' }),
      Skeletons.Button.Label({ ico: 'apps-chat',        className: `${pfx}__tab`,        label: LOCALE.CHAT  || 'Chat' }),
      Skeletons.Button.Label({ ico: 'checkbox',         className: `${pfx}__tab active`, label: LOCALE.TASKS || 'Tasks' }),
    ],
  });
}

function taskCard(pfx, { title, tag, tagKey }) {
  return Skeletons.Box.Y({
    className: `${pfx}__task-card`,
    kids: [
      Skeletons.Note({ className: `${pfx}__task-title`, content: title }),
      Skeletons.Note({ className: `${pfx}__task-tag`, content: tag, dataset: { tag: tagKey } }),
    ],
  });
}

function kanbanColumn(ui, pfx, col) {
  return Skeletons.Box.Y({
    className: `${pfx}__col${col.faded ? ' faded' : ''}`,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__col-header`,
        kids: [
          Skeletons.Box.X({
            className: `${pfx}__col-header-left`,
            kids: [
              Skeletons.Box.Y({ className: `${pfx}__col-dot`, styleOpt: { background: col.color } }),
              Skeletons.Note({ className: `${pfx}__col-title`, content: col.label }),
            ],
          }),
          col.count ? Skeletons.Note({ className: `${pfx}__col-count`, content: String(col.count) }) : null,
        ],
      }),
      Skeletons.Box.Y({
        className: `${pfx}__col-cards`,
        kids: col.cards.map((card) => taskCard(pfx, card)),
      }),
      Skeletons.Note({ className: `${pfx}__col-add`, content: '+ Add' }),
    ],
  });
}

function kanbanBoard(ui, pfx) {
  return Skeletons.Box.Y({
    className: `${pfx}__kanban-wrap`,
    sys_pn: 'kanban',
    partHandler: ui,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__kanban`,
        kids: COLUMNS.map((col) => kanbanColumn(ui, pfx, col)),
      }),
    ],
  });
}

module.exports = function (ui) {
  const pfx = ui.fig.family;
  return Skeletons.Box.Y({
    className: `${pfx}__main`,
    kids: [
      folderHeader(ui, pfx),
      taskTabBar(ui, pfx),
      kanbanBoard(ui, pfx),
    ],
  });
};
