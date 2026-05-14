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

const { gsap } = require("gsap");

// GSAP v2 ease namespaces → v3 string eases
const Expo = {
  get easeOut()  { return "expo.out"; },
  get easeIn()   { return "expo.in"; },
  get easeInOut(){ return "expo.inOut"; },
};

const Cubic = {
  get easeOut()  { return "power3.out"; },
  get easeIn()   { return "power3.in"; },
  get easeInOut(){ return "power3.inOut"; },
};

const Linear = {
  get easeNone() { return "none"; },
  get easeIn()   { return "none"; },
  get easeOut()  { return "none"; },
  get easeInOut(){ return "none"; },
};

function getTarget(t) {
  if (!t) return t;
  if (t.jquery) return t.get(0);
  if (t[0] && t[0].nodeType) return t[0];
  return t;
}

// GSAP v2 property aliases → v3 names
function translateKey(k) {
  if (k === 'alpha')      return 'opacity';
  if (k === 'rotationX')  return 'rotateX';
  if (k === 'rotationY')  return 'rotateY';
  if (k === 'rotationZ')  return 'rotateZ';
  return k;
}

function translateVars(vars) {
  const out = {};
  for (const [k, v] of Object.entries(vars)) out[translateKey(k)] = v;
  return out;
}

// GSAP v2 API: to(target, duration, vars) → v3: to(target, {duration, ...vars})
const TweenMax = {
  to(target, duration, vars) {
    return gsap.to(getTarget(target), { duration, ...translateVars(vars) });
  },
  fromTo(target, duration, fromVars, toVars) {
    return gsap.fromTo(getTarget(target), translateVars(fromVars), { duration, ...translateVars(toVars) });
  },
  set(target, vars) {
    return gsap.set(getTarget(target), translateVars(vars));
  },
};

const TweenLite = TweenMax;

class TimelineMax {
  constructor() {
    this._tl = gsap.timeline();
  }
  to(target, duration, vars) {
    this._tl.to(getTarget(target), { duration, ...translateVars(vars) });
    return this;
  }
}

document.addEventListener('readystatechange', () => {
  if (document.readyState == 'complete') {
    console.log(`Loading Vendor...`);
    window.gsap = { TweenMax, TweenLite, TimelineMax, Expo, Cubic, Linear };
    const event = new Event('drumee:bootstraping');
    event.name = 'vendor'
    document.dispatchEvent(event);
  }
}, false);
