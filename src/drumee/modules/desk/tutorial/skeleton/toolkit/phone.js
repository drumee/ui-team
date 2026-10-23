/**
 * The phone mock — the Drumee Mobile frames (Figma WtPX8Cj8PO9sjD6TRLeOQL,
 * section 380:53148). Every step's phone screens are assembled from these so
 * the chrome is ONE drawing rather than six.
 *
 * Inert scenery by default (active: 0). The only control drawn here that does
 * anything is the hero CTA; a step that wants another live control wires it
 * itself, exactly as the desktop mocks do.
 *
 * The parts a callout can point at carry a `ph-*` sys_pn, and those names are
 * the contract with the steps' SCREENS tables:
 *   ph-body ph-title ph-more ph-avatar ph-tab-<key> ph-fab
 *   ph-composer-plus ph-composer ph-sheet ph-cta ph-deck ph-dots
 */
const P = 'tutorial-phone';

const url = (m) => (m && m.default ? m.default : m);
// The composer's glyphs (212:31308) — Phosphor shapes the sprite lacks.
const COMPOSER = {
  plus: require('assets/tutorial/chat-phone/plus.svg'),
  smiley: require('assets/tutorial/chat-phone/smiley.svg'),
  send: require('assets/tutorial/chat-phone/send.svg'),
};

// The workspace tab pill of the Figma nav (206:5444): Phosphor Files,
// ChatCircleDots, ListChecks, VideoCamera — none of them in the sprite, so the
// frames' own SVGs.
const TABS = [
  { key: 'files', src: require('assets/tutorial/mg-phone/files.svg'), label: () => LOCALE.FILES },
  { key: 'chat', src: require('assets/tutorial/mg-phone/chat.svg'), label: () => LOCALE.CHAT },
  { key: 'task', src: require('assets/tutorial/mg-phone/task.svg'), label: () => LOCALE.TASK },
  { key: 'meet', src: require('assets/tutorial/mg-phone/meet.svg'), label: () => LOCALE.MEET },
  // The real bar's fifth tab; its glyph is the desktop rail's sprite one.
  { key: 'access', ico: 'rail-access', label: () => LOCALE.ACCESS },
];

function circle(ico, pn) {
  return Skeletons.Box.X({
    active: 0,
    className: `${P}__circle`,
    sys_pn: pn,
    kids: [Skeletons.Image.Svg({ active: 0, ico, className: `${P}__circle-ico` })],
  });
}

/** The signed-in user's avatar — the same widget the real mobile topbar uses. */
function avatar() {
  const v = typeof Visitor !== 'undefined' ? Visitor : {};
  return Skeletons.Box.X({
    active: 0,
    className: `${P}__avatar`,
    sys_pn: 'ph-avatar',
    kids: [Skeletons.UserProfile({
      className: `${P}__avatar-img`,
      id: v.id,
      firstname: v.firstname ? v.firstname() : '',
      lastname: v.lastname ? v.lastname() : '',
      auto_color: 1,
      oneLetter: 1,
      live_status: 0,
      active: 0,
    })],
  });
}

/**
 * The top bar — the app's own phone bar (desk-module__mobile-topbar,
 * modules/desk/skeleton/index.js _build_mobile_topbar): the workspace pill
 * (folder, name, caret), the go-to grid chip and the avatar. Drawn with the
 * real bar's classes' values (skin/phone.scss `__top`), so the tours show the
 * bar the user will meet.
 *
 * @param {Object} ui
 * @param {{title?: String, art?: String}} opt `art`: the workspace's own folder
 *   markup (media/grid/template/folder), as the real pill draws it. `lead`,
 *   `ico` and `actions` are accepted and ignored — the real bar has one shape.
 */
