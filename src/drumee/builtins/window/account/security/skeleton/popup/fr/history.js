// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : __dbg_path
//   TYPE : Skelton
// ==================================================================== *
const __privacy_login_tt = function(_ui_, txt){
  const a = Skeletons.Box.Y({
    className   : `${_ui_.fig.family}__popup-history main`,
    debug       : __filename,
    kids        : [
      Skeletons.Button.Svg({
        ico : "cross",
        className : `${_ui_.fig.family}__icon close `,
        uiHandler :  _ui_,
        service   : "close-popup"
      }), 
      Skeletons.Note({
        className : `${_ui_.fig.family}__title-history blue`,
        content : "Options d'historique des connexions"
      }),

      Skeletons.Note({ 
        className : `${_ui_.fig.family}__title-history black`,
        content : "Activé"
      }),

      Skeletons.Note({ 
        className : `${_ui_.fig.family}__text-history`,
        content : "Drumee voit où et quand vous êtes connecté et vous envoie l'historique sur votre bureau de sécurité. Ainsi, vous verrez votre historique et pourrez détecter si quelqu'un d'autre essaie de se connecter. Avec cette option, Drumee peut vous envoyer une alerte lorsqu'une connexion anormale est détectée (à un endroit où vous n'êtes pas, avec une IP non normale, etc.); Drumee garde en mémoire seulement vos 20 dernières connexions."
      }),

      Skeletons.Note({ 
        className : `${_ui_.fig.family}__title-history black`,
        content : "Non activé"
      }),

      Skeletons.Note({ 
        className : `${_ui_.fig.family}__text-history`,
        content : "Vous préférez que drumee n'ait pas connaissance du lieu et/ou du moment de vos connexions. Dans ce cas, vous n'aurez pas d'historique de connexion sur votre bureau de sécurité et aucune alerte ne pourra vous être envoyée. "
      })
    ]});
  a.kids;
  return a;
};

module.exports = __privacy_login_tt;
