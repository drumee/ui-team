/**
 * Step 3 — the meeting room.
 *
 * Figma: node 5:75093 ("DRUMEE: Tutorial (Meeting)"). The app behind the
 * callout is a flat bitmap in that file, so the layout is measured off the 1:1
 * render: room panel with a 66px top bar, a 2x2 tile stage (398x278 tiles,
 * 12px gutters, 12px radius) and a 415px chat rail. Colours sampled from the
 * same render — Leave #d74e49, camera/mic pills #ffe9e8, share pill #f2f2f2.
 *
 * This replaces the previous layout, which nested a meeting panel inside the
 * folder window chrome; the design is a full-bleed room.
 *
 * Visual only — no services. `meeting-tile` is the spotlight target.
 */

// ── Static data ───────────────────────────────────────────────────────────────
const PARTICIPANTS = [
  { name: 'Lucas Zoe', tone: 'sand' },
  { name: 'Brenda Lucy', tone: 'clay', focus: true },
  { name: 'Jullie', tone: 'rose' },
  { name: 'Maddy Ernest', tone: 'plum', muted: true, hand: true, controls: true },
];

const MESSAGES = [
  { sender: 'Sarah K.', text: 'Agreed. Feel free to leave comments directly in the file.', time: '11:53 AM' },
  {
    sender: 'Emma',
    text: "I noticed some screenshots in the onboarding section are outdated. They're showing the old workspace creation flow.",
    time: '11:53 AM',
  },
  { sender: 'Sarah K.', text: 'Good catch. Can you update them or share the latest assets?', time: '11:53 AM' },
];

const initialsOf = (name = '') =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

// ── Top bar ───────────────────────────────────────────────────────────────────
function iconButton(pfx, ico, extra = '') {
  return Skeletons.Box.Y({
    className: `${pfx}__tb-icon ${extra}`.trim(),
    kids: [Skeletons.Image.Svg({ ico, className: `${pfx}__tb-icon-svg` })],
  });
}

/** Camera / mic: state pill plus the device-picker caret, as in the design. */
function devicePill(pfx, ico, tone) {
  return Skeletons.Box.X({
    className: `${pfx}__tb-pill ${tone}`,
    kids: [
      Skeletons.Image.Svg({ ico, className: `${pfx}__tb-pill-icon` }),
      Skeletons.Image.Svg({ ico: 'meet-caret-down', className: `${pfx}__tb-pill-caret` }),
    ],
  });
}

