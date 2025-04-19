// ==================================================================== *
//   Copyright Xialia.com  2011-2021
//   FILE : src/drumee/builtins/desk/skeleton/common/topbar/settings
//   TYPE : Skeleton
// ==================================================================== *


module.exports = function (_ui_, button) {
  const a = {
    applyChange: button({
      label: LOCALE.ACCEPT,
    }),
    disableSync: button({
      label: LOCALE.DESYNC_FILE_FOLDER,
    }),
    enableSync: button({
      label: LOCALE.ENABLE_SYNC,
    }),
    removeFromCloud: button({
      label: LOCALE.REMOVE_FROM_CLOUD,
    }),
    reverLocalCreated: button({ // Save cloud file changes into local (local created)
      label: LOCALE.REVERT_CREATE,
    }),
    revertToCloudContent: button({ // Save cloud file changes into local (local changed)
      label: LOCALE.REVERT_CHANGE,
    }),
    revertToCloudEntity: button({ // Sync existing cloud entity into local (local deleted)
      label: LOCALE.REVERT_DELETE,
    }),
    revertToCloudLocation: button({ // Sync cloud entity path into local (local moved)
      label: LOCALE.REVERT_MOVE,
    }),
    revertToCloudName: button({ // Sync cloud entity name into local (local renamed)
      label: LOCALE.REVERT_RENAME,
    }),
    revertToLocalContent: button({ // Save local file changes into cloud (cloud changed)
      label: LOCALE.REVERT_CHANGE,
    }),
    revertToLocalEntity: button({ // Sync existing local entity into cloud (cloud deleted)
      label: LOCALE.REVERT_DELETE,
    }),
    revertToLocalLocation: button({ // Sync local entity path into cloud (local moved)
      label: LOCALE.REVERT_MOVE,
    }),
    revertToLocalName: button({ // Sync local entity name into cloud (local renamed)
      label: LOCALE.REVERT_RENAME,
    }),
    seeLocalEntity: button({
      label: LOCALE.SEE_LOCAL_VERSION,
    }),
    seeCloudEntity: button({
      label: LOCALE.SEE_CLOUD_VERSION,
    }),
  };
  for(var k in a){
    if(!a[k].service) a[k].service = k;
  }
  return a;
}