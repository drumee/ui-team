// ================================================================== *
//   Copyright Xialia.com  2011-2021
//   FILE : /src/drumee/builtins/player/audio/skeleton/index.js
//   TYPE : Skeleton
// ===================================================================**/

function __skl_player_audio(_ui_) {
  const audioFig = `${_ui_.fig.family}`;
  const audioGroup = `${_ui_.fig.group}`;

  const header = Skeletons.Box.X({
    className : `${audioFig}__header ${audioGroup}__header`,
    sys_pn    : _a.header,
    kids      : [
      require('./topbar').default(_ui_)
    ]
  })

  const metadata = Skeletons.Box.Y({
    className : `${audioFig}__wrapper metadata`,
    sys_pn    : 'music-metadata',
    kids      : [
      require('./metadata').default(_ui_)
    ]
  })

  const player = Skeletons.Box.X({
    className : `${audioFig}__wrapper player`,
    kids      : [
      Skeletons.Box.X({
        className : `${audioFig}__audio player`,
        tagName   : _a.audio,
        sys_pn    : _a.audio,
        attrOpt   : {
          controls      : '',
          controlsList  : 'nodownload'
        },
        kids      : [
          Skeletons.Element({
            tagName   : _a.source,
            className : `${audioFig}__audio source`,
            sys_pn    : 'audio-src',
            type      : _ui_.mget(_a.mimetype),
            preload   : _a.auto,
            attrOpt   : {
              src   : _ui_._url()
            }
          })
        ]
      })
    ]
  });

  const body = Skeletons.Box.Y({
    className : `${audioFig}__content ${audioGroup}__content u-ai-center`,
    sys_pn    : _a.content,
    kids      : [
      metadata,
      player
    ]
  });
  
  const prev = Skeletons.Box.X({
    className : `${audioFig}__control item prev`,
    kids      : [
      Skeletons.Button.Svg({
        ico       : 'desktop_musicback',
        className : `${audioFig}__icon prev`,
        sys_pn    : _a.prev,
        service   : _a.prev,
        uiHandler : _ui_
      })
    ]
  })

  const next = Skeletons.Box.X({
    className : `${audioFig}__control item next`,
    kids      : [
      Skeletons.Button.Svg({
        ico       : 'desktop_musicfurther',
        className : `${audioFig}__icon next`,
        sys_pn    : _a.next,
        service   : _a.next,
        uiHandler : _ui_
      })
    ]
  })

  const loop = Skeletons.Box.X({
    className : `${audioFig}__control item loop`,
    kids      : [
      Skeletons.Button.Svg({
        ico       : 'drumee-play',
        className : `${audioFig}__icon loop`,
        sys_pn    : 'music-loop',
        service   : 'loop',
        uiHandler : _ui_,
        dataset   : { active : _a.off }
      })
    ]
  })

  const customControls = Skeletons.Box.X({
    className : `${audioFig}__controls-wrapper`,
    kids      : [
      prev,
      next,
      loop
    ]
  })

  const footer = Skeletons.Box.X({
    className : `${audioFig}__footer`,
    sys_pn    : _a.footer,
    kids      : [
      customControls
    ]
  })

  const a = Skeletons.Box.Y({
    debug      : __filename,
    className  : `${audioFig}__main ${audioGroup}__main audio-player`,
    uiHandler  : _ui_,
    kids       : [
      header,
      body,
      footer
    ]
  });

  return a;
};

export default __skl_player_audio;