function topBar(ui, { title = '', art = null } = {}) {
  return Skeletons.Box.X({
    active: 0,
    className: `${P}__top ${P}__top--app`,
    kids: [
      Skeletons.Box.X({
        active: 0,
        className: `${P}__ws`,
        sys_pn: 'ph-title',
        kids: [
          art ? Skeletons.Element({ active: 0, className: `${P}__ws-ico`, content: art }) : null,
          Skeletons.Note({ active: 0, className: `${P}__ws-name`, content: title }),
          Skeletons.Image.Svg({ active: 0, ico: 'ph-caret-down', className: `${P}__ws-caret` }),
        ].filter(Boolean),
      }),
      Skeletons.Box.X({
        active: 0,
        className: `${P}__top-actions`,
        kids: [
          Skeletons.Box.X({
            active: 0,
            className: `${P}__top-chip`,
            sys_pn: 'ph-more',
            kids: [Skeletons.Image.Svg({ active: 0, ico: 'dots-nine', className: `${P}__top-chip-ico` })],
          }),
          avatar(),
        ],
      }),
    ],
  });
}

/**
 * A page's own top bar (Figma "top-navigation-more", the share flow): the
 * back circle on the left and the page title centred on the whole width.
 * @param {Object} ui
 * @param {{title?: String}} opt
 */
function titleBar(ui, { title = '' } = {}) {
  return Skeletons.Box.X({
    active: 0,
    className: `${P}__top ${P}__top--page`,
    kids: [
      Skeletons.Note({ active: 0, className: `${P}__page-title`, content: title }),
      circle('arrow-left', 'ph-back'),
    ],
  });
}

/**
 * The bottom row — the app's own phone bar (desk-module__mrail-pill): one
 * white pill of Files, Chat, Task, Meet and Access, the open one tinted.
 * @param {Object} ui
 * @param {'files'|'chat'|'task'|'meet'|'access'|null} active `null` (no
 *   workspace yet) lights Files, the real bar's default.
 */
function tabBar(ui, active) {
  const on = active || 'files';
  return Skeletons.Box.X({
    active: 0,
    className: `${P}__bottom`,
    kids: [Skeletons.Box.X({
      active: 0,
      className: `${P}__tabs`,
      kids: TABS.map((t) => Skeletons.Box.Y({
        active: 0,
        className: `${P}__tab`,
        sys_pn: `ph-tab-${t.key}`,
        dataset: { active: t.key === on ? '1' : '0' },
        kids: [
          t.src
            ? Skeletons.Element({
              active: 0, tagName: 'img', className: `${P}__tab-ico`, attribute: { src: url(t.src), alt: '' },
            })
            : Skeletons.Image.Svg({ active: 0, ico: t.ico, className: `${P}__tab-ico` }),
          Skeletons.Note({ active: 0, className: `${P}__tab-label`, content: t.label() }),
        ],
      })),
    })],
  });
}

/**
 * The floating + above the bottom row's right end. Inert unless a step gives
 * it a service (the migrate tour's + opens its menu, Figma 385:55247).
 * @param {Object} ui
 * @param {{service?: String, menu?: String}} [opt] `menu` is read back by the
 *   step from data-menu, as the desk's + New buttons are
 */
function fab(ui, { service = null, menu = null } = {}) {
  return Skeletons.Box.X({
    ...(service ? { service, uiHandler: [ui] } : { active: 0 }),
    className: `${P}__fab`,
    sys_pn: 'ph-fab',
    ...(menu ? { dataset: { menu }, attrOpt: { 'data-menu': menu } } : {}),
    kids: [Skeletons.Image.Svg({ active: 0, ico: 'ph-plus', className: `${P}__fab-ico` })],
  });
}

/**
 * The chat composer row (Figma component 212:31308): the + and the message
 * field with its emoji and send glyphs. `ph-composer-row` is the whole row,
 * which is what the chat flow's last frame lights (386:57195).
 */
function composer() {
  const icon = (cls, src) => Skeletons.Element({
    active: 0, tagName: 'img', className: `${P}__${cls}`, attribute: { src: url(src), alt: '' },
  });
  return Skeletons.Box.X({
    active: 0,
    className: `${P}__composer-row`,
    sys_pn: 'ph-composer-row',
    kids: [
      Skeletons.Box.X({
        active: 0,
        className: `${P}__circle ${P}__composer-plus`,
        sys_pn: 'ph-composer-plus',
        kids: [icon('composer-plus-ico', COMPOSER.plus)],
      }),
      Skeletons.Box.X({
        active: 0,
        className: `${P}__composer`,
        sys_pn: 'ph-composer',
        kids: [
          Skeletons.Note({ active: 0, className: `${P}__composer-ph`, content: LOCALE.MESSAGE_TO }),
          icon('composer-smiley', COMPOSER.smiley),
          icon('composer-send', COMPOSER.send),
        ],
      }),
    ],
  });
}

