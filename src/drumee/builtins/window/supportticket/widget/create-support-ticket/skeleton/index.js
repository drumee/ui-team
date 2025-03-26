// ================================================================== *
//   Copyright Xialia.com  2011-2021
//   FILE : window/bigchat/widget/create-support-ticket/skeleton/index.coffee
//   TYPE : Skeleton
// ===================================================================**/

// ===========================================================
//
// ===========================================================
const _add_radio_item = function(_ui_, source, label, value) {
  const ticketFig = _ui_.fig.family;

  const radioId = source;
  
  const r = Skeletons.Box.X({
    className : `${ticketFig}__item ${source}`,
    radio     : radioId,
    value,
    formItem  : source,
    kidsOpt   : {
      active    : 0
    },
    kids      : [
      Skeletons.Button.Svg({
        className   : `${ticketFig}__icon radio-icon`,
        ico         : 'raw-radio-unchecked'
      }),
      
      Skeletons.Note({
        className   : `${ticketFig}__note item`,
        content     : label
      })
    ]});

  return r;
};

// ===========================================================
//
// ===========================================================
const __skl_create_supportTicket = function(_ui_) {
  const ticketFig = _ui_.fig.family;

  const title = Skeletons.Note({
    className : `${ticketFig}__note title`,
    content   : LOCALE.THANKS_FOR_YOUR_BUG_REPORT
  });

  const category = Skeletons.Box.Y({
    className : `${ticketFig}__option category`,
    kids      : [
      Skeletons.Note({
        className : `${ticketFig}__note sub-title`,
        content   : LOCALE.CATEGORY
      }),
      
      Skeletons.Box.Y({
        className : `${ticketFig}__items-wrapper category`,
        kids      : [
          _add_radio_item(_ui_, _a.category, LOCALE.TECH_BUG, 'tech'),
          _add_radio_item(_ui_, _a.category, LOCALE.DESIGN_BUG, 'design'),
          _add_radio_item(_ui_, _a.category, LOCALE.COULDN_T_UNDERSTAND, 'notunderstand'),
          _add_radio_item(_ui_, _a.category, LOCALE.ENHANCEMENT, 'enhancement')
        ]})
    ]});

  const allTheTime = Skeletons.Box.Y({
    className : `${ticketFig}__option alltime`,
    kids      : [
      Skeletons.Note({
        className : `${ticketFig}__note sub-title`,
        content   : LOCALE.ALL_THE_TIME
      }),
      
      Skeletons.Box.Y({
        className : `${ticketFig}__items-wrapper alltime`,
        kids      : [
          _add_radio_item(_ui_, 'alltime', LOCALE.YES, _a.yes),
          _add_radio_item(_ui_, 'alltime', LOCALE.NO, _a.no)
        ]})
    ]});

  const type =  Skeletons.Box.Y({
    className : `${ticketFig}__option type`,
    kids      : [
      Skeletons.Note({
        className : `${ticketFig}__note sub-title`,
        content   : LOCALE.WHERE
      }),
      
      Skeletons.Box.Y({
        className : `${ticketFig}__items-wrapper type`,
        kids      : [
          _add_radio_item(_ui_, 'where', LOCALE.SUPPORT_DRUMEE_DESKTOP, 'desktop'),
          _add_radio_item(_ui_, 'where', LOCALE.CHAT_VIDEO, 'chat'),
          _add_radio_item(_ui_, 'where', LOCALE.CONTACT_MANAGER, 'contactmanager'),
          _add_radio_item(_ui_, 'where', LOCALE.TEAM_ROOM, 'teamroom'),
          _add_radio_item(_ui_, 'where', LOCALE.SHARE_BOX, 'sharebox'),
          _add_radio_item(_ui_, 'where', LOCALE.PROFILE, 'profile'),
          _add_radio_item(_ui_, 'where', LOCALE.EXTERNAL_MEETING, 'externalmeeting'),
          _add_radio_item(_ui_, 'where', LOCALE.OTHERS, 'others')
        ]})
    ]});

  const a = Skeletons.Box.Y({
    className  : `${ticketFig}__main`,
    debug      : __filename,
    kids       : [
      Skeletons.Box.Y({
        className  : `${ticketFig}__container`,
        kids : [
          title,

          Skeletons.Box.X({
            className : `${ticketFig}__content`,
            kids      : [
              Skeletons.Box.Y({
                className : `${ticketFig}__options-wrapper left`,
                kids      : [
                  category,
                  allTheTime
                ]}),
              
              Skeletons.Box.Y({
                className : `${ticketFig}__options-wrapper right`,
                kids      : [
                  type
                ]})
            ]})
        ]})
    ]});

  return a;
};

module.exports = __skl_create_supportTicket;