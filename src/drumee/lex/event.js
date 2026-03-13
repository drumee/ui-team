
module.exports = {
  after: {
    initialize: 'after:initialize'
  },
  also: {
    click: 'also:click'
  },
  eod: 'end:of:data',
  errorEvent: 'error:event',
  kidsReady: 'kids:ready',
  radio: {
    reset: 'radio:reset',
    set: 'radio:set',
    toggle: 'radio:toggle'
  },
  showTrash: 'show:trash',
  ui: {
    callback: 'ui:callback',
    event: 'ui:event',
    click: 'click'
  },
  wrongArea: 'wrong:area',
  websocketReady: 'websocketready',
  model: {
    initialized: 'model:initialized',
    error: 'model:error',
    update: 'model:update'
  },
  item: {
    add: 'item:add',
    click: 'item:click',
    drop: 'item:drop',
    leave: 'item:leave',
    loaded: 'item:loaded',
    over: 'item:over',
    update: 'item:update',
    background: 'item:background'
  },
  pipe: {
    start: 'pipe:start',
    end: 'pipe:end',
    invalidData: 'pipe:invalid:data',
    succeeded: 'pipe:succeeded',
    error: 'pipe:error',
    failed: 'pipe:failed',
    aborted: 'pipe:aborted'
  },
  document: {
    click: 'document:click'
  },
  part: {
    ready: 'part:ready'
  },
  spinner: {
    start: 'spinner:start',
    stop: 'spinner:stop'
  }
};

