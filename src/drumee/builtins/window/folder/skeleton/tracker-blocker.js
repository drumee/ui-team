const COLUMNS = [
  { title: () => LOCALE.TASK_STATUS_TODO, status: "todo", tone: "todo" },
  { title: () => LOCALE.TASK_STATUS_IN_PROGRESS, status: "in_progress", tone: "progress" },
  { title: () => LOCALE.TASK_STATUS_TO_REVIEW, status: "to_review", tone: "review" },
  { title: () => LOCALE.TASK_STATUS_COMPLETE, status: "complete", tone: "complete" },
];

const STATUS_ALIASES = {
  todo: "todo",
  open: "todo",
  new: "todo",
  progress: "in_progress",
  in_progress: "in_progress",
  "in-progress": "in_progress",
  doing: "in_progress",
  review: "to_review",
  to_review: "to_review",
  "to-review": "to_review",
  complete: "complete",
  completed: "complete",
  done: "complete",
  closed: "complete",
};

function getTasks(ui) {
  const tasks = ui.mget("tasks") || ui.mget("task_items") || [];
  if (Array.isArray(tasks)) return tasks;
  if (tasks.toJSON) {
    const data = tasks.toJSON();
    return Array.isArray(data) ? data : [];
  }
  return [];
}

function normalizeTask(task) {
  if (typeof task === "string") return { title: task, status: "todo" };
  return task || {};
}

function normalizeStatus(task) {
  const status = task.status || task.state || task.column || "todo";
  const key = String(status).trim().toLowerCase().replace(/\s+/g, "_");
  return STATUS_ALIASES[key] || "todo";
}

function tasksByStatus(ui) {
  return getTasks(ui).reduce((acc, item) => {
    const task = normalizeTask(item);
    const status = normalizeStatus(task);
    acc[status] = acc[status] || [];
    acc[status].push(task);
    return acc;
  }, {});
}

function taskCard(ui, task) {
  const pfx = `${ui.fig.family}__tracker`;
  return Skeletons.Note({
    className: `${pfx}-card`,
    content: task.title || task.name || task.label || "",
  });
}

function addButton(ui) {
  const pfx = `${ui.fig.family}__tracker`;
  return Skeletons.Note({
    className: `${pfx}-add`,
    content: `+ ${LOCALE.ADD}`,
    state: 0,
  });
}

function taskColumn(ui, column, tasks) {
  const pfx = `${ui.fig.family}__tracker`;
  const items = tasks[column.status] || [];

  return Skeletons.Box.Y({
    className: `${pfx}-column`,
    dataset: { tone: column.tone },
    kids: [
      Skeletons.Box.Y({
        className: `${pfx}-column-content`,
        kids: [
          Skeletons.Box.X({
            className: `${pfx}-column-header`,
            kids: [
              Skeletons.Element({ className: `${pfx}-column-dot` }),
              Skeletons.Note({
                className: `${pfx}-column-title`,
                content: column.title(),
              }),
              Skeletons.Note({
                className: `${pfx}-column-count`,
                content: items.length,
              }),
            ],
          }),
          ...items.map((item) => taskCard(ui, item)),
        ],
      }),
      addButton(ui),
    ],
  });
}

module.exports = function trackerBlocker(ui) {
  const pfx = `${ui.fig.family}__tracker`;
  const tasks = tasksByStatus(ui);

  return Skeletons.Box.X({
    className: `${pfx}-board`,
    debug: __filename,
    kids: COLUMNS.map((column) => taskColumn(ui, column, tasks)),
  });
};
