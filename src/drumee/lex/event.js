// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : ../src/drumee/lex/event
//   TYPE :
// ==================================================================== *

const a = {
  abort            : 'abort',
  access           : 'access',
  add              : 'add',
  after            : {
    initialize     : 'after:initialize'
  },
  animCompleted    : 'anim:completed',
  answer           : 'answer',
  applyStyle       : 'applyStyle',
  also             : {
    click          : 'also:click'
  },
  attach           : 'attach',
  blur             : 'blur',
  bubble           : 'bubble',
  callback         : 'callback',
  cancel           : 'cancel',
  caption          : 'caption',
  change           : 'change',
  channel          : 'channel',
  chat             : 'chat',
  check            : 'check',
  clear            : 'clear',
  click            : 'click',
  close            : 'close',
  closeTab         : 'close-tab', 
  closePopup       : 'close-popup',
  comment          : 'comment',
  commit           : 'commit',
  confirm          : 'confirm',
  connect          : 'connect',
  contextmenu      : 'contextmenu',
  cook             : 'cook',
  copy             : 'copy',
  copyStyle        : 'copyStyle',
  create           : 'create',
  cut              : 'cut',
  data             : 'data',
  dblclick         : 'dblclick',
  delete           : 'delete',
  deleted          : 'deleted',
  destroy          : 'destroy',
  disable          : 'disable',
  dispatch         : 'dispatch',
  download         : 'download',
  done             : 'done',
  drag             : 'drag',
  dragend          : 'dragend',
  dragenter        : 'dragenter',
  dragleave        : 'dragleave',
  dragover         : 'dragover',
  dragstart        : 'dragstart',
  drop             : 'drop',
  duplicate        : 'duplicate',
  dynamicBox       : 'dynamic:box',
  edit             : 'edit',
  editLink         : 'edit:link',
  enable           : 'enable',
  end              : 'end',
  enter            : 'enter',
  Enter            : 'Enter',
  eod              : 'end:of:data',
  error            : 'error',
  errorEvent       : 'error:event',
  escape           : 'escape',
  event            : 'event',
  Escape           : 'Escape',
  filter           : 'filter',
  flyover          : 'flyover',
  focus            : 'focus',
  formatText       : 'formatText',
  found            : 'found',
  goodbye          : 'goodbye',
  handshake        : 'handshake',
  hello            : 'hello',
  history          : 'history',
  hold             : 'hold',
  hover            : 'hover',
  ignore           : 'ignore',
  info             : 'info',
  interactive      : 'interactive',
  initialized      : 'initialized',
  // justify:
  //   content        : 'justify-content'
  keydown          : 'keydown',
  keyup            : 'keyup',
  kidsReady        : 'kids:ready',
  kill             : 'kill',
  lang             : 'lang',
  layer            : 'layer',
  leave            : 'leave',
  list             : 'list',
  listenTo         : 'listen-to',
  launch           : 'launch',
  load             : 'load',
  loaded           : 'loaded',
  loader           : 'loader',
  loadend          : 'loadend',
  loading          : 'loading',
  loadstart        : 'loadstart',
  lock             : 'lock',
  logout           : 'logout',
  maximize         : 'maximize',
  media            : 'media',
  minimize         : 'minimize',
  mkdir            : 'mkdir',
  mode             : 'mode',
  more             : 'more',
  mousedown        : 'mousedown',
  mouseenter       : 'mouseenter',
  mouseleave       : 'mouseleave',
  mousemove        : 'mousemove',
  mouseout         : 'mouseout',
  mouseover        : 'mouseover',
  mouseup          : 'mouseup',
  mousewheel       : 'mousewheel',
  move             : 'move',
//  mutex            : 'mutex'
  myaccount        : "myaccount",
  multiSelect      : "multi:select",
  mysites          : "mysites",
  newline          : "newline",
  objectClick      : 'object:click',
  on_cancel        : 'on_cancel',
  on_enter         : 'on_enter',
  on_error         : 'on_error',
  online           : 'online',
  open             : 'open',
  open_modal       : 'open:modal',
  open_node        : 'open-node',
  open_tab         : 'open:tab',
  openTab          : 'open:tab',
  // open             :
  //   node           : 'open-node'
  //   modal          : 'open:modal'
  //   tab            : 'open:tab'
  offline          : 'offline',
  over             : 'over',
  overlap          : {
    align          : "overlap:align",
    init           : "overlap:init",
    reset          : "overlap:reset",
    seek           : "overlap:seek",
    section        : "overlap:section",
    select         : "overlap:select"
  },
  panelEvent       : 'panel:event',
  paste            : 'paste',
  pathUpdate       : 'pathUpdate',
  play             : 'play',
  popup            : 'popup',
  preview          : 'preview',
  progress         : 'progress',
  publicAccess     : 'public:access',
  radio            : {
    reset          : 'radio:reset',
    set            : 'radio:set',
    toggle         : 'radio:toggle'
  },
  raise            : 'raise',
  resize           : 'resize',
  ready            : 'ready',
  redo             : 'redo',
  refresh          : 'refresh',
  reject           : 'reject',
  release          : 'release',
  rename           : 'rename',
  reselect         : 'reselect',
  remove           : 'remove',
  removeChild      : 'remove:child',
  render           : 'render',
  reorder          : 'reorder',
  reply            : 'reply',
  reset            : 'reset',
  resetInteract    : 'reset:interact',
  responsive       : 'responsive',
  restart          : 'restart',
  restore          : 'restore',
  retrieve         : 'retrieve',
  reverse          : 'reverse',
  ring             : 'ring',
  root             : 'root',
  rotate           : 'rotate',
  rotateLeft       : 'rotate:left',
  rotateRight      : 'rotate:right',
  route            : 'route',
  rpc              : {
    call           : 'rpc:call',
    post           : 'rpc:post',
    read           : 'rpc:read',
    return         : 'rpc:return',
    slurp          : 'rpc:slurp',
    fetch          : 'rpc:fetch'
  },
  save             : 'save',
  saveAs           : 'save:as',
  scroll           : 'scroll',
  search           : 'search',
  select           : 'select',
  send             : 'send',
  service          : {
    end            : 'service:end',
    fetch          : 'service:fetch',
    post           : 'service:post',
    read           : 'service:read'
  },
  set              : 'set',
  setAttribute     : 'setAttribute',
  setProfile       : 'set:profile',
  setStyle         : 'setstyle',
  settings         : 'settings',
  share            : 'share',
  shift            : 'shift',
  show             : 'show',
  showTrash        : 'show:trash',
  shown            : 'shown',
  slide            : 'slide',
  slideStart       : "slide:end",
  slideEnd         : "slide:end",
  slideshow        : 'slideshow',
  snapshot         : 'snapshot',
  socket           : {
    end            : 'socket:end',
    start          : 'socket:start',
    error          : 'socket:error',
    succeeded      : 'socket:succeeded'
  },
  sort             : 'sort',
  spawn            : 'spawn',
  start            : 'start',
  started          : 'started',
  stats            : 'statistics',
  stop             : 'stop',
  submit           : 'submit',
  success          : 'success',
  swap             : 'swap',
  sync             : 'sync',
  timeout          : 'timeout',
  toggle           : 'toggle',
  toolbox          : 'toolbox',
  tooltips         : 'tooltips',
  transfert        : 'transfert',
  transform        : 'transform',
  transmit         : 'transmit',
  trash            : 'trash',
  ui               : {
    callback       : 'ui:callback',
    event          : 'ui:event',
    click          : 'click'
  },
  undo             : 'undo',
  unlock           : 'unlock',
  unselect         : 'unselect',
  update           : 'update',
  updir            : 'updir',
  upload           : 'upload',
  uploaded         : 'uploaded',
  unpublish        : 'unpublish',
  //userClass        : 'user:class'
  validate         : 'validate',
  view             : 'view',
  warn             : 'warn',
  watch            : 'watch',
  wake             : 'wake',
  websocketReady   : 'websocketready',
  welcome          : 'welcome',
  wrongArea        : 'wrong:area',
//  admin              :
//    refresh          : 'admin:refresh'
//    user             :
//      add            : 'admin:user:add'
//    hub              :
//      add            : 'admin:hub:add'
//    huber            :
//      add            : 'admin:huber:add'
//      disable        : 'admin:huber:disable'
//    hubers           :
//      list           : 'admin:hubers:list'
  counter            : {
    set              : 'counter:set'
  },
  forward            : {
    event            : 'forward:event'
  },
  model              : {
    initialized      : 'model:initialized',
    error            : 'model:error',
    update           : 'model:update'
  },
  keypress           : {
    enter            : 'keypress:enter',
    escape           : 'keypress:escape',
    down             : 'keypress:down',
    up               : 'keypress:up',
    arrow            : {
      left           : 'arrow:left',
      up             : 'arrow:up',
      right          : 'arrow:right',
      down           : 'arrow:down'
    }
  },
  item               : {
    add              : 'item:add',
    click            : 'item:click',
    drop             : 'item:drop',
    leave            : 'item:leave',
    loaded           : 'item:loaded',
    over             : 'item:over',
    update           : 'item:update',
    background       : 'item:background'
  },
  pipe               : {
    start            : 'pipe:start',
    end              : 'pipe:end',
    invalidData      : 'pipe:invalid:data',
    succeeded        : 'pipe:succeeded',
    error            : 'pipe:error',
    failed           : 'pipe:failed',
    aborted          : 'pipe:aborted'
  },
  validator          : {
    accept           : 'validator:accept',
    clear            : 'validator:clear',
    reset            : 'validator:reset',
    reject           : 'validator:reject',
    endorse          : 'validator:endorse'
  },
  status             : {
    start            : 'start',
    end              : 'end',
    succeeded        : 'succeeded',
    failed           : 'failed'
  },
  document           : {
    click            : 'document:click'
  },
  module             : {
    click            : 'module:click'
  },
  input              : {
    drop             : 'input:drop',
    error            : 'input:error',
    update           : 'input:update',
    reset            : 'input:reset'
  },
  form               : {
    succeeded        : 'form:succeeded',
    failed           : 'form:failed',
    aborted          : 'form:aborted',
    click            : 'form:click'
  },
  parent             : {
    change           : 'parent:change',
    initialized      : 'parent:initialized',
    ready            : 'parent:ready',
    resized          : 'parent:resized'
  },
  part               : {
    ready            : 'part:ready'
  },
  helper             : {
    drag             : 'helper:drag',
    drop             : 'helper:drop'
  },
  spinner            : {
    start            : 'spinner:start',
    stop             : 'spinner:stop'
  }
};
module.exports = a;
