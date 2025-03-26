// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : __dbg_path
//   TYPE : Skelton
// ==================================================================== *


// ===========================================================
// __sb_inbound_main
//
// @param [Object] desk_ui
//
// @return [Object] 
//
// ===========================================================
const __sb_inbound_main = function(_ui_, data) {

  const svg_options = {
    height  : 18,
    width   : 18,
    padding : 3
  };

  const width = _ui_.$el.width() || 290;
  const sharers = {
    kind        : KIND.list.stream, 
    flow        : _a.y,
    radiotoggle : _a.parent,
    className   : `${_ui_.fig.family}__roll-sharers my-5`,
    sys_pn      : "sharers-list",
    styleOpt    : {
      width     : 367
    }, //290
    vendorOpt   : Preset.List.Orange_e,
    autoHeight  : Preset.List.y30_36_180,
    // itemsOpt    :
    //   kind      : 'inbound_sharer'
    //   dialogHandler : _ui_
    //   radio     : _.uniqueId("sharer-")
    kids        : data    
  };

 
  const a = [
    //Preset.Button.Close(_ui_)
    //Preset.Button.Close(_ui_, null, "#{_ui_.fig.family}__button-close")
    Skeletons.Box.Y({
      className : `${_ui_.fig.family}__main`,
      debug     : __filename, 
      kids: [
        Skeletons.Box.Y({
          className : `${_ui_.fig.family}__container pt-30 u-ai-center`,
          kids: [
            Skeletons.Box.X({
              className: `${_ui_.fig.family}__header u-ai-center mb-20`,
              kids: [
                Skeletons.Note({
                  content   : "Sharing request",
                  className : `${_ui_.fig.family}__title`
                })
              ]
            }),
            Skeletons.Box.Y({
              partHandler : _ui_,
              className : `${_ui_.fig.family}__container-sharer`,
              sys_pn    : "sharee-list",
              kids      : [sharers]
            })         
          ]
        }),     
        Skeletons.Wrapper.Y({
          name : "dialog",
          partHandlerpart      : _ui_,
          className : `${_ui_.fig.family}__dialog-wrapper`
        })
      ]
    })
  ];
  
  return a;
};
module.exports = __sb_inbound_main;
