/**
 * THE CALL, AS THE MEET CAROUSEL'S FIRST CARD SHOWS IT — Figma 148:44759.
 *
 * This was assets/tutorial/meet-instant.jpg: the whole frame, chrome and all,
 * as one photograph. The chrome is composed here — the plate and the window
 * are the workspace preview's (../../skeleton/toolkit/app-preview), and the
 * call is a header bar over a 2x2 grid — and the four VIDEO TILES stay
 * photographs, because that is what a video tile is. Each carries its own name
 * bar and mute/kebab pills, baked in by whoever cropped it.
 *
 * So the theme now reaches everything around the call, the rail lights Meet
 * from the same source every other card uses, and what is left as bitmap is
 * the part that could never be anything else.
 *
 * Scenery: no service, no sys_pn. The carousel owns every control on that
 * screen.
 */

const { appPreview } = require('../../skeleton/toolkit/app-preview');

const pfx = (ui) => `${ui.fig.group}__mv`;

// The four participants, in the frame's reading order. The crops are the
// design's own, and their name bars are part of the image — which is why there
// are no name nodes below.
const TILES = [
  require('assets/tutorial/meeting-user1.png'),
  require('assets/tutorial/meeting-user2.png'),
  require('assets/tutorial/meeting-user3.png'),
  require('assets/tutorial/meeting-user4.png'),
];

// The header's right-hand cluster, in the frame's order: raise hand, react,
// chat, participants — then the End pill. Every name here is a symbol the
// sprite actually carries (icons/sprites/normalized.sprite.svg): the meet
// family is `meet-*`, and a plausible-looking name that is not in the sprite
// renders as nothing at all, which is the quietest way to lose an icon.
const TOOLS = ['meet-hand', 'meet-smiley', 'meet-chat-dots', 'meet-users'];

function head(ui) {
  const p = pfx(ui);
  return Skeletons.Box.X({ active: 0,
    className: `${p}-head`,
    kids: [
      Skeletons.Box.Y({ active: 0,
        className: `${p}-head-tile`,
        kids: [Skeletons.Image.Svg({ active: 0, ico: 'rail-meet', className: `${p}-head-ico` })],
      }),
      Skeletons.Note({ active: 0, className: `${p}-head-title`, content: 'Quick sync' }),
      Skeletons.Box.X({ active: 0,
        className: `${p}-tools`,
        kids: [
          ...TOOLS.map((ico) =>
            Skeletons.Image.Svg({ active: 0, ico, className: `${p}-tool` }),
          ),
          // The one coloured control on the bar, and the frame cuts it off at
          // the card's edge — which is why the window keeps its full width.
          Skeletons.Box.X({ active: 0,
            className: `${p}-end`,
            kids: [
              Skeletons.Image.Svg({ active: 0, ico: 'meet-leave', className: `${p}-end-ico` }),
              // The product's own word for it (builtins/window/meeting
              // end-confirm.js uses the same key). There is no `END` key, and
              // a missing one renders as its own name on screen.
              Skeletons.Note({ active: 0,
                className: `${p}-end-label`,
                content: LOCALE.END_MEETING,
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

/** One participant: their video, and nothing else — the rest is in the crop. */
function tile(ui, src) {
  const p = pfx(ui);
  return Skeletons.Box.Y({ active: 0,
    className: `${p}-tile`,
    kids: [
      Skeletons.Element({ active: 0,
        tagName: 'img',
        className: `${p}-video`,
        // `.default` because these come through webpack's asset loader, the
        // same way the carousel's remaining frames do.
        attribute: { src: src && src.default ? src.default : src, alt: '' },
      }),
    ],
  });
}

/**
 * @param {Object} ui
 * @returns {Object} the plate, with the call on it
 */
function callCard(ui) {
  const p = pfx(ui);
  return appPreview(ui, {
    active: 'meet',
    fit: 'card',
    body: Skeletons.Box.Y({ active: 0,
      className: `${p}-pane`,
      kids: [
        head(ui),
        Skeletons.Box.X({ active: 0,
          className: `${p}-grid`,
          kids: TILES.map((src) => tile(ui, src)),
        }),
      ],
    }),
  });
}

module.exports = { callCard, TILES, TOOLS };
