/**
* @license
* Copyright 2024 Drumee LLC. All Rights Reserved.
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
* http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
* =============================================================================
*/

class __module_test extends LetcBox {


  /**
   * 
   * @param {*} opt 
   * @returns 
   */
  initialize(opt) {
    require('./skin');
    super.initialize(opt);
    this.declareHandlers(); //s {part:@, ui:@}, {fork:yes, recycle:yes}

    this.skeleton = require("./skeleton");
  }





  /**
   * 
   * @param {*} child 
   * @param {*} pn 
   * @returns 
   */
  onPartReady(child, pn) {
    this.debug(`AAA:84 onPartReady AAAAA sys_pn=${pn} -->`, child);
    /*switch (pn) {
      case "editor":
        this._editorWrapper = child;
        var f = () => {
          this._editor = new JSONEditor(child.el, {
            onChange: this._onChange.bind(this),
            onModeChange: this._onModeChange.bind(this)
          });
          this._count();
        };
        return this.waitElement(child.el, f);

      case "header":
        this._draft.header = child.collection.toJSON()[0];
        return this._count();

      case "tips":
        return this._tips = child;

      case "preview":
        return this._preview = child;
    }*/
  }


  start() {
    let items = require('./configs/scenarios');
    let service;
    let task = [];
    this.__serviceTitle.el.dataset.state = 1;
    this.cursor = {};
    for (var item of items) {
      this.debug("AAA:68", item);
      task.push(item);
    }
    //let t = task.shift();
    this.debug("AAA:72", task);
    let walk = () => {
      let t = task.shift();
      this.debug("AAA:76", t);
      if (t) {
        this.__serviceName.set({ content: t.upstream.service });
        this.cursor = t;
        this.postService(t.upstream).then(succeeded).catch(failed);
      }
    }

    let failed = (r) => {
      let o = {
        kind: 'test_result',
        status: _a.error,
        error: r.reason || r.error,
        service_test: 'hello',
        service: this.cursor.upstream.service,
        details: r
      }
      this.debug('PROCESSING FAILURE RESPONSE', this.cursor, o, r);
      if (this.cursor.downstream.expect == _a.error) {
        o.status = _a.ok;
        o.error = `${o.error} (as expected)`;
      } else {
        o.status = _a.error;
        o.error = `${o.error} (should have failed)`;
      }
      //if(this.cursor.handler) o.kind = this.cursor.handler;
      this.__results.append(o);
      walk();
    }


    let succeeded = (r, s) => {
      this.debug("AAA:103", r)
      r.kind = 'test_result';
      r.status = _a.ok;
      let o = {
        kind: 'test_result',
        status: _a.ok,
        service_test: 'hello',
        service: this.cursor.upstream.service,
        details: r
      }
      if (this.cursor.downstream.expect == _a.success) {
        o.status = _a.ok;
      } else {
        o.status = _a.error;
      }
      this.debug('PROCESSING SUCCESS RESPONSE', this.cursor, o, r);
      this.__results.append(o);
      walk();
    }

    walk();
  }


  /**
   * 
   * @param {*} cmd 
   * @returns 
   */
  async onUiEvent(cmd) {
    const service = cmd.model.get(_a.service) || cmd.model.get(_a.name);
    this.debug(`AAA:84 menuEvents AAAAA service=${service} -->`, cmd);
    switch (service) {
      case _e.start:
        this.start();
        break;
      case 'load':
        break;
      case 'graph':
        let rules = {
          x : 'date',
          y : 'users'
        }
        let time_format = "%d/%m/%Y";
        let margin = {
          top: 115,
          right: 20,
          bottom: 40,
          left: 60,
        }
        var data = await this.postService(SERVICE.analytics.users,{hub_id:Visitor.id});
        data.unshift(['date', 'users']);
        

    this.__results.feed(require('./skeleton/graph')(this, {
      title : "Drumee Users's Evolution",
      time_format, 
      margin, 
      rules, 
      data})
    );
    break;
      default:
    this.warn(`Unknow service ${service} `)
    }
  }



}
module.exports = __module_test;
