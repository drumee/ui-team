/**
 * The workspace step on a phone — Figma flow "org home -> create wp":
 *
 *   home      380:54433  the org home hero
 *   sheet     380:54800  name · 385:938 internal · 385:1090 external ·
 *             385:1226  choose & create — ONE "Create new workspace" sheet,
 *                       with `lit` saying which block the screen is about
 *   invite    385:1364  the invite sheet · 385:54554 the personal modal
 *
 * Drawn to the frames rather than borrowed from the desktop dialog, whose
 * blocks, insets and type list (no Personal row) are a different design. What
 * IS kept is every part name the step's live logic reads — wsd-name-input,
 * wsd-create, wsd-type-*, inv-email, inv-error, inv-send / inv-skip — so the
 * same _create and _invite drive both layouts.
 *
 * The frames do not dim with a scrim and a lifted target: they lay a 20% black
 * overlay over the screen, tint the sheet, and fade every block the screen is
 * NOT about (0.2, or 0.4 for the name once it is behind you). That is drawn
 * here — `data-lit` on the sheet, opacities in skin/index.scss — and the step
 * asks the spotlight for no dim at all, only for the callout.
 */
const ph = require('../../skeleton/toolkit/phone');
const { BLOCKS } = require('../../skeleton/toolkit/workspace-dialog');

const W = 'tutorial-wsp';
const url = (m) => (m && m.default ? m.default : m);
const ASSET = {
  mockup: require('assets/tutorial/ws-phone/mockup-screen.png'),
  radioOn: require('assets/tutorial/ws-phone/radio-on.svg'),
  radioOff: require('assets/tutorial/ws-phone/radio-off.svg'),
  internal: require('assets/tutorial/ws-phone/folder-internal.png'),
  external: require('assets/tutorial/ws-phone/folder-external.png'),
  personal: require('assets/tutorial/ws-phone/folder-personal.png'),
};

// The rows of 385:1226, in order. Personal is left out on the phone: the
// tour creates shared workspaces, and the frames' Personal row led only to
// the "you can't invite" dead end.
const TYPES = [
  { key: 'internal', title: () => LOCALE.INTERNAL, desc: () => LOCALE.WS_TYPE_PHONE_INTERNAL_DESC },
  { key: 'external', title: () => LOCALE.EXTERNAL, desc: () => LOCALE.WS_TYPE_PHONE_EXTERNAL_DESC },
];

const img = (src, className) => Skeletons.Element({
  active: 0, tagName: 'img', className, attribute: { src: url(src), alt: '' },
});
const note = (className, content, extra = {}) =>
  Skeletons.Note({ active: 0, className: `${W}__${className}`, content, ...extra });

function orgName() {
  try {
    return (typeof Organization !== 'undefined' && Organization.name && Organization.name()) || '';
  } catch (e) {
    return '';
  }
}

/** The screen behind everything: org top bar, Search pill, FAB. */
function frame(ui, { body = [], overlay = null, dim = false, view } = {}) {
  return ph.screen(ui, {
    view,
    dim,
    top: ph.topBar(ui, { lead: 'avatar', title: orgName(), actions: false }),
    body,
    bottom: ph.tabBar(ui, null),
    overlay,
  });
}

/** 380:54433 — the hero, and the phone mockup in its gradient card. */
function home(ui) {
  return frame(ui, {
    view: 'home',
    body: [ph.hero(ui, {
      title: LOCALE.HOME_HERO_TITLE,
      desc: LOCALE.HOME_HERO_DESC,
      cta: LOCALE.CREATE_FIRST_WORKSPACE,
      cta_service: 'next-step',
      deck: Skeletons.Box.Y({
        active: 0,
        className: `${W}__card`,
        kids: [img(ASSET.mockup, `${W}__mockup`)],
      }),
    })],
  });
}

// ── the "Create new workspace" sheet ─────────────────────────────────────────

