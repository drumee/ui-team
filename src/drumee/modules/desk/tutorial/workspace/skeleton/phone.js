/**
 * The workspace step on a phone — Figma flow "org home -> create wp"
 * (380:54433, 380:54800, 385:938, 385:1090, 385:1226, 385:1364, 385:54554).
 *
 * The create dialog and the invite card are the SAME builders the desk mock
 * uses, hosted in a bottom sheet: the live screens read their fields by part
 * name (wsd-name-input, inv-email), so drawing a second copy of either would
 * fork that logic. Only the chrome around them is the phone's.
 */
const ph = require('../../skeleton/toolkit/phone');
const { workspaceDialog } = require('../../skeleton/toolkit/workspace-dialog');
const { inviteScreen } = require('../../skeleton/toolkit/invite');
const { filesGrid } = require('../../skeleton/toolkit/files-grid');

function orgName() {
  try {
    return (typeof Organization !== 'undefined' && Organization.name && Organization.name()) || '';
  } catch (e) {
    return '';
  }
}

// No workspace exists on any of these screens, so the bottom row is the
// pre-workspace search pill, never the tabs.
function frame(ui, { body = [], overlay = null } = {}) {
  return ph.screen(ui, {
    top: ph.topBar(ui, { lead: 'avatar', title: orgName() }),
    body,
    bottom: ph.tabBar(ui, null),
    fab: ph.fab(ui),
    overlay,
  });
}

function home(ui) {
  return frame(ui, {
    body: [ph.hero(ui, {
      title: LOCALE.HOME_HERO_TITLE,
      desc: LOCALE.HOME_HERO_DESC,
      cta: LOCALE.CREATE_FIRST_WORKSPACE,
      cta_service: 'next-step',
      deck: ph.swipeDeck(ui, { cards: [filesGrid(ui, { area: _a.private })], dots: false }),
    })],
  });
}

/**
 * @param {Object} ui the step
 * @param {Object} screen a SCREENS entry (screens.js)
 * @param {Object} state selected / pending / created / name, as the desk skeleton
 */
module.exports = function (ui, screen, state = {}) {
  const view = screen.phone && screen.phone.view;
  if (view === 'home') return home(ui);
  if (view === 'invite') {
    return frame(ui, {
      overlay: ph.sheet(ui, { kids: [inviteScreen(ui, state.created || {})], className: 'tutorial-phone__sheet--invite' }),
    });
  }
  return frame(ui, {
    overlay: ph.sheet(ui, {
      className: 'tutorial-phone__sheet--wsd',
      kids: [workspaceDialog(ui, {
        lit: screen.lit,
        ready: !!screen.ready,
        live: !!screen.live,
        selected: state.selected,
        pending: !!state.pending,
        name: state.name,
      })],
    }),
  });
};
