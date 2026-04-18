const __notifier_chat_p2p = function (_ui_) {
  const value = _ui_.mget('notificationCount') || 0;
  const state = value ? _a.open : _a.closed;

  const counter = {
    debug: __filename,
    service: 'counter',
    sys_pn: 'counter',
    className: `${_ui_.fig.family}__digit`,
    innerClass: `${_ui_.fig.group}__btn-counter`,
    content: `${value}`,
    dataset: { state }
  };

  return [Skeletons.Note(counter)];
};

export default __notifier_chat_p2p;
