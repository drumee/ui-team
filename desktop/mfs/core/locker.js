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
const MAPS = {
  created: new Map(),
  downloaded: new Map(),
  removed: new Map(),
  renamed: new Map(),
  moved: new Map(),
  trashed: new Map(),
  uploaded: new Map(),
  media: new Map(),
};

/**
 * 
 */
function isPending(name, ...keys) {
  let map = MAPS[name];
  if (!map) {
    console.trace();
    console.log(`AAA:22 ${name} is not a valid lock`);
    return null;
  }
  for (let key of keys) {
    if (key && map.get(key)) {
      return map.get(key);
    }
  }
  return null;
}

/**
 * 
 */
function unsetPending(name, ...keys) {
  let map = MAPS[name];
  if (!map) {
    console.log(`AAA:39 ${name} is not a valid lock`);
    return null;
  }
  for (let key of keys) {
    if (key) {
      return map.delete(key);
    }
  }
  return null;
}

/**
 * 
 */
function setPending(name, value, ...keys) {
  let map = MAPS[name];
  if (!value) value = name;
  if (!map) {
    console.log(`AAA:56 ${name} is not a valid lock`);
    return null;
  }
  for (let key of keys) {
    if (key) {
      return map.set(key, value);
    }
  }
  return null;
}

/**
 * 
 */
function sizeOfpending(name) {
  let map = MAPS[name];
  if (!map) {
    return 0;
  }
  return map.size;
}

/**
 * 
 */
function clearPending(...keys) {
  for (let m in MAPS) {
    for (let k of keys) {
      MAPS[m].delete(k);
    }
  }
}
/**
 * 
 */
function pendingLocks(name) {
  let map = MAPS[name];
  if (!map) {
    return [];
  }
  return map.values();
}

module.exports = {
  isPending,
  unsetPending,
  setPending,
  clearPending,
  sizeOfpending,
  pendingLocks,
  showPending: function (name, opt) {
    let tag = "[PENGING]";
    if (!name || name == "*") {
      for (let k in MAPS) {
        if (/^v/.test(opt)) {
          console.log(`${tag} ${k} : `, MAPS[k].values())
        } else {
          console.log(`${tag} ${k} : `, MAPS[k].keys())
        }
      }
    } else if (MAPS[name]) {
      if (/^v/.test(opt)) {
        console.log(`${tag} ${name} : `, MAPS[name].values())
      } else {
        console.log(`${tag} ${name} : `, MAPS[name].keys())
      }
    }
  }
};
