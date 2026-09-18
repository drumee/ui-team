/**
 * @license
 * Copyright 2024 Thidima SA. All Rights Reserved.
 * Licensed under the GNU AFFERO GENERAL PUBLIC LICENSE, Version 3 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * https://www.gnu.org/licenses/agpl-3.0.html
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */
/**
 * The disconnect screen — after Sign out, and after "Back to sign in" on the
 * analytics authorization card.
 *
 * ONE TEMPLATE with the plugin loading screen (modules/plugins/skeleton) and
 * analytics-ui's authorization screen: the sign-in page's backdrop, the
 * sign-in card, the lockup top-left, the message centred. All three are "you
 * cannot use the app right now" screens.
 *
 * `sys_pn: "disconnected"` IS LOAD-BEARING. Butler.logout awaits
 * ensurePart('disconnected') before it posts drumate.logout, so renaming or
 * dropping that part stops logout mid-flight: overlay up, session never
 * ended, nothing logged. Same for the loader part. See
 * tests/goodbye-screen.test.js.
 *
 * The wallpaper this screen used to carry is gone: the template paints its
 * own backdrop, and a background image would fight it.
 */
const LOGO = require("assets/drumee-logo.svg");

const __skl_goodbye = function (_ui_) {
  const goodByeFig = `${_ui_.fig.family}-goodbye`;
  const logo = LOGO.default || LOGO;

  const header = Skeletons.Box.X({
    className: `${goodByeFig}__header`,
    sys_pn: "disconnected",
    kids: [
      Skeletons.Note({
        className: `${goodByeFig}__note`,
        content: LOCALE.GOODBYE_SEE_YOU_LATER
      }) //'You will be disconnected shortly. See you later !'
    ]
  });

  // The determinate bar from the boot screen (server-team
  // client/templates/warmup.html), not a spinner: logout has REAL milestones
  // to report — the screen is up, the session POST came back — where a boot
  // has bundles landing. A spinner says "something is happening" for a flow
  // whose length is actually known.
  //
  // Colours, height, radius and the 1s width transition are that bar's, ported
  // in skin/goodbye.scss. The MECHANICS are not: warmup.html hangs its track
  // and fill off `bottom: -5px` because the bar has to sit under a caption
  // inside one fixed row. Here the markup is ours, so the track is the row's
  // own background and the fill is an in-flow child — same picture, nothing
  // absolutely positioned to keep in step.
  //
  // `goodbye-progress` is how Butler.logout reaches the fill (_logoutProgress).
  const content = Skeletons.Box.Y({
    className: `${goodByeFig}__container`,
    sys_pn: _a.loader,
    kids: [
      Skeletons.Box.X({
        className: `${goodByeFig}__progress`,
        kids: [
          Skeletons.Box.X({
            className: `${goodByeFig}__progress-fill`,
            sys_pn: "goodbye-progress",
          }),
        ],
      }),
    ]
  });

  const card = Skeletons.Box.Y({
    className: `${goodByeFig}__card`,
    kids: [
      Skeletons.Element({
        className: `${goodByeFig}__logo`,
        content: `<img src="${logo}" alt="drumee" width="121" height="24">`,
      }),
      header,
      content
    ]
  });

  const a = Skeletons.Box.Y({
    debug: __filename,
    className: `${goodByeFig}__main`,
    kids: [card]
  });

  return a;
};

module.exports = __skl_goodbye;
