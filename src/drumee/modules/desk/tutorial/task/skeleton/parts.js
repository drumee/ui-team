/**
 * Bits the five tracker views share: status pills, priority pills, date chips,
 * attachment chips, avatar stacks.
 *
 * Measured off the 1:1 renders (Figma 5:75112 and siblings): pills 26px tall on
 * a 99px radius, chips 8px radius, avatars 26px overlapping by 8px.
 */

const { STATUSES } = require('./data');

const statusOf = (key) => STATUSES.find((s) => s.key === key) || STATUSES[0];

/** Coloured dot + label, e.g. "● In Progress". */
export function statusPill(pfx, key, opt = {}) {
  const s = statusOf(key);
  return Skeletons.Box.X({
    className: `${pfx}__pill status${opt.plain ? ' plain' : ''}`,
    dataset: { status: s.key },
    kids: [
      Skeletons.Box.Y({ className: `${pfx}__pill-dot` }),
      Skeletons.Note({ className: `${pfx}__pill-label`, content: s.label }),
    ],
  });
}

/** Priority pill, or the muted "Priority ⌄" placeholder when unset. */
export function priorityPill(pfx, key) {
  if (!key) {
    return Skeletons.Box.X({
      className: `${pfx}__pill priority unset`,
      kids: [
        Skeletons.Note({ className: `${pfx}__pill-label`, content: 'Priority' }),
        Skeletons.Image.Svg({ ico: 'carret-down', className: `${pfx}__pill-caret` }),
      ],
    });
  }
  const label = key.charAt(0).toUpperCase() + key.slice(1);
  return Skeletons.Box.X({
    className: `${pfx}__pill priority`,
    dataset: { priority: key },
    kids: [Skeletons.Note({ className: `${pfx}__pill-label`, content: label })],
  });
}

export function dateChip(pfx, date) {
  if (!date) {
    return Skeletons.Box.X({
      className: `${pfx}__chip date unset`,
      kids: [
        Skeletons.Note({ className: `${pfx}__chip-label`, content: 'Due date' }),
        Skeletons.Image.Svg({ ico: 'calendar', className: `${pfx}__chip-icon` }),
      ],
    });
  }
  return Skeletons.Box.X({
    className: `${pfx}__chip date`,
    kids: [Skeletons.Note({ className: `${pfx}__chip-label`, content: date })],
  });
}

export function fileChip(pfx, name) {
  return Skeletons.Box.X({
    className: `${pfx}__chip file`,
    kids: [
      Skeletons.Image.Svg({ ico: 'app-attachment', className: `${pfx}__chip-icon` }),
      Skeletons.Note({ className: `${pfx}__chip-label`, content: name }),
    ],
  });
}

/**
 * Overlapping avatars with a "+n" bubble, or the "Unassigned" placeholder.
 * No photography in the tour, so each is a tinted disc — the tones cycle so a
 * stack reads as different people.
 */
export function avatars(pfx, count, opt = {}) {
  if (!count) {
    if (!opt.unassigned) return null;
    return Skeletons.Box.X({
      className: `${pfx}__unassigned`,
      kids: [
        Skeletons.Image.Svg({ ico: 'account', className: `${pfx}__unassigned-icon` }),
        Skeletons.Note({ className: `${pfx}__unassigned-label`, content: 'Unassigned' }),
      ],
    });
  }
  const shown = Math.min(count, 3);
  const kids = [];
  for (let i = 0; i < shown; i++) {
    kids.push(Skeletons.Box.Y({ className: `${pfx}__avatar`, dataset: { tone: i % 3 } }));
  }
  if (count > shown) {
    kids.push(Skeletons.Note({ className: `${pfx}__avatar more`, content: `+${count - shown}` }));
  }
  return Skeletons.Box.X({ className: `${pfx}__avatars`, kids });
}

/** Small square icon button (bell-off on column headers, chevrons, …). */
export function iconBtn(pfx, ico, extra = '') {
  return Skeletons.Box.Y({
    className: `${pfx}__icon-btn ${extra}`.trim(),
    kids: [Skeletons.Image.Svg({ ico, className: `${pfx}__icon-btn-svg` })],
  });
}