function org() {
  return Skeletons.Box.Y({
    active: 0,
    className: `${W}__block ${W}__org`,
    sys_pn: 'wsp-org',
    kids: [
      note('org-name', orgName()),
      Skeletons.Box.X({
        active: 0,
        className: `${W}__org-meta`,
        kids: [
          Skeletons.Box.X({
            active: 0,
            className: `${W}__org-stat`,
            kids: [note('org-count', '0'), note('org-label', LOCALE.DEPARTMENTS)],
          }),
          Skeletons.Box.X({
            active: 0,
            className: `${W}__org-stat`,
            kids: [
              note('org-count', '0'),
              Skeletons.Image.Svg({ active: 0, ico: 'ph-users', className: `${W}__org-ico` }),
            ],
          }),
        ],
      }),
    ],
  });
}

function dept() {
  return Skeletons.Box.X({
    active: 0,
    className: `${W}__block ${W}__dept`,
    sys_pn: 'wsp-dept',
    kids: [
      note('label', LOCALE.TUTORIAL_WS_IN_DEPARTMENT),
      Skeletons.Box.X({
        active: 0,
        className: `${W}__toggle`,
        kids: [Skeletons.Element({ active: 0, className: `${W}__toggle-knob` })],
      }),
    ],
  });
}

/**
 * The name field. Live on the name screen and on the real create step; its
 * error slot (wsd-name-error) is where a refusal from Create is SAID — without
 * it _setNameError fell back to Wm.alert, which draws under this full-screen
 * tour, and a refused create looked like a dead button.
 */
function nameBlock(ui, { live, name }) {
  const field = live
    ? Skeletons.Entry({
      className: `${W}__input ${W}__input--live`,
      sys_pn: 'wsd-name-input',
      partHandler: ui,
      formItem: _a.filename,
      placeholder: LOCALE.TYPE_THE_NAME,
      value: name || '',
      bubble: 0,
    })
    : Skeletons.Box.X({
      active: 0,
      className: `${W}__input`,
      kids: [note(name ? 'value' : 'placeholder', name || LOCALE.TYPE_THE_NAME)],
    });
  return Skeletons.Box.Y({
    active: 0,
    className: `${W}__block ${W}__name`,
    sys_pn: BLOCKS.NAME,
    partHandler: ui,
    kids: [
      note('label', LOCALE.WORKSPACE_NAME),
      field,
      live ? note('error', '', { sys_pn: 'wsd-name-error', partHandler: ui }) : null,
    ].filter(Boolean),
  });
}

function typeRow(ui, type, { selected, live }) {
  const on = selected === type.key;
  const data = { key: type.key, on: on ? '1' : '0', ...(live ? { type: type.key } : {}) };
  return Skeletons.Box.X({
    ...(live ? { service: 'wsd-select-type', uiHandler: [ui] } : { active: 0 }),
    className: `${W}__row`,
    sys_pn: BLOCKS.type(type.key),
    partHandler: ui,
    dataset: data,
    attrOpt: Object.keys(data).reduce((o, k) => ({ ...o, [`data-${k}`]: data[k] }), {}),
    kids: [
      Skeletons.Box.X({
        active: 0,
        className: `${W}__row-main`,
        kids: [
          img(ASSET[type.key], `${W}__row-ico`),
          Skeletons.Box.Y({
            active: 0,
            className: `${W}__row-text`,
            kids: [note('row-title', type.title()), note('row-desc', type.desc())],
          }),
        ],
      }),
      img(on ? ASSET.radioOn : ASSET.radioOff, `${W}__radio`),
    ],
  });
}

function sheet(ui, { lit, live, selected = 'internal', name, pending }) {
  // The REAL create step is a plain form: no block is held back, so no
  // data-lit (which drives the tint and the fading in the skin).
  const plain = live && lit === 'create';
  return Skeletons.Box.Y({
    active: 0,
    className: `${W}__sheet`,
    sys_pn: 'wsd-dialog',
    partHandler: ui,
    ...(plain ? {} : { dataset: { lit }, attrOpt: { 'data-lit': lit } }),
    kids: [
      Skeletons.Box.X({
        active: 0,
        className: `${W}__block ${W}__head`,
        sys_pn: 'wsp-head',
        kids: [note('heading', LOCALE.CREATE_NEW_WORKSPACE)],
      }),
      org(),
      // The real create step is the form itself: no department option, and
      // the name is a field the user can still type into (prefilled with
      // what the name screen took) — Create reads it.
      plain ? null : dept(),
      nameBlock(ui, { live: live && (lit === 'name' || lit === 'create'), name }),
      Skeletons.Box.Y({
        active: 0,
        className: `${W}__block ${W}__type`,
        sys_pn: BLOCKS.TYPE,
        partHandler: ui,
        kids: [
          note('label', LOCALE.WORKSPACE_TYPE),
          ...TYPES.map((t) => typeRow(ui, t, { selected, live: live && lit === 'create' })),
        ],
      }),
      Skeletons.Note({
        ...(live && lit === 'create' ? { service: 'wsd-create', uiHandler: [ui] } : { active: 0 }),
        className: `${W}__block ${W}__create`,
        sys_pn: BLOCKS.CREATE,
        partHandler: ui,
        content: LOCALE.CREATE,
        dataset: { pending: pending ? 1 : 0 },
        attrOpt: { 'data-pending': pending ? 1 : 0 },
      }),
    ].filter(Boolean),
  });
}

