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
const _ = require('lodash');
function fieldsAndValues(db, name, exclude = []) {
  let schema = db.schema(name);
  for (var k of exclude) {
    delete schema[k];
  }
  const fields = _.keys(schema).join(',');
  const values = _.keys(schema).join(',@');
  return { fields, values };
}


module.exports = function (db, tableName){
  let { fields, values } = fieldsAndValues(db, tableName);
  let sql = `REPLACE INTO ${tableName} (${fields}) VALUES(@${values})`;
  let _db = db.connector();
  let r = _db.prepare(sql);
  return r;
}
