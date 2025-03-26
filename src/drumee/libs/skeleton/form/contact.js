/*
 * decaffeinate suggestions:
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : ../src/drumee/libs/skeleton/form/contact
//   TYPE : 
// ==================================================================== *

    const author = (typeof model !== 'undefined' && model !== null ? model.get(_a.author_id) : undefined) || Visitor.get(_a.id);
    const name   = "Contact";
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
        name: 'request',
        kind: KIND.entry,
        picto: _p.home,
        placeholder : LOCALE.MESSAGE,
        newline:_a.text,
        require:_a.string
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
      },{
        name: 'category',
        type: _a.hidden,
        value:_a.contact,
        require:_a.none
      }
    ];
