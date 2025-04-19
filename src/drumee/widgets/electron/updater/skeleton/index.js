// ==================================================================== *
// Copyright Xialia.com  2011-2021
// FILE : 
// TYPE : Skelton
// ==================================================================== *



const __welcome_default = function (_ui_) {
  const __heading = Skeletons.Note({
    className: `${_ui_.fig.family}__heading title`,
    content: LOCALE.CHECKING_FOR_UPDATE
  });

  const __message = Skeletons.Box.Y({
    className: `${_ui_.fig.family}__message container`,
    kids: [
      Skeletons.Note({
        className: `${_ui_.fig.family}__message-info info`,
        sys_pn: "info-data",
        content: `${LOCALE.PROCESSING}...`
      }),
      Skeletons.Note({
        className: `${_ui_.fig.family}__message-sub-info sub-info`,
        sys_pn: "sub-info",
        content: ""
      }),
      Skeletons.Box.X({
        className: `${_ui_.fig.family}__progress-container`,
        kids: [
          Skeletons.Note({
            className: `${_ui_.fig.family}__progress-bar`,
            sys_pn: "progress-bar",
            content: ""
          })
        ]
      })
    ]
  });


  const __button = Skeletons.Note({
    className: `${_ui_.fig.family}__action button`,
    sys_pn: "button",
    dataset: {
      state: 0
    },
  });

  return Skeletons.Box.Y({
    debug: __filename,
    className: `${_ui_.fig.family}__main`,
    kids: [__heading, __message, __button]
  });
};

module.exports = __welcome_default;
