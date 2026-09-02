/**
 * The workspace empty-state hero — Figma 146:40534 (Task) and 148:44759 (Meet).
 *
 * 2.0 gives Task and Meet the same shape the Files pane and the org home have:
 * a headline, one paragraph and a primary CTA on the left. On the right is a
 * CAROUSEL, and that is the part this exists for — pressing Next slides the
 * track one card to the left rather than replacing the screen. Task runs five
 * cards under a row of dots; Meet runs two under a caption with arrows.
 *
 * That is a real change from 1.x, where the Task step walked five populated
 * tracker views and Meet drew a live call. The 2.0 frames replace both with
 * the state a new workspace is actually in.
 *
 * Shared scenery, so it is keyed on `ui.fig.group` and styled once in
 * skin/empty-state.scss.
 *
 * Visual only — no services, with one opt-in exception: `cta_service` turns
 * `es-cta` into a control (see the param note below). Otherwise `es-cta` is
 * just what the callout points at.
 */

// Card geometry, per variant, with a 32px gutter between cards. The track is
// translated by one pitch per screen.
//
//   view — 146:40658: five 425-wide cards, each a 391x381 plate over a 391x26
//          title. Task.
//   wide — 148:44759: one 760x515 plate, no card chrome and no title, because
//          the caption row under the track names it instead. Meet and Chat,
//          whose frames are landscape screenshots rather than square plates.
//
// These are the WIDE-tier numbers. The cards shrink on smaller screens, and a
// slide distance baked in here would desync from them — the track would stop
// half a card short, which reads as the carousel being broken rather than
// small. So the distance is a CSS custom property (`--es-pitch`, set per
// variant and per size tier in skin/empty-state.scss) and this only says HOW
// MANY pitches to travel. The values below are the property's fallback, so the
// two definitions cannot drift apart silently.
const PITCH = { view: 457, wide: 792 };
const CARD_PITCH = PITCH.view;

const pfx = (ui) => `${ui.fig.group}__es`;

/**
 * The headline, split on newlines.
 *
 * The design breaks these by hand — 146:40542 is literally
 * "One task.\nFive views.\nZero rework." — and the break is part of the
 * composition, not an accident of width. Rendering one Note per line keeps
 * that while leaving each translation free to break where its own words need
 * to; a hard <br> in the copy would not survive translation, and a fixed
 * column width breaks somewhere else under a different font.
 */
const titleLines = (text) => String(text || "").split("\n");

/**
 * One carousel card: the view's own artwork, and its caption.
 *
 * `src` is the frame exported straight out of Figma. These were CSS shape
 * abstractions first, and they were not close: the frames put a rendered
 * mini-app in each card — a tab bar over two board columns, a donut and a
 * bar chart for Project Health — and the chat one is literally a bitmap in
 * the design file (142:39142 "image 1"). At that level of detail, redrawing
 * is both a lot of work and permanently wrong.
 *
 * They are emitted as separate files by file-loader, not inlined, so a user
 * who never opens the tour never fetches them and only the cards on screen
 * load.
 */
const card = (p, item, variant) =>
  Skeletons.Box.Y({ active: 0,
    className: `${p}-card`,
    dataset: { card: variant },
    attrOpt: { "data-card": variant },
    kids: [
      Skeletons.Box.Y({ active: 0,
        className: `${p}-card-art`,
        dataset: { card: variant },
        attrOpt: { "data-card": variant },
        kids: [
          Skeletons.Element({ active: 0,
            tagName: "img",
            className: `${p}-card-img`,
            attribute: { src: item.src, alt: "" },
          }),
        ],
      }),
      item.title
        ? Skeletons.Note({ active: 0, className: `${p}-card-title`, content: item.title })
        : null,
    ].filter(Boolean),
  });

/**
 * @param {Object} ui
 * @param {Object} opt
 * @param {String} opt.title   headline; newlines become separate lines
 * @param {String} opt.desc
 * @param {String} opt.cta     the primary button's label
 * @param {String} [opt.cta_service] makes the CTA a control that raises this
 *   service at `ui` instead of inert scenery. Omit and it stays a drawing —
 *   which is what the tours that merely POINT at it want.
 * @param {Array}  [opt.items] carousel cards
 * @param {Number} [opt.index=0] which card the track is scrolled to
 * @param {Boolean} [opt.dots]   draw the dot row under the track (Task)
 * @param {Object} [opt.caption] `{ico, title, desc}` under the track (Meet),
 *   taken from the CURRENT item so it changes as the track slides
 * @param {String} [opt.hero='wide'] headline column width
 * @param {String} [opt.card='view'] card geometry: 'view' (square plate under
 *   a title) or 'wide' (a landscape screenshot, captioned outside the track)
 */
