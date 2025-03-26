const { colorFromName } = require("core/utils");
const __litechat_message = function(_ui_) {
  const chatItemFig = _ui_.fig.family;
  const menu = '';
  const metadata = _ui_.mget('metadata');
  

  const author      = _ui_.mget(_a.author) || _a.other;
  let userProfile = '';
  const threadMsg   = '';
  let userName    = '';
  let date        = '';
  let attachment  = '';
  const firstname   = _ui_.mget(_a.firstname);
  const lastname    = _ui_.mget(_a.lastname);
  const surname     = _ui_.mget(_a.surname);
  const username     = _ui_.mget('username');
  const fullname    = _ui_.mget(_a.fullname) || surname || username || (firstname + ' ' + lastname);

  if (author !== 'me') {
    userProfile = Skeletons.UserProfile({
      className   : `${chatItemFig}__profile ${author}`,
      id          : _ui_.mget(_a.uid),
      firstname,
      lastname,
      fullname
    });

    userName    = Skeletons.Note({
      className   : `${chatItemFig}__name ${author}`,
      content     : fullname || surname || username,
      styleOpt    : {
        color   : colorFromName(fullname)
      }
    });
  }

  const checkBox = Skeletons.Button.Svg({
    className   : `${chatItemFig}__icon checkbox ${author}`,
    icons       : ["editbox_shapes-roundsquare", "available"],//["box-tags", "backoffice_checkboxfill"]
    sys_pn      : 'message-item-checkbox',
    state       : 0,
    formItem    : 'messageId',
    value       : _ui_.mget('message_id'),
    service     : 'trigger-message-selector',
    uiHandler   : _ui_
  });
  
  if (_ui_.showDateOfDay()) {
    date = Skeletons.Note({
      className   : `${chatItemFig}__dategroup ${author}`,
      content     : Dayjs.unix(_ui_.mget(_a.ctime)).locale(Visitor.language()).format("DD MMMM")
    });
  }

  const messageContent = Autolinker.link(_ui_.mget(_a.message));


  const message = require('./message')(_ui_);
  
  const messageDate = Skeletons.Note({
    className     : `${chatItemFig}__date ${author}`,
    content       : Dayjs.unix(_ui_.mget(_a.ctime)).locale(Visitor.language()).format("HH:mm")
  });

  if (_ui_.mget('is_attachment')) {
    attachment = Skeletons.Wrapper.X({
      className : `${chatItemFig}__attachment-wrapper ${author}`,
      kids: [
        Skeletons.List.Smart({
          sys_pn      : _a.list,
          flow        : _a.none,
          axis        : _a.x,
          timer       : 50,
          className   : `${chatItemFig}__attachment-wrapper-list`,
          uiHandler   : _ui_,
          itemsOpt   : {
            kind     : 'media_grid',
            isAttachment: 1,
            origin   : _a.chat
          },
          vendorOpt  : Preset.List.Orange_e,
          api        : _ui_.getAttachments
        })
      ]});
  }
  

  const messageRow = Skeletons.Box.Y({
    className     : `${chatItemFig}__message-row ${author}`,
    kids          : [
      date,
      Skeletons.Box.X({
        className     : `${chatItemFig}__message-group ${author}`,
        kids          : [
          userProfile,
          
          Skeletons.Box.Y({
            className     : `${chatItemFig}__message-wrapper ${author}`,
            sys_pn        : 'message-item-wrapper',
            dataset       : {
              active         : _a.no
            },
            kids          : [
              userName,
              attachment,
              message,
              Skeletons.Box.X({
                className     : `${chatItemFig}__message-footer ${author}`,
                kids          : [
                  messageDate
                ]})
            ]}),
          
          Skeletons.Box.X({
            className   : `${chatItemFig}__message-selector-wrapper selector-wrapper ${author}`,
            kids        : [
              checkBox
            ]})
        ]})
    ]});

  const a = Skeletons.Box.Y({
    className  : `${chatItemFig}__main`,
    debug      : __filename,
    kids       : [
      Skeletons.Box.X({
        className  : `${chatItemFig}__container`,
        kids : [
          messageRow
        ]})
    ]});

  return a;
};
module.exports = __litechat_message;
