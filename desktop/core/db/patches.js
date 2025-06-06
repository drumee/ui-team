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

function patches() {
  const action = (args) => {
    let sql = `DROP TABLE IF EXISTS ${args.name}`;
    //console.log("AAA:4", sql);
    this.run(sql);
    try {
      this.createTable(args.name);
      this._schemasPatched[args.name] = true;
    } catch (e) {
      console.warn("Failed to patch", e);
      return;
    }
    this.putInToTable('schema', args);
  };


  let ctime = Math.round(new Date().getTime() / 1000);
  let p = {
    event: {
      args: {
        name: 'event',
        version: '0.1.21',
        buildIndex: true,
        ctime,
      },
      action,
    },
    fslog: {
      args: {
        name: 'fslog',
        version: '0.0.26',
        ctime,
      },
      action,
    },
    fsevent: {
      args: {
        name: 'fsevent',
        version: '0.0.11',
        ctime,
      },
      action,
    },
    fsnode: {
      args: {
        name: 'fsnode',
        version: '0.1.13',
        ctime,
      },
      action
    },
    fsnode_old: {
      args: {
        name: 'fsnode_old',
        version: '0.0.5',
        ctime,
      },
      action
    },
    fschangelog: {
      args: {
        name: 'fschangelog',
        version: '0.0.12',
        ctime,
      },
      action
    },
    local: {
      args: {
        name: 'local',
        version: '0.0.49',
        ctime,
      },
      action
    },
    hash: {
      args: {
        name: 'hash',
        version: '0.0.1',
        ctime,
      },
      action
    },
    semaphore: {
      args: {
        name: 'semaphore',
        version: '0.0.7',
        ctime,
      },
      action
    },
    source: {
      args: {
        name: 'source',
        version: '0.0.11',
        ctime,
      },
      action
    },
    destination: {
      args: {
        name: 'destination',
        version: '0.0.11',
        ctime,
      },
      action
    },
    remote: {
      args: {
        name: 'remote',
        version: '0.0.38',
        buildIndex: true,
        ctime,
      },
      action
    },
    remote_changelog: {
      args: {
        name: 'remote_changelog',
        version: '0.0.25',
        ctime,
      },
      action
    },
    changelog_buffer: {
      args: {
        name: 'changelog_buffer',
        version: '0.0.4',
        ctime,
      },
      action
    },
    remote_old: {
      args: {
        name: 'remote_old',
        version: '0.0.4',
        ctime,
      },
      action
    },
    task: {
      args: {
        name: 'task',
        version: '0.0.15',
        ctime,
      },
      action,
    },
    endpoint: {
      args: {
        name: 'endpoint',
        version: '0.0.1',
        ctime,
      },
      action
    },
    user: {
      args: {
        name: 'user',
        version: '0.0.2',
        ctime,
      },
      action
    },
    trash: {
      args: {
        name: 'trash',
        version: '0.0.2',
        ctime,
      },
      action
    },
    callback: {
      args: {
        name: 'callback',
        version: '0.0.1',
        ctime,
      },
      action
    },
    journal: {
      args: {
        name: 'journal',
        version: '0.0.3',
        ctime,
      },
      action
    },
    filecap: {
      args: {
        name: 'filecap',
        version: '0.0.14',
        ctime,
      },
      action
    },
    settings: {
      args: {
        name: 'settings',
        version: '0.0.2',
        ctime,
      },
      action
    },
  }
  return p;
}

module.exports = { patches };