/**
 * A bottom sheet.
 * @param {Object} ui
 * @param {{title?: String, kids?: Array, sys_pn?: String, className?: String}} opt
 */
function sheet(ui, { title = null, kids = [], sys_pn = 'ph-sheet', className = '' } = {}) {
  return Skeletons.Box.Y({
    active: 0,
    className: `${P}__sheet ${className}`.trim(),
    sys_pn,
    kids: [
      title ? Skeletons.Note({ active: 0, className: `${P}__sheet-title`, content: title }) : null,
      ...kids,
    ].filter(Boolean),
  });
}

/**
 * A horizontal swipe row (native scroll-snap) and its pill dots. No timer and
 * no arrows on a phone (Figma 386:57322, 386:58198): the user swipes.
 * @param {Object} ui
 * @param {{cards: Array, index?: Number, dots?: Boolean}} opt
 */
function swipeDeck(ui, { cards = [], index = 0, dots = true } = {}) {
  const i = Math.max(0, Math.min(cards.length - 1, ~~index));
  return Skeletons.Box.Y({
    active: 0,
    className: `${P}__deck-wrap`,
    kids: [
      Skeletons.Box.X({
        active: 0,
        className: `${P}__deck`,
        sys_pn: 'ph-deck',
        kids: cards.map((c) => Skeletons.Box.Y({ active: 0, className: `${P}__card`, kids: [c] })),
      }),
      dots ? Skeletons.Box.X({
        active: 0,
        className: `${P}__dots`,
        sys_pn: 'ph-dots',
        kids: cards.map((_c, n) => Skeletons.Element({
          active: 0,
          className: `${P}__dot`,
          dataset: { active: n === i ? '1' : '0' },
        })),
      }) : null,
    ].filter(Boolean),
  });
}

/**
 * The empty-state hero: headline, subline, the CTA, then an optional deck.
 * @param {Object} ui the step — the CTA's service is routed to it
 */
function hero(ui, { title, desc, cta, cta_service, cta_ico = null, deck = null }) {
  // `cta_ico`: a glyph before the label (the task frame's +, 386:58055).
  const button = cta_ico
    ? Skeletons.Box.X({
      className: `${P}__hero-cta ${P}__hero-cta--ico`,
      service: cta_service,
      uiHandler: [ui],
      sys_pn: 'ph-cta',
      kids: [
        Skeletons.Box.X({
          active: 0,
          className: `${P}__hero-cta-ico`,
          kids: [Skeletons.Element({ active: 0, tagName: 'img', attribute: { src: cta_ico, alt: '' } })],
        }),
        Skeletons.Note({ active: 0, className: `${P}__hero-cta-label`, content: cta }),
      ],
    })
    : Skeletons.Note({
      className: `${P}__hero-cta`,
      content: cta,
      service: cta_service,
      uiHandler: [ui],
      sys_pn: 'ph-cta',
    });
  return Skeletons.Box.Y({
    active: 0,
    className: `${P}__hero`,
    kids: [
      Skeletons.Note({ active: 0, className: `${P}__hero-title`, content: title }),
      Skeletons.Note({ active: 0, className: `${P}__hero-desc`, content: desc }),
      button,
      deck,
    ].filter(Boolean),
  });
}

/**
 * The whole phone screen: status pad, top bar, scrolling body, bottom row,
 * then the absolutely placed FAB and overlay (a sheet, a popover).
 */
