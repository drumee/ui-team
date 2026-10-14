/**
 * The migrate step on a phone — Figma "Files → Migrate", the three import-sheet
 * frames: 385:55398 copy the address, 386:55610 paste the link, 386:55759
 * Verify & Import. The blank-workspace and + menu frames before them are not
 * steps on a phone (screens.js `skip`).
 *
 * Two drawings of one sheet:
 *
 *   teaching (default export)  the frames: the workspace behind, a 20% overlay,
 *                              the sheet tinted, and every block but the one
 *                              the step is about faded (data-lit, skin).
 *   live (`.live`)             the LAST step on a host that can do it for real:
 *                              the same sheet, plain, driven by the import's
 *                              own state (libs/gdrive-sa-import — the flow
 *                              migrate-gdrive-popup runs): the real service
 *                              address and Copy, a real link field, and
 *                              Verify & Import (`start` verifies, then
 *                              imports). Progress and the result reuse the
 *                              import's content (./live.js liveBody).
 */
const ph = require('../../skeleton/toolkit/phone');
const { liveBody, heading, FORM } = require('./live');
const { errorText } = require('libs/gdrive-sa-import');
const folderArt = require('media/grid/template/folder');

const M = 'tutorial-migrate__ph';
const url = (m) => (m && m.default ? m.default : m);
const FUNNEL = require('assets/tutorial/mg-phone/funnel.svg');
const CHECK = require('assets/tutorial/mg-phone/check.svg');
// What the frames show; the live form shows the server's real address.
const SA_ADDRESS = 'drumee-drive-import@growth-hacking-491411.iam.gserviceaccount.com';

const note = (cls, content, extra = {}) =>
  Skeletons.Note({ active: 0, className: `${M}-${cls}`, content, ...extra });

/** "1. In Google Drive, …" → the number in its own hanging column (the frames' list). */
function stepLabel(text) {
  const m = String(text || '').match(/^(\d+\.)\s*([\s\S]*)$/);
  return Skeletons.Box.X({
    active: 0,
    className: `${M}-step-label`,
    kids: m
      ? [note('step-num', m[1]), note('step-text', m[2])]
      : [note('step-text', text)],
  });
}

function copyButton(ui, { done, live }) {
  return Skeletons.Box.X({
    ...(live ? { service: 'mg-live-copy', uiHandler: [ui] } : { active: 0 }),
    className: `${M}-copy`,
    sys_pn: 'mg-ph-copy',
    partHandler: ui,
    kidsOpt: { active: 0 },
    dataset: { done: done ? '1' : '0' },
    attrOpt: { 'data-done': done ? '1' : '0' },
    kids: [
      Skeletons.Element({
        active: 0, tagName: 'img', className: `${M}-copy-ico`, attribute: { src: url(CHECK), alt: '' },
      }),
      note('copy-label', LOCALE.COPY),
    ],
  });
}

function header(ui, title, live) {
  return Skeletons.Box.X({
    active: 0,
    className: `${M}-head`,
    kids: [
      note('title', title),
      Skeletons.Image.Svg({
        ...(live ? { service: 'mg-live-close', uiHandler: [ui] } : { active: 0 }),
        ico: 'ph-x',
        className: `${M}-x`,
      }),
    ],
  });
}

/** The workspace behind the sheet: its pill, the filter row, the nav. */
function frame(ui, { overlay, dim }) {
  const dest = ui.mget('import_dest') || {};
  const art = folderArt({
    area: dest.area || _a.private,
    filetype: _a.hub,
    role: 'desk',
    widgetId: _.uniqueId('tutorial-mg-ph-'),
    isAttachment: 1,
  });
  const filters = Skeletons.Box.X({
    active: 0,
    className: `${M}-filters`,
    kids: [
      Skeletons.Box.X({
        active: 0,
        className: `${M}-filter-all`,
        kids: [
          Skeletons.Element({
            active: 0, tagName: 'img', className: `${M}-filter-ico`, attribute: { src: url(FUNNEL), alt: '' },
          }),
          note('filter-label', LOCALE.ALL),
        ],
      }),
      Skeletons.Box.X({
        active: 0,
        className: `${M}-view`,
        kids: ['app-tree-view', 'view-list', 'view-grid'].map((ico, i) => Skeletons.Box.X({
          active: 0,
          className: `${M}-view-seg`,
          dataset: { on: i === 2 ? '1' : '0' },
          attrOpt: { 'data-on': i === 2 ? '1' : '0' },
          kids: [Skeletons.Image.Svg({ active: 0, ico, className: `${M}-view-ico` })],
        })),
      }),
    ],
  });
  return ph.screen(ui, {
    view: 'migrate',
    dim,
    top: ph.topBar(ui, { lead: 'avatar', title: dest.name || '', art }),
    body: [filters],
    bottom: ph.tabBar(ui, 'files'),
    fab: ph.fab(ui),
    overlay,
  });
}

/**
 * Teaching: one of the three frames.
 * @param {Object} ui the step
 * @param {Object} screen a SCREENS entry (screens.js)
 */
