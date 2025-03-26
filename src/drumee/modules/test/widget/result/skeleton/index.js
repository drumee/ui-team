// ================================================================== *
//   Copyright Xialia.com  2011-2021
//   FILE : /home/somanos/devel/ui/src/drumee/modules/test/widget/result/skeleton/index.coffee
//   TYPE : Skelton
// ===================================================================**/

// ===========================================================
//
// ===========================================================
const __skl_test_result = function(_ui_) {
  const a = Skeletons.Box.X({
    className  : `${_ui_.fig.family}__main`,
    debug      : __filename,
    service    : _ui_.mget('service_test'),    
    kids       : [
      Skeletons.Note({
        active     : 0,
        className  : `${_ui_.fig.family}__service`,
        content    : _ui_.mget(_a.service),
        dataset    : { 
          status   : _ui_.mget(_a.status)
        }
      }),
      Skeletons.Box.Y({
        active     : 0,
        sys_pn : "details",
        className  : `${_ui_.fig.family}__details`,
        kids:[
          Skeletons.Note({
            className  : `${_ui_.fig.family}__status`,
            content    : _ui_.mget('reason') || _ui_.mget('error'), 
            active     : 0,
            dataset    : { 
              status   : _ui_.mget(_a.status)
            }
          })
        ]
      })
    ]});

  return a;
};
module.exports = __skl_test_result;