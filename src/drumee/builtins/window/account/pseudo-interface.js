
// Pseudo Interface TODO: to finish up the full interface

const __pseudo_interface = function(_ui_, key) {
  const profile = Visitor.profile();
  const obj = {
    //Forms
    forms: {

      main: {
        firstname: {
          icon  : "account_name",
          // styles: "u-jc-sb"
          items : [
            { type: "firstname", value: profile.firstname, styles: "border", ph: 1 }
          ]
        },
        lastname: {
          icon  : "account_name",
          // styles: "u-jc-sb"
          items : [
            { type: "lastname"  , value: profile.lastname , styles: "border" , ph: 1 }
          ]
        },
        id: {
          icon  : "account_id",
          items : [
            { type: "Identificator", value : Visitor.get(_a.ident), styles: "border" , ph: 1, k: 2, disable: true } // first char is mod
          ]
        },
        mail: {
          icon  : "account_mail",
          items : [
            { 
              type: "email", 
              value: profile.email, 
              styles : `${_ui_.fig.group}__input-field zzz ${_ui_.fig.group}__input-field--full ${_ui_.fig.group}__input-field--noborder`, 
              w: 100, 
              pencil: 1, 
              service : "open-modal-change-email", 
              disable: true 
            }
          ]
        },
        mobile: {
          icon  : "builder_mobile",
          items : [
            { 
              type: "mobile", 
              value: _ui_.mobile || profile.mobile, 
              styles : `${_ui_.fig.group}__input-field ${_ui_.fig.group}__input-field--full ${_ui_.fig.group}__input-field--noborder`, 
              w: 100, 
              pencil: 1, 
              service : "open-modal-change-phone", 
              _ph: "MOBILE_PHONE", 
              disable: true 
            }
          ]
        }
      },
//
      optional: {
        address: {
          items : [
            { 
              type: "address", 
              value: profile.address, 
              styles: `border full-width grey ${_ui_.fig.group}__input-field--full`, 
              w: 100 
            }
          ]
        },

        country_city_birth: {
          // styles : "u-jc-sb"
          items : [
            { req : 'countries'},
            { req : 'cities' },
            { 
              kind: KIND.datepicker, 
              type: "dob", 
              value: profile.dob, 
              styles: `${_ui_.fig.group}__input-field ${_ui_.fig.group}__input-field--select ${_ui_.fig.group}__input-field--date border grey` 
            }
          ]
        }
      }
    }
  };

  return Utils._getVal(obj, key);
};

module.exports = __pseudo_interface;