function screen(ui, {
  top = null, body = [], bottom = null, fab: f = null, overlay = null, dim = false, view = null,
} = {}) {
  return Skeletons.Box.Y({
    active: 0,
    className: `${P} ${ui.fig.family}__phone`,
    // `dim`: the Figma tour frames lay a 20% black overlay over the whole
    // screen and fade the top bar to 40%, then draw the sheet or modal above.
    // Stamped as data-overlay, NEVER data-dim: `.tutorial [data-dim="1"]` is
    // the 35%-opacity rule for held-back rows (skin/tooltip.scss), and on this
    // root it faded the whole screen — highlighted block included.
    dataset: { overlay: dim ? '1' : '0', ...(view ? { view } : {}) },
    attrOpt: { 'data-overlay': dim ? '1' : '0', ...(view ? { 'data-view': view } : {}) },
    kids: [
      Skeletons.Element({ active: 0, className: `${P}__status` }),
      top,
      Skeletons.Box.Y({ active: 0, className: `${P}__body`, sys_pn: 'ph-body', kids: body }),
      // The FAB rides on the bottom row (Figma: top -54 / right 16 of the
      // navigation), so it moves with it whatever the safe area does.
      bottom || f ? Skeletons.Box.Y({
        active: 0,
        className: `${P}__nav`,
        kids: [bottom, f].filter(Boolean),
      }) : null,
      dim ? Skeletons.Element({ active: 0, className: `${P}__overlay` }) : null,
      overlay,
    ].filter(Boolean),
  });
}

/**
 * Keep a swipeDeck's dots on the card the user swiped to.
 *
 * The deck scrolls natively (scroll-snap), so the dots are the one thing that
 * has to be told — on every scroll, from scrollLeft over one card's width.
 *
 * @param {Element} deck  the ph-deck element
 * @param {Element} dots  the ph-dots element
 * @param {Function} [onIndex] told the card index whenever it changes
 * @returns {Function} removes the listener
 */
function syncDeck(deck, dots, onIndex) {
  if (!deck || !dots || typeof deck.addEventListener !== 'function') return () => {};
  let at = -1;
  const onScroll = () => {
    const w = deck.clientWidth || 1;
    const n = dots.children ? dots.children.length : 0;
    const i = Math.max(0, Math.min(n - 1, Math.round(deck.scrollLeft / w)));
    if (i === at) return;
    at = i;
    for (let k = 0; k < n; k++) dots.children[k].dataset.active = k === i ? '1' : '0';
    if (onIndex) onIndex(i);
  };
  deck.addEventListener('scroll', onScroll, { passive: true });
  return () => deck.removeEventListener('scroll', onScroll);
}

/**
 * Move a swipeDeck one card on every `ms`, wrapping after the last.
 *
 * A smooth native scroll, so syncDeck moves the dots (and the step's card
 * index) exactly as it would for a swipe. A finger on the deck pauses it; it
 * carries on from wherever the user let go.
 *
 * @param {Element} deck the ph-deck element
 * @param {Function} current returns the card on show (the step's syncDeck index)
 * @param {Number} ms the interval
 * @returns {Function} stops the timer and drops the listeners
 */
function autoSlide(deck, current, ms) {
  if (!deck || typeof deck.scrollTo !== 'function') return () => {};
  let timer = null;
  const stop = () => { clearTimeout(timer); timer = null; };
  const go = () => {
    stop();
    timer = setTimeout(() => {
      const cards = deck.children;
      if (!cards || cards.length < 2) return;
      const at = ~~current();
      const next = at >= cards.length - 1 ? 0 : at + 1;
      deck.scrollTo({ left: cards[next].offsetLeft - cards[0].offsetLeft, behavior: 'smooth' });
      go();
    }, ms);
  };
  deck.addEventListener('pointerdown', stop, { passive: true });
  deck.addEventListener('pointerup', go, { passive: true });
  deck.addEventListener('pointercancel', go, { passive: true });
  go();
  return () => {
    stop();
    deck.removeEventListener('pointerdown', stop);
    deck.removeEventListener('pointerup', go);
    deck.removeEventListener('pointercancel', go);
  };
}

module.exports = { P, topBar, titleBar, tabBar, fab, composer, sheet, swipeDeck, hero, screen, syncDeck, autoSlide };
