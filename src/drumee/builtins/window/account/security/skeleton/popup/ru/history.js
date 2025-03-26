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
        content : "«Опции истории противоречий»"
      }),

      Skeletons.Note({ 
        className : `${_ui_.fig.family}__title black`,
        content : "активированный"
      }),

      Skeletons.Note({ 
        className : `${_ui_.fig.family}__text`,
        content : "Drumee увидеть, где и когда вы подключены и отправит вам историю на вашем рабочем столе безопасности. Таким образом, вы увидите свою историю и сможете определить, пытался ли кто-то еще подключиться. С помощью этой опции Drumee может отправлять вам оповещения, когда видят ненормальную связь (в месте, где вы не находитесь, где IP ненормальный и т. Д.); Друми хранят в памяти только последние 20 соединений."
      }),

      Skeletons.Note({ 
        className : `${_ui_.fig.family}__title black`,
        content : "Не активировано"
      }),

      Skeletons.Note({ 
        className : `${_ui_.fig.family}__text`,
        content : "Вы предпочитаете, чтобы у друми не было истории, где и когда вы установили связи. В этом случае у вас не будет истории подключений на вашей службе безопасности, и вам не будет отправлено оповещение »."
      })
    ]});
  a.kids;
  return a;
};

module.exports = __privacy_login_tt;
