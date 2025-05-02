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

class ___test_result extends LetcBox{

  constructor(...args) {
    super(...args);
  }


  /**
   * 
   */
  initialize (opt={}){
    require('./skin');
    super.initialize(opt);
    this.declareHandlers();
    this.skeleton = require('./skeleton')(this);
    //this.bindEvent('...');
  }

  /**
   * 
   * @param {View} child
   * @param {String} pn
   */
  onPartReady (child, pn){
    /*switch(pn){
      case _a.none:
        this.debug("Created by kind builder", child);
        break;
      default:
        super.onPartReady(child, pn);
        this.debug("Created by kind builder");
    }*/
  }

  /**
   * Upon DOM refresh, after element actually insterted into DOM
   */
  onDomRefresh(){
    this.feed(require('./skeleton')(this));
  }

  /**
   * User Interaction Evant Handler
   * @param {View} cmd
   * @param {Object} args
   */  
  onUiEvent (cmd, args){
    let service = cmd.get(_a.service) || cmd.get(_a.name);
    let status = cmd.get(_a.status);
    this.debug('service', service, cmd);
    switch(service){
      case  _a.none:
        this.debug("Created by kind builder");
      break;
      default:
        this.debug("Created by kind builder");
        this.triggerHandlers();
        // if(super.onUiEvent) super.onUiEvent(cmd, args)
    }
  }



}

module.exports = ___test_result