function emptyState(ui, opt = {}) {
  const p = pfx(ui);
  const { items = [], index = 0, dots = false, caption, hero = "wide", card: variant = "view" } = opt;
  const at = Math.max(0, Math.min(items.length - 1, ~~index));
  const pitch = PITCH[variant] || PITCH.view;
  const lines = titleLines(opt.title);

  return Skeletons.Box.X({ active: 0,
    className: `${p}-canvas`,
    kids: [
      Skeletons.Box.Y({ active: 0,
        className: `${p}-hero`,
        dataset: { hero },
        attrOpt: { "data-hero": hero },
        kids: [
          Skeletons.Box.Y({ active: 0,
            className: `${p}-title`,
            // A headline the design broke by hand must keep those breaks, so
            // its lines are held to one line each. One that was written as a
            // single sentence has to be free to wrap, or it runs off under the
            // carousel — which is what Meet and Chat do.
            dataset: { broken: lines.length > 1 ? 1 : 0 },
            attrOpt: { "data-broken": lines.length > 1 ? 1 : 0 },
            kids: lines.map((line) =>
              Skeletons.Note({ active: 0, className: `${p}-title-line`, content: line }),
            ),
          }),
          Skeletons.Note({ active: 0, className: `${p}-desc`, content: opt.desc }),
          // The CTA is scenery by default and a CONTROL when a caller names a
          // service. Task and Meet only point their callout at it, so it stays
          // inert there; the chat tour's first screen carries no callout at all
          // and this button is its only way forward.
          //
          // `active: 0` and a service are mutually exclusive, not merely
          // different: ui-core binds an onclick to a widget only while it is
          // not inert, so the two cannot both be set — hence the branch rather
          // than an extra flag. The label inside stays inert either way, so the
          // click lands on this box and not on the text. Same shape as
          // `home-cta` in ./home.js, which is the workspace tour's equivalent.
          Skeletons.Box.X({
            ...(opt.cta_service
              ? {
                  service: opt.cta_service,
                  uiHandler: [ui],
                  // So the skin can say it is a control — pointer cursor and a
                  // hover, the way `home-cta` does. Stamped from the same flag
                  // that makes it clickable rather than keyed on the tour, so
                  // the two cannot disagree and it still reads as a button when
                  // these screens run inside `full` (where `data-tour` is
                  // "full", not "chat"). dataset alone is dropped at render
                  // unless an attribute map rides along.
                  dataset: { live: 1 },
                  attrOpt: { "data-live": 1 },
                }
              : { active: 0 }),
            className: `${p}-cta`,
            sys_pn: "es-cta",
            partHandler: ui,
            kids: [
              Skeletons.Note({ active: 0, className: `${p}-cta-label`, content: opt.cta }),
            ],
          }),
        ],
      }),

      Skeletons.Box.Y({ active: 0,
        className: `${p}-right`,
        kids: [
          // The viewport clips; the track inside it slides. Sliding rather than
          // swapping is the whole behaviour the frames describe.
          Skeletons.Box.Y({ active: 0,
            className: `${p}-viewport`,
            sys_pn: "es-viewport",
            partHandler: ui,
            kids: [
              Skeletons.Box.X({ active: 0,
                className: `${p}-track`,
                dataset: { card: variant },
                attrOpt: { "data-card": variant },
                // One pitch per screen, in the units CSS is currently using.
                style: { transform: `translateX(calc(var(--es-pitch, ${pitch}px) * -${at}))` },
                kids: items.map((it) => card(p, it, variant)),
              }),
            ],
          }),

          caption
            ? Skeletons.Box.X({ active: 0,
                className: `${p}-caption`,
                kids: [
                  Skeletons.Box.Y({ active: 0,
                    className: `${p}-caption-ico`,
                    kids: [
                      Skeletons.Image.Svg({ active: 0, ico: caption.ico, className: `${p}-caption-glyph` }),
                    ],
                  }),
                  Skeletons.Box.Y({ active: 0,
                    className: `${p}-caption-text`,
                    kids: [
                      Skeletons.Note({ active: 0, className: `${p}-caption-title`, content: caption.title }),
                      Skeletons.Note({ active: 0, className: `${p}-caption-desc`, content: caption.desc }),
                    ],
                  }),
                  Skeletons.Box.X({ active: 0,
                    className: `${p}-arrows`,
                    kids: ["arrow-left", "arrow-right"].map((ico) =>
                      Skeletons.Box.Y({ active: 0,
                        className: `${p}-arrow`,
                        kids: [Skeletons.Image.Svg({ active: 0, ico, className: `${p}-arrow-glyph` })],
                      }),
                    ),
                  }),
                ],
              })
            : null,

          dots
            ? Skeletons.Box.X({ active: 0,
                className: `${p}-dots`,
                kids: items.map((_it, i) =>
                  Skeletons.Box.Y({ active: 0,
                    className: `${p}-dot`,
                    dataset: { on: i === at ? 1 : 0 },
                    attrOpt: { "data-on": i === at ? 1 : 0 },
                  }),
                ),
              })
            : null,
        ].filter(Boolean),
      }),
    ],
  });
}

module.exports = { emptyState, CARD_PITCH, PITCH };
