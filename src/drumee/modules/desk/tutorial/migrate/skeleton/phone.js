/**
 * The migrate step on a phone — Figma flow "Files → Migrate" (385:55109
 * blank workspace, 385:55247 the + menu, 385:55398 / 386:55610 / 386:55759
 * the import sheet).
 *
 * The pane's controls are LIVE, exactly as on the desk: the + opens the menu,
 * whose rows upload from the device, open the import sheet, or create a
 * document/folder in the real window (window-tutorial:act). The import sheet is
 * the desk's own dialog builder; the skin turns it into a bottom sheet.
 */
const ph = require('../../skeleton/toolkit/phone');
const { NEW_ITEMS } = require('../../skeleton/toolkit/files');
const dialog = require('./dialog');

const M = 'tutorial-migrate__ph';

function row(ui, { ico, label, service, extra = {} }) {
  return Skeletons.Box.X({
    className: `${M}-row`,
    service,
    uiHandler: [ui],
    ...extra,
    kids: [
      Skeletons.Image.Svg({ active: 0, ico, className: `${M}-row-ico` }),
      Skeletons.Note({ active: 0, className: `${M}-row-label`, content: label }),
    ],
  });
}

/** The + menu (385:55247): device and Google Drive first, then + New. */
function fabMenu(ui) {
  return Skeletons.Box.Y({
    active: 0,
    className: `${M}-menu`,
    sys_pn: 'ph-fab-menu',
    kids: [
      row(ui, { ico: 'upload-simple', label: LOCALE.FROM_DEVICE, service: 'mg-do-upload' }),
      row(ui, { ico: 'logo-google', label: LOCALE.MIGRATE_FROM_GOOGLE_DRIVE, service: 'mg-open-dialog' }),
      Skeletons.Element({ active: 0, className: `${M}-divider` }),
      // The same rows, services and file names as the desk's + New menu
      // (toolkit/files newMenu), so the step's mg-do-create reads them alike.
      ...NEW_ITEMS.map((item) => row(ui, {
        ico: item.ico,
        label: item.label(),
        service: 'mg-do-create',
        extra: {
          name: item.name,
          dataset: { service: item.service, kind: item.kind },
          attrOpt: { 'data-service': item.service, 'data-kind': item.kind },
        },
      })),
    ],
  });
}

/**
 * The blank workspace the tour is about, drawn as a phone screen.
 * Exported for the live import, which rises over the same screen.
 */
function pane(ui, { menuOpen = null } = {}) {
  const dest = ui.mget('import_dest') || {};
  return ph.screen(ui, {
    top: ph.topBar(ui, { lead: 'avatar', title: dest.name || '' }),
    body: [Skeletons.Box.X({
      active: 0,
      className: `${M}-filters`,
      kids: [Skeletons.Note({ active: 0, className: `${M}-chip`, content: LOCALE.ALL })],
    })],
    bottom: ph.tabBar(ui, 'files'),
    fab: ph.fab(ui, { service: 'mg-toggle-menu', menu: 'fab' }),
    overlay: menuOpen ? fabMenu(ui) : null,
  });
}

/**
 * @param {Object} ui the step
 * @param {Object} screen a SCREENS entry (screens.js)
 * @param {{menuOpen?: String, enter?: Boolean}} state
 */
module.exports = function (ui, screen = {}, state = {}) {
  const view = screen.phone && screen.phone.view;
  if (view !== 'dialog') return pane(ui, { menuOpen: state.menuOpen });
  const base = pane(ui);
  base.kids = [...base.kids, dialog(ui, {
    copied: screen.copied,
    linked: screen.linked,
    enter: state.enter,
    dest: ui.mget('import_dest') || undefined,
  })];
  return base;
};

module.exports.pane = pane;
