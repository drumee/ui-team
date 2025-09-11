/* ==================================================================== *
*   Copyright Xialia.com  2011-2023
*   FILE : src/drumee/modules/setup/index.js
*   TYPE : Component
* ==================================================================== */

//#########################################

class ___widget_setup extends LetcBox {

  /* ===========================================================
   *
   * ===========================================================*/
  initialize(opt = {}) {
    require('./skin');
    super.initialize(opt);
    this._source = this.mget(_a.source)
    this._type = this.mget(_a.type)
  }

  /* ===========================================================
   *
   * ===========================================================*/
  onPartReady(child, pn) {
    // switch(pn) {
    //   case _a.none:
    //     this.debug("Created by kind builder", child);
    //     break;

    //   default:
    //     this.debug("Created by kind builder");
    // }
  }

  /* ===========================================================
   *
   * ===========================================================*/
  onDomRefresh() {
    this.feed(require('./skeleton').default(this));
  }

  /* ===========================================================
   *
   * ===========================================================*/
  onUiEvent(cmd, args = {}) {
    const service = args.service || cmd.get(_a.service) || cmd.get(_a.name);
    this.debug(`onUiEvent service = ${service}`, cmd, this)

    switch (service) { 
      // case 'close-overlay':
      //   return this.triggerHandlers({ service: 'close-overlay' })
      case 'save-admin-details':
        return this.saveAdminDetails();

      default:
        this.debug("Created by kind builder");
    }
  }


  saveAdminDetails(){
    this.debug("save-admin-details")
    this.debug("*****************************")
    let formData = this.getData(_a.formItem);
    let isValidate = this.validateData();
    console.log("formData")
    console.log(formData)
    console.log("validate")
    console.log(isValidate)
    if(isValidate){
      console.log("Valid")

      this.fetchService({
        service : "setup.admin_add",
        ...formData
      }).then((data)=>{
        this.debug("EZEZZEZEZE", data);
        let email = this.getItemsByAttr('sys_pn','email-input')[0];
        if(data.status == 'EMAIL_NOT_AVAILABLE'){
          return email.showError("Invalid emeil");
        }
        return location.href = `${protocol}://${Host.get(_a.domain)}${location.pathname}${_K.module.desk}`;
      })
    }

  }
 

  /**
   * @param {*} method
   * @param {*} data
   * @param {*} socket
  */
  __dispatchRest(method, data, socket) {}
}


module.exports = ___widget_setup