// ── after Create ─────────────────────────────────────────────────────────────

/** 385:1364 — the invite sheet. */
function inviteSheet(ui) {
  return Skeletons.Box.Y({
    active: 0,
    className: `${W}__invite`,
    sys_pn: 'inv-card',
    partHandler: ui,
    kids: [
      Skeletons.Box.Y({
        active: 0,
        className: `${W}__invite-head`,
        kids: [note('invite-title', LOCALE.INVITE_TEAM_TITLE), note('invite-desc', LOCALE.TUTORIAL_INVITE_BLURB)],
      }),
      Skeletons.Box.Y({
        active: 0,
        className: `${W}__invite-field`,
        kids: [
          note('label', LOCALE.TUTORIAL_INVITE_LABEL),
          Skeletons.Entry({
            className: `${W}__invite-input`,
            sys_pn: 'inv-email',
            partHandler: ui,
            placeholder: LOCALE.ENTER_EMAIL_ADDRESS,
            bubble: 0,
          }),
          note('error', '', { sys_pn: 'inv-error', partHandler: ui }),
        ],
      }),
      Skeletons.Box.Y({
        active: 0,
        className: `${W}__invite-actions`,
        kids: [
          Skeletons.Note({
            className: `${W}__send`, content: LOCALE.TUTORIAL_INVITE_SEND,
            service: 'inv-send', uiHandler: [ui], sys_pn: 'inv-send', partHandler: ui,
          }),
          Skeletons.Note({
            className: `${W}__skip`, content: LOCALE.TUTORIAL_INVITE_SKIP,
            service: 'inv-skip', uiHandler: [ui],
          }),
        ],
      }),
    ],
  });
}

/** 385:54554 — a personal workspace has nobody to invite. */
function personalModal(ui) {
  return Skeletons.Box.Y({
    active: 0,
    className: `${W}__modal`,
    sys_pn: 'inv-card',
    partHandler: ui,
    kids: [
      Skeletons.Image.Svg({ active: 0, ico: 'rail-logo', className: `${W}__modal-mark` }),
      note('modal-title', LOCALE.TUTORIAL_INVITE_PERSONAL),
      Skeletons.Note({
        className: `${W}__modal-btn`, content: LOCALE.TUTORIAL_INVITE_LATER,
        service: 'inv-skip', uiHandler: [ui],
      }),
    ],
  });
}

/**
 * @param {Object} ui the step
 * @param {Object} screen a SCREENS entry (screens.js)
 * @param {Object} state selected / pending / created / name, and `live` —
 *   whether this run may create (the post-signup `workspace` tour)
 */
module.exports = function (ui, screen, state = {}) {
  const p = screen.phone || {};
  if (p.view === 'home') return home(ui);
  if (p.view === 'invite') {
    const personal = (state.created || {}).type === 'personal';
    return frame(ui, {
      view: personal ? 'modal' : 'invite',
      dim: true,
      overlay: personal ? personalModal(ui) : inviteSheet(ui),
    });
  }
  const live = !!(state.live && p.live);
  return frame(ui, {
    view: 'sheet',
    // No backdrop on the real create step — it is the form, not a lesson.
    dim: !(live && p.lit === 'create'),
    overlay: sheet(ui, {
      lit: p.lit,
      live,
      selected: state.selected,
      name: state.name,
      pending: state.pending,
    }),
  });
};

module.exports.TYPES = TYPES;
