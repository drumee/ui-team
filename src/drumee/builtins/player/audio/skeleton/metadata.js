// ================================================================== *
//   Copyright Xialia.com  2011-2021
//   FILE : /src/drumee/builtins/player/audio/skeleton/metadata.js
//   TYPE : Skeleton
// ===================================================================**/

// ===========================================================
//
// ===========================================================
function __skl_player_audio_metadata (_ui_) {
  const metadataFig = `${_ui_.fig.family}-metadata`;

  const data = _ui_.info;
  const trackName = data.common.title || data.stats.filename
  const artistName = data.common.artist || '';

  let cover = Skeletons.Button.Svg({
    ico       : 'desktop_musicfile',
    className : `${metadataFig}__icon music-icon`,
  });

  if (data.cover) {
    cover = Skeletons.Image.Smart({
      className : `${metadataFig}__icon music-cover`,
      low       : data.cover,
      high      : data.cover
    })
  }

  const coverWrapper = Skeletons.Box.X({
    className : `${metadataFig}__cover`,
    kids      : [
      cover
    ]
  })

  const musicInfo = Skeletons.Box.Y({
    className : `${metadataFig}__music-info`,
    kids      : [
      Skeletons.Note({
        className : `${metadataFig}__note name`,
        sys_pn    : 'track-name',
        content   : trackName
      }),
      
      Skeletons.Note({
        className : `${metadataFig}__note artist-name`,
        sys_pn    : 'track-artist',
        content   : artistName
      })
    ]
  })

  let a = Skeletons.Box.X({
    className : `${metadataFig}__main`,
    sys_pn    : 'audio-metadata',
    kids      : [
      Skeletons.Box.Y({
        className : `${metadataFig}__info-wrapper`,
        kids      : [
          coverWrapper,
          musicInfo
        ]
      })
    ]
  });

  return a;
}

export default __skl_player_audio_metadata;