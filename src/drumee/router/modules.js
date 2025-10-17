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
const Modules = {
  admin: {
    kind: 'module_admin',
    access: _a.private,
    loose_host: true
  },
  desk: {
    kind: 'module_desk',
    access: _a.private,
    loose_host: false
  },
  devel: {
    kind: 'module_devel',
    access: _a.public,
    loose_host: true,
  },
  dmz: {
    kind: 'module_dmz',
    access: _a.public,
    loose_host: true,
  },
  plugins: {
    kind: 'module_plugins',
    access: _a.public,
    loose_host: true,
  },
  sandbox: {
    kind: 'module_sandbox',
    access: _a.public,
    loose_host: true,
  },
  welcome: {
    kind: 'module_welcome',
    access: _a.public,
    loose_host: false
  },
}

/** Aliases to force routing triggers */
Modules.signedin = Modules.desk;

/**
 * 
 * @returns 
 */
function moduleName() {
  let method;
  const { hash } = location;
  const module_pattern = /^(\#\@|\#\/)/;
  const urlSeparator = new RegExp(/[\/&\?]/g);
  if (module_pattern.test(hash)) {
    const args = hash.split(urlSeparator);
    method = args.shift();
    if (method === '#') {
      method = args.shift();
    }
    method = method.replace(module_pattern, _K.char.empty);
  }
  if ((method == null)) {
    const d = Host.get(_a.domain);
    const re = new RegExp(`^(home.${d}|www.${d}|${d}).*$`);
    if (re.test(location.host)) {
      return 'desk';
    }
  }

  return method;
}


/**
 * 
 */
function getModule(name) {
  name = name || moduleName();
  return Modules[name] || {};
}

/**
 * 
 */
function addModule(name, mod) {
  if (!Modules[name]) Modules[name] = mod;
}

module.exports = { moduleName, getModule, addModule }
