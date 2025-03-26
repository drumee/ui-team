// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : __dbg_path
//   TYPE : Skelton
// ==================================================================== *
const __privacy_login_tt = function(_ui_, txt){
  const a = Skeletons.Box.Y({
    className   : `${_ui_.fig.family}__popup main`,
    debug       : __filename,
    kids        : [
      Preset.Button.Close(_ui_, "close-popup"),
      Skeletons.Note({
        className : `${_ui_.fig.family}__title blue`,
        content : "Connexions history options"
      }),

      Skeletons.Note({ 
        className : `${_ui_.fig.family}__title black`,
        content : "Activated"
      }),

      Skeletons.Note({ 
        className : `${_ui_.fig.family}__text`,
        content : "Drumee see where an when you are connected and send you history on your security desktop. So you will see your history and can detect if someone else  try to connect. With this option Drumee can send you alert when an unormal connexion is seen (at a place where you are not, whith IP not normal, etc.); Drumee keep in memory only you last 20 connexions."
      }), 
      
      Skeletons.Note({ 
        className : `${_ui_.fig.family}__title black`,
        content : "Not activated"
      }),

      Skeletons.Note({ 
        className : `${_ui_.fig.family}__text`,
        content : "You prefer that drumee did not have history of where and when you made connections. In this case you will not have connexion history on your security desk and no alert can be sent to you."
      })
    ]});
  a.kids;
  return a;
};

module.exports = __privacy_login_tt;