module.exports = function (ui, screen = {}) {
  const lit = (screen.phone || {}).lit || 'copy';
  const sheet = Skeletons.Box.Y({
    active: 0,
    className: `${M}-sheet`,
    sys_pn: 'mg-ph-sheet',
    partHandler: ui,
    dataset: { lit },
    attrOpt: { 'data-lit': lit },
    kids: [
      header(ui, LOCALE.IMPORT_FOLDER_OR_FILE, false),
      Skeletons.Box.Y({
        active: 0,
        className: `${M}-step ${M}-step--copy`,
        kids: [
          stepLabel(LOCALE.MIGRATE_STEP_SHARE_ADDRESS),
          Skeletons.Box.X({
            active: 0,
            className: `${M}-address`,
            sys_pn: 'mg-ph-address',
            partHandler: ui,
            kids: [note('email', SA_ADDRESS), copyButton(ui, { done: lit !== 'copy', live: false })],
          }),
        ],
      }),
      Skeletons.Box.Y({
        active: 0,
        className: `${M}-step ${M}-step--paste`,
        kids: [
          stepLabel(LOCALE.MIGRATE_STEP_PASTE_LINK),
          Skeletons.Box.X({
            active: 0,
            className: `${M}-link`,
            sys_pn: 'mg-ph-link',
            partHandler: ui,
            kids: [note('placeholder', LOCALE.MIGRATE_PHONE_LINK_PLACEHOLDER)],
          }),
        ],
      }),
      note('verify', LOCALE.MIGRATE_PHONE_VERIFY_IMPORT, {
        sys_pn: 'mg-ph-verify',
        partHandler: ui,
        dataset: { ready: lit === 'verify' ? '1' : '0' },
        attrOpt: { 'data-ready': lit === 'verify' ? '1' : '0' },
      }),
    ],
  });
  return frame(ui, { overlay: sheet, dim: true });
};

/**
 * Live: the real import, plain — no overlay, nothing faded, no callout.
 * @param {Object} ui the step
 * @param {Object} snap the import's snapshot (libs/gdrive-sa-import)
 * @param {Object} dest where it lands
 * @param {{link?: String}} opt what the link field held before a re-render
 */
module.exports.live = function (ui, snap = {}, dest = {}, opt = {}) {
  const state = snap.state || 'loading';
  let kids;
  if (FORM.includes(state)) {
    const ready = !!snap.saEmail && state !== 'checking' && state !== 'loading';
    const status = state === 'checking'
      ? note('status', LOCALE.LOADING || 'Checking…', { dataset: { kind: 'pending' } })
      : snap.error
        ? note('status', errorText(snap.error), { dataset: { kind: 'error' } })
        : snap.folder
          ? note('status', (LOCALE.GDRIVE_SA_FOUND || 'Folder found: {0}').replace('{0}', snap.folder.name),
            { dataset: { kind: 'ok' } })
          : null;
    kids = [
      header(ui, LOCALE.IMPORT_FOLDER_OR_FILE, true),
      Skeletons.Box.Y({
        active: 0,
        className: `${M}-step ${M}-step--copy`,
        kids: [
          stepLabel(LOCALE.MIGRATE_STEP_SHARE_ADDRESS),
          Skeletons.Box.X({
            active: 0,
            className: `${M}-address`,
            sys_pn: 'mg-ph-address',
            partHandler: ui,
            kids: [
              note('email', snap.saEmail || LOCALE.MIGRATE_GDRIVE_TREE_LOADING, { escapeContextmenu: true }),
              snap.saEmail ? copyButton(ui, { done: false, live: true }) : null,
            ].filter(Boolean),
          }),
        ],
      }),
      Skeletons.Box.Y({
        active: 0,
        className: `${M}-step ${M}-step--paste`,
        kids: [
          stepLabel(LOCALE.MIGRATE_STEP_PASTE_LINK),
          Skeletons.Box.X({
            active: 0,
            className: `${M}-link ${M}-link--live`,
            kids: [Skeletons.Entry({
              className: `${M}-input`,
              sys_pn: 'mg-live-link',
              partHandler: ui,
              placeholder: LOCALE.MIGRATE_PHONE_LINK_PLACEHOLDER,
              mode: 'commit',
              service: 'mg-live-verify',
              uiHandler: [ui],
              escapeContextmenu: true,
              value: opt.link || (snap.folder && snap.folder.raw) || '',
            })],
          }),
          status,
        ].filter(Boolean),
      }),
      Skeletons.Note({
        className: `${M}-verify`,
        content: state === 'checking' ? (LOCALE.LOADING || 'Checking…') : LOCALE.MIGRATE_PHONE_VERIFY_IMPORT,
        sys_pn: 'mg-ph-verify',
        partHandler: ui,
        dataset: { ready: ready ? '1' : '0' },
        attrOpt: { 'data-ready': ready ? '1' : '0' },
        ...(ready ? { service: 'mg-live-start', uiHandler: [ui] } : { active: 0 }),
      }),
    ];
  } else {
    kids = [header(ui, heading(state), true), ...liveBody(ui, snap, dest, opt)];
  }
  return frame(ui, {
    dim: false,
    overlay: Skeletons.Box.Y({
      active: 0,
      className: `${M}-sheet ${M}-sheet--live`,
      sys_pn: 'mg-ph-sheet',
      partHandler: ui,
      dataset: { phase: state },
      attrOpt: { 'data-phase': state },
      kids,
    }),
  });
};
