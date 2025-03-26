// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : __dbg_path
//   TYPE : Skelton
// ==================================================================== *
let __dbg_path;
if (__BUILD__ === 'dev') { 
  __dbg_path = 'builtins/support/feedback/item/skeleton/main';
}


// ===========================================================
// __feedback_item
//
// @param [Object] ext
//
// ===========================================================
const __feedback_item = function(manager, ext) { 
  const access_icon_options = {
    width   : 17,
    height  : 17,
    padding : 0
  };
  
  const action_icon_options = {
    width   : 20,
    height  : 20,
    padding : 0,
    cursor  : "pointer"
  };

  const m = manager.model;
  const state = manager.get(_a.state);

  const date    = Dayjs.unix(m.get(_a.createTime)).format("DD/MM");
  let feature = m.get(_a.feature);
  if (_.isEmpty(feature)) {
    try { 
      feature = JSON.parse(m.get('location')).hash.replace('#/', '');
    } catch (error) {}
  }
  const a = SKL_Box_H(manager, {
    className: "feedback__row",
    kids: [
      SKL_Note(null, m.get(_a.id), {
        className: "feedback__number"
      }),
      SKL_Note(null, m.get(_a.firstname), {
        className: "feedback__name"
      }),
      SKL_Note(null, date, {
        className: "feedback__date"
      }),
      SKL_Note(null, feature, {
        className: "feedback__feature"
      }),
      SKL_Note(null, m.get(_a.description), {
        className: "feedback__description"
      }),
      SKL_Note(null, 'n/a', {
        className: "feedback__screenshot"
      }),
      SKL_Note(null, 'n/a', {
        className: "feedback__status"
      })
      // SKL_Box_H(manager, {
      //   className: "flexgrid-1"
      //   kids:[
      //     SKL_SVG("editbox_pencil", {
      //       className: "mr-10 u-as-center auth-people__action-icon"
      //       bubble   : 1
      //       signal: _e.ui.event
      //       handler : manager.model.get(_a.handler)
      //     }, action_icon_options)
      //     SKL_SVG("desktop_delete", {
      //       className : "u-as-center auth-people__action-icon"
      //       service   : "delete-key"
      //     }, {
      //       width: 14
      //       height: 14
      //       padding: 0
      //     })
      //   ]
      // })
    ]
  });
  if (__BUILD__ === 'dev') { DBG_PATH(a, __dbg_path); }
  return a;
};
module.exports = __feedback_item;
