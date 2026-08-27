/**
 * @license
 * Copyright 2025 Thidima SA. All Rights Reserved.
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
const STYLE = "color: green; font-weight: bold;"
let bunldes = new Map();

// "#/desk/billing" — record the destination at the earliest point in the app,
// before anything can navigate.
//
// The router already does this for campaign markers, and that is late enough
// for them: they ride on the query string, which survives. A hash does not.
// A signed-out visitor on this link is sent to sign in by a FULL page
// navigation, and the hash is gone by the time the router of the SECOND
// document runs — measured on stage, where the capture there saw only
// "#/welcome/signin". Module scope here runs while the original URL is still
// the original URL, and sessionStorage outlives the navigation.
require('libs/billing-deep-link').captureFromUrl();

// "#/desk/wm/o/…" — a Designation link sent to somebody else, opened by a visitor
// with no session. Captured here for the same reason and at the same moment as
// the line above: `locationOnStart`, which wm.route() used to rely on, is
// rewritten on every boot, so it holds "#/welcome/signin" by the time the desk
// asks. Module scope runs while the URL is still the original one. See
// libs/file-deep-link.
require('libs/file-deep-link').captureFromUrl();

// Google tag (gtag.js). Module scope for the same reason as the capture above:
// this is the earliest code the app runs, which is as close as a bundle can get
// to the <head> placement Google asks for. Self-gating — it installs nothing
// off a drumee.com host. See libs/gtag.
require('libs/gtag').install();

/**
 * 
 */
function load_app() {
  Kind.registerAddons(require("./seeds"));
  const App = require('./drumee');
  window.Drumee = new App();
  console.log(`Staring Drumee Web...`);
  console.log(`Build commit=%c${__COMMIT__}, mode=${__BUILD__}`, STYLE);
  console.log(`UI version=%c${Drumee.version}`, STYLE);
  window.DrumeeMediaInteract = require('builtins/media/interact');
  Drumee.start();
  document.removeEventListener('drumee:bootstraping', preload);
}

/**
 * 
 */
function preload(e) {
  bunldes.set(e.name, 1);
  if (bunldes.size > 2) {
    load_app()
  }
}

document.addEventListener('drumee:bootstraping', preload);
