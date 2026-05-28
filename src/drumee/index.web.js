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

// --- Frontend telemetry — Grafana Faro → watcher.drumee.com/collect ---
// Captures JS errors, unhandled rejections, fetch failures and Web Vitals.
// Placed first so it instruments code that runs during bootstrap.
try {
  const { initializeFaro, getWebInstrumentations } = require('@grafana/faro-web-sdk');
  const host = location.hostname;
  window.faro = initializeFaro({
    url: 'https://watcher.drumee.com/collect',
    app: {
      name: 'drumee-ui',
      version: typeof __VERSION__ !== 'undefined' ? __VERSION__ : 'dev',
      environment:
        host === 'app.drumee.com' || host.endsWith('.app.drumee.com') ? 'production' :
        host === 'drumee.in'      || host.endsWith('.drumee.in')      ? 'staging'    :
                                                                        'dev',
    },
    instrumentations: getWebInstrumentations({ captureConsole: false }),
    beforeSend: (item) => {
      const msg = item?.payload?.value || item?.payload?.message || '';
      if (/ResizeObserver loop limit exceeded/.test(msg)) return null;
      if (/Non-Error promise rejection captured/.test(msg)) return null;
      return item;
    },
  });
  console.log('%cFaro initialized', 'color:#fa8540;font-weight:bold');
} catch (e) {
  // SDK failure must never block app bootstrap
  console.warn('Faro init failed:', e);
}

const STYLE = "color: green; font-weight: bold;"
let bunldes = new Map();

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
