/*
 * decaffeinate suggestions:
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : __dbg_path
//   label   :
// ==================================================================== *
let _log_details;
const _row = (_log_details = function(_ui_, _content, label) {

  const a = Skeletons.Box.X({
    className : `${_ui_.fig.family}__log--row`, 
    kids      : [
      Skeletons.Note({
        className : `${_ui_.fig.family}__log--name`,
        content   : label
      }),
      
      Skeletons.Note({
        className : `${_ui_.fig.family}__log--value`,
        content   : _content
      })
    ]});

  return a;
});

// -----------------------------------------
_log_details = function(_ui_, offset) {
  
  const {
    logData
  } = _ui_;

  const logDate = Dayjs.unix(logData.intime).locale(Visitor.language()).format("DD/MM/YYYY");
  const logInTime = Dayjs.unix(logData.intime).locale(Visitor.language()).format("HH[h] MM");
  // logOutTime = Dayjs.unix(logData.outtime).locale(Visitor.language()).format("HH[h] MM")
  const logTerminal = 'NA';
  const logBroswer = (logData.device != null ? logData.device.family : undefined) || 'NA';
  const logIp = logData.ip || 'NA';
  const logCountry = logData.city || 'NA';
  const logDuration = 'NA';

  const a = Skeletons.Box.Y({
    className : `${_ui_.fig.family}__log--details`,
    style     : {
      top   : offset
    },
    kids      : [
      Skeletons.Button.Svg({
        ico         : 'account_cross',
        className   : `${_ui_.fig.family}__icon close account_cross`,
        service     : 'close-log-details',
        uiHandler   : _ui_
      }),
      
      _row(_ui_, logDate, LOCALE.DATE),
      _row(_ui_, logInTime, LOCALE.HOURS),
      _row(_ui_, logTerminal, LOCALE.TERMINAL),
      _row(_ui_, logBroswer, LOCALE.BROWSER),
      _row(_ui_, logIp, LOCALE.IP_ADDRESS),
      _row(_ui_, logCountry, LOCALE.COUNTRY),
      _row(_ui_, logDuration, LOCALE.DURATION)
    ]}); 
  
  return a;
};

module.exports = _log_details;
