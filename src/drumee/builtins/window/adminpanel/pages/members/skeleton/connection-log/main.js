// ================================================================== *
//   Copyright Xialia.com  2011-2020
//   FILE : /src/drumee/builtins/window/adminpanel/pages/members/skeleton/connection-log/main.js
//   TYPE : Skeleton
// ===================================================================**/
/// <reference path="../../../../../../../../../@types/index.d.ts" />
import ___members_page from "../..";

/**
 * @param {___members_page} _ui_
 * @param row
*/
function addRow(_ui_, item) {
  const connectionLogFig = `${_ui_.fig.family}-connection-log`;
  const tableFig = `${connectionLogFig}-table`;

  let location = item.city
  if (item.metadata) {
    location = `${item.city}, ${item.metadata.country}`
  }

  return Skeletons.Box.X({
    className: `${tableFig}__item-wrapper row`,
    kids: [
      Skeletons.Note({
        className : `${tableFig}__item data-cell date`,
        content   : Dayjs.unix(item.intime).locale(Visitor.language()).format("DD/MM/YYYY")
      }),

      Skeletons.Note({
        className : `${tableFig}__item data-cell time`,
        content   : Dayjs.unix(item.intime).locale(Visitor.language()).format("HH[h] mm")
      }),

      Skeletons.Note({
        className : `${tableFig}__item data-cell ip-address`,
        content   : item.ip
      }),

      Skeletons.Note({
        className : `${tableFig}__item data-cell location`,
        content   : location,
      }),
    ]
  });
}


/**
 * @param {___members_page} _ui_
*/
function __skl_members_connection_log (_ui_) {
  const connectionLogFig = `${_ui_.fig.family}-connection-log`;
  const data = _ui_.mget(_a.member)

  const closeIcon = Skeletons.Box.X({
    className   : `${connectionLogFig}__close`,
    kids        : [
      Skeletons.Button.Svg({
        ico         : 'account_cross',
        className   : `${connectionLogFig}__icon close account_cross`,
        service     : 'close-overlay',
        uiHandler   : _ui_
      })
    ]
  });

  const header = Skeletons.Box.X({
    className  : `${connectionLogFig}__header`,
    kids: [
      Skeletons.Note({
        className  : `${connectionLogFig}__note header`,
        content    : LOCALE.CONNECTION_LOG_HISTORY
      }),

      closeIcon
    ]
  })

  const tableFig = `${connectionLogFig}-table`

  const tableHeader = Skeletons.Box.X({
    className  : `${tableFig}__item-wrapper row header`,
    kids: [
      Skeletons.Note({
        className : `${tableFig}__item data-cell header date`,
        content   : LOCALE.DATE
      }),

      Skeletons.Note({
        className : `${tableFig}__item data-cell header time`,
        content   : LOCALE.TIME
      }),

      Skeletons.Note({
        className : `${tableFig}__item data-cell header ip-address`,
        content   : LOCALE.IP_ADDRESS
      }),

      Skeletons.Note({
        className : `${tableFig}__item data-cell header location`,
        content   : LOCALE.LOCATION
      }),
    ]
  })

  let addItemOpt = (ins, item) => addRow(_ui_,item)

  const noContent = Skeletons.Box.X({
    className  : `${tableFig}__item-wrapper row default-content`,
    kids: [
      Skeletons.Note({
        className : `${tableFig}__item default-content`,
        content   : LOCALE.HAVE_NOT_CONNECTED_TO_ORGANISATION
      })
    ]
  })

  const table = Skeletons.Box.Y({
    className  : tableFig,
    kids: [
      tableHeader,
      Skeletons.List.Smart({
        className   : `${tableFig}__item-list`,
        placeholder : noContent,
        spinner     : true,
        timer       : 50,
        sys_pn      : 'list-members',
        itemsOpt    : addItemOpt,
        api         : {
          service : SERVICE.adminpanel.member_loginlog,
          orgid   : _ui_.orgId,
          user_id : data.drumate_id,
          //hub_id  : Visitor.id
        },
      })
    ]
  })
  
  const content = Skeletons.Box.Y({
    className   : `${connectionLogFig}__content`,
    sys_pn      : 'connection-log-content',
    kids        : [
      table
    ]
  });
  
  const a = Skeletons.Box.Y({
    debug       : __filename,
    className   : `${connectionLogFig}__main`,
    kids        : [
      header,
      content
    ]
  });
  
  return a;
};

export default __skl_members_connection_log;