function topbar(ui, pfx) {
  return Skeletons.Box.X({
    className: `${pfx}__topbar`,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__topbar-left`,
        kids: [
          Skeletons.Box.Y({
            className: `${pfx}__app-icon`,
            kids: [Skeletons.Image.Svg({ ico: 'meeting-video', className: `${pfx}__app-icon-svg` })],
          }),
          Skeletons.Note({ className: `${pfx}__room-title`, content: 'Product Meeting' }),
        ],
      }),
      Skeletons.Box.X({
        className: `${pfx}__topbar-right`,
        kids: [
          iconButton(pfx, 'meet-users'),
          iconButton(pfx, 'meet-expand'),
          Skeletons.Box.Y({ className: `${pfx}__tb-divider` }),
          devicePill(pfx, 'meet-camera', 'off'),
          devicePill(pfx, 'meet-mic-slash', 'off'),
          iconButton(pfx, 'meet-screen', 'boxed'),
          iconButton(pfx, 'meet-dots'),
          Skeletons.Box.X({
            className: `${pfx}__leave-btn`,
            kids: [
              Skeletons.Image.Svg({ ico: 'meeting-leave', className: `${pfx}__leave-icon` }),
              Skeletons.Note({
                className: `${pfx}__leave-label`,
                content: LOCALE.LEAVE_MEETING || 'Leave Meeting',
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

// ── Tile stage ────────────────────────────────────────────────────────────────
function nameChip(pfx, p) {
  return Skeletons.Box.X({
    className: `${pfx}__chip`,
    kids: [
      p.hand ? Skeletons.Note({ className: `${pfx}__chip-hand`, content: '✋' }) : null,
      Skeletons.Note({ className: `${pfx}__chip-name`, content: p.name }),
    ],
  });
}

function videoTile(ui, pfx, p) {
  return Skeletons.Box.Y({
    className: `${pfx}__tile`,
    dataset: { tone: p.tone },
    // The badge points at the top-right tile.
    ...(p.focus ? { sys_pn: 'meeting-tile', partHandler: ui } : {}),
    kids: [
      p.controls
        ? Skeletons.Box.X({
          className: `${pfx}__tile-controls`,
          kids: [
            iconButton(pfx, 'meet-pin', 'round'),
            iconButton(pfx, 'meet-dots', 'round'),
          ],
        })
        : null,
      Skeletons.Box.Y({
        className: `${pfx}__tile-avatar`,
        kids: [
          Skeletons.Note({ className: `${pfx}__tile-initials`, content: initialsOf(p.name) }),
        ],
      }),
      Skeletons.Box.X({
        className: `${pfx}__tile-footer`,
        kids: [
          nameChip(pfx, p),
          p.muted
            ? Skeletons.Box.Y({
              className: `${pfx}__chip muted`,
              kids: [Skeletons.Image.Svg({ ico: 'meet-mic-slash', className: `${pfx}__chip-mic` })],
            })
            : null,
        ],
      }),
    ],
  });
}

function stage(ui, pfx) {
  const rows = [PARTICIPANTS.slice(0, 2), PARTICIPANTS.slice(2, 4)];
  return Skeletons.Box.Y({
    className: `${pfx}__stage`,
    kids: rows.map((row) =>
      Skeletons.Box.X({
        className: `${pfx}__stage-row`,
        kids: row.map((p) => videoTile(ui, pfx, p)),
      }),
    ),
  });
}

// ── Chat rail ─────────────────────────────────────────────────────────────────
function chatMessage(pfx, msg) {
  return Skeletons.Box.X({
    className: `${pfx}__msg`,
    kids: [
      Skeletons.Box.Y({
        className: `${pfx}__msg-avatar`,
        kids: [
          Skeletons.Note({ className: `${pfx}__msg-initials`, content: initialsOf(msg.sender) }),
        ],
      }),
      Skeletons.Box.Y({
        className: `${pfx}__msg-body`,
        kids: [
          Skeletons.Note({ className: `${pfx}__msg-sender`, content: msg.sender }),
          Skeletons.Note({ className: `${pfx}__msg-bubble`, content: msg.text }),
          Skeletons.Note({ className: `${pfx}__msg-time`, content: msg.time }),
        ],
      }),
    ],
  });
}

/** The "you are already in this call" card that sits under the transcript. */
function quickSync(pfx) {
  return Skeletons.Box.Y({
    className: `${pfx}__qs`,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__qs-head`,
        kids: [
          Skeletons.Box.Y({
            className: `${pfx}__qs-icon`,
            kids: [Skeletons.Image.Svg({ ico: 'meeting-video', className: `${pfx}__qs-icon-svg` })],
          }),
          Skeletons.Note({ className: `${pfx}__qs-title`, content: LOCALE.QUICK_SYNC || 'Quick sync' }),
          Skeletons.Box.Y({ className: `${pfx}__qs-live` }),
        ],
      }),
      Skeletons.Note({
        className: `${pfx}__qs-sub`,
        content: 'Drumee Dev Team - Folder meeting',
      }),
      Skeletons.Box.X({
        className: `${pfx}__qs-foot`,
        kids: [
          Skeletons.Box.X({
            className: `${pfx}__qs-avatars`,
            kids: [
              ...['Sarah K.', 'Emma'].map((n) =>
                Skeletons.Box.Y({
                  className: `${pfx}__qs-avatar`,
                  kids: [Skeletons.Note({ className: `${pfx}__qs-avatar-initials`, content: initialsOf(n) })],
                }),
              ),
              Skeletons.Note({ className: `${pfx}__qs-more`, content: '+2' }),
            ],
          }),
          Skeletons.Note({ className: `${pfx}__qs-joined`, content: `4 ${LOCALE.JOINED || 'joined'}` }),
          Skeletons.Note({
            className: `${pfx}__qs-state`,
            content: LOCALE.YOU_ARE_IN_THIS_MEETING || 'You are in this meeting',
          }),
        ],
      }),
    ],
  });
}

function chatRail(ui, pfx) {
  return Skeletons.Box.Y({
    className: `${pfx}__chat`,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__chat-tabs`,
        kids: [
          Skeletons.Note({ className: `${pfx}__chat-tab active`, content: LOCALE.CHAT || 'Chat' }),
          Skeletons.Note({
            className: `${pfx}__chat-tab`,
            content: LOCALE.PARTICIPANTS || 'Participants',
          }),
          Skeletons.Image.Svg({ ico: 'cross', className: `${pfx}__chat-close` }),
        ],
      }),
      // Transcript scrolls under a pinned Quick sync card, as in the design —
      // where the topmost bubble is clipped by the panel edge.
      Skeletons.Box.Y({
        className: `${pfx}__chat-body`,
        kids: [
          Skeletons.Box.Y({
            className: `${pfx}__chat-msgs`,
            kids: MESSAGES.map((m) => chatMessage(pfx, m)),
          }),
          quickSync(pfx),
        ],
      }),
      Skeletons.Box.X({
        className: `${pfx}__chat-input`,
        kids: [
          Skeletons.Image.Svg({ ico: 'app-attachment', className: `${pfx}__chat-input-icon` }),
          Skeletons.Note({
            className: `${pfx}__chat-placeholder`,
            content: LOCALE.WRITE_A_MESSAGE || 'Type a message...',
          }),
          Skeletons.Image.Svg({ ico: 'meet-smiley', className: `${pfx}__chat-input-icon` }),
          Skeletons.Image.Svg({ ico: 'send', className: `${pfx}__chat-input-icon send` }),
        ],
      }),
    ],
  });
}

// ── Room ──────────────────────────────────────────────────────────────────────
module.exports = function (ui) {
  const pfx = ui.fig.family;
  return Skeletons.Box.Y({
    className: `${pfx}__room`,
    kids: [
      topbar(ui, pfx),
      Skeletons.Box.X({
        className: `${pfx}__body`,
        kids: [stage(ui, pfx), chatRail(ui, pfx)],
      }),
    ],
  });
};
