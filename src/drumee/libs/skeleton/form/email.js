/*
 * decaffeinate suggestions:
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : ../src/drumee/libs/skeleton/form/email
//   TYPE : 
// ==================================================================== *

    const author = (typeof model !== 'undefined' && model !== null ? model.get(_a.author_id) : undefined) || Visitor.get(_a.id);
    const name   = (typeof model !== 'undefined' && model !== null ? model.get(_a.name) : undefined) || ident;
    const label  = (typeof model !== 'undefined' && model !== null ? model.get(_a.name) : undefined) || '';
    //_dbg "_REQ.ui.form.contact", model
    [{
        name: _a.firstname,
        kind: KIND.entry,
        picto: _p.user,
        placeholder : LOCALE.FIRSTNAME,
        require:_a.name
      },{
        name: _a.lastname,
        kind: KIND.entry,
        picto: _p.user,
        placeholder : LOCALE.LASTNAME,
        require:_a.name
      },{
        name: _a.email,
        kind: KIND.entry,
        picto: _p.email,
        placeholder : LOCALE.EMAIL,
        require:_a.email,
        allow: _a.email,
        //allow2:"-_.@\xBE"
      },{
        name: _a.phone,
        kind: KIND.entry,
        picto: _p.mobile,
        placeholder : LOCALE.MOBILE_PHONE,
        require:_a.phone,
        allow: _a.phone,
        //allow2:"-_.@\xBE"
      },{
        name: 'address',
        kind: KIND.entry,
        picto: _p.home,
        placeholder : LOCALE.POSTAL_ADDRESS,
        newline:_a.text,
        require:_a.string
      },{
        kind:KIND.bit.radio,
        name:_a.answer,
        label,
        require:_a.answer,
        cmArgs: {
          flow: `${_a.horizontal}`,
          active:true
        },
        items:[{
          label:_I.YES,
          value : _a.yes,
          stae : 1
        },{
          label:_I.NO,
          value : _a.no
        },{
          label:_I.MAYBE,
          value : _a.maybe
        }]
      },{
        name: _a.ident,
        type: _a.hidden,
        value:ident,
        require:_a.ident
      },{
        name: _a.name,
        type: _a.hidden,
        value:name,
        require:_a.none
      },{
        name: _a.author_id,
        type: _a.hidden,
        value:author,
        require:_a.none
      }
    ];
