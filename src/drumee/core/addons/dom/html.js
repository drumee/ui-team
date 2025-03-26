
const _id_tag    = "widget-";
const _sheet_tag = "pseudo-sheet--";
const _propsList = [_a.before, _a.after, _a.hover];

/** removePseudoStyle
 * @param [String] pseudo name of pseudo element
 * @option [String] id
*/
HTMLElement.prototype.removePseudoStyle = function(pseudo){
  let _sheetId;
  const id = this.getAttribute(_a.id);
  if ((id == null)) {
    return;
  }
  if (pseudo != null) {
    try {
      _sheetId = `${_sheet_tag}-${pseudo}-${id}`;
      return document.getElementById(_sheetId).remove();
    } catch (error) {}
  } else {
    return Array.from(_propsList).map((p) =>
      (() => { try {
        _sheetId = `${_sheet_tag}-${p}-${id}`;
        return document.getElementById(_sheetId).remove();
      } catch (error1) {} })());
  }
};

/**
 * Add a position style of an html element
 * @param [String] position name of the pseudo element (before|after)
 * @param [Object] props property or list of properties
 * @returns 
 */
HTMLElement.prototype.pseudoStyle = function(position, props){
  let data;
  const id = _.uniqueId(_id_tag);
  this.setAttribute(_a.id, id);
  position = position ||this.dataset.position;
  const _sheetId = `${_sheet_tag}-${position}-${id}`;
  const _head = document.head || document.getElementsByTagName('head')[0];
  let _sheet = document.getElementById(_sheetId);
  if ((_sheet == null)) {
    _sheet = document.createElement(_a.style);
    _sheet.id = _sheetId;
  }
  if (this.dataset.pseudo) {
    try {
      data = JSON.parse(this.dataset.pseudo);
    } catch (error) {}
  }
  const selector =  `#${id}:${position}`;
  let cssText  =  "";
  data = data || {};
  if (_.isString(props)) {
    cssText = props;
  } else if (_.isObject(props)) {
    _.merge(data, props);
  }
  data.content = data.content || '"\\2605"';
  for (let k in data) {
    const v = data[k];
    cssText += `${k}:${v};`;
  }
  if (_.isEmpty(cssText)) {
    return this;
  }
  _sheet.innerHTML =  `${selector}{ ${cssText} }`;
  _head.appendChild(_sheet);
  if (!_.isEmpty(props)) {
    this.setAttribute(_a.data.pseudo, JSON.stringify(data));
    this.setAttribute(_a.data.position, position);
  }
  return this;
};


/**
 * 
 * @returns 
 */
HTMLElement.prototype.hide = function(){
  setTimeout(()=>{
    this.setAttribute(_a.data.state, _a.closed);
  }, 100);
};

/**
 * 
 * @returns 
 */
HTMLElement.prototype.show = function(){
  setTimeout(()=>{
    this.setAttribute(_a.data.state, _a.open);
  }, 100);
};

/**
 * 
 *  @return [Boolean] yes if visible
 */
HTMLElement.prototype.isInViewport = function(){
  const r = this.getBoundingClientRect();
  const top = r.y + window.scrollY;
  const bottom = top + r.height;
  const screen_top = window.scrollY;
  const screen_bottom = screen_top + window.innerHeight;
  const screen_left = window.scrollX;
  const screen_right = screen_left + window.innerWidth;
  const res = (top < screen_bottom) && (bottom > screen_top);
  return res;
};


/**
 * 
 * @param {*} unit 
 * @returns 
 */
HTMLElement.prototype.innerWidth = function(unit){
  const r = window.getComputedStyle(this);
  const border  = (parseInt(r.borderLeftWidth) || 0) + (parseInt(r.borderRightWidth) || 0);
  const padding = (parseInt(r.paddingLeft)     || 0) + (parseInt(r.paddingRight) || 0);
  const w = parseInt(r.width) - padding - border;
  return w;
};

/**
 * 
 * @param {*} unit 
 * @returns 
 */
HTMLElement.prototype.outerWidth = function(unit){
  return parseInt(window.getComputedStyle(this).width);
};

/**
 * 
 * @param {*} unit 
 * @returns 
 */
HTMLElement.prototype.innerHeight = function(unit){
  const r =  window.getComputedStyle(this);
  const border  = (parseInt(r.borderTopWidth) || 0) + (parseInt(r.borderBottomWidth) || 0);
  const padding = (parseInt(r.paddingTop)     || 0) + (parseInt(r.paddingBottom)     || 0);
  const h = parseInt(r.height) - padding - border;
  return h;
};

/**
 * 
 * @param {*} unit 
 * @returns 
 */
HTMLElement.prototype.outerHeight = function(unit){
  return parseInt(window.getComputedStyle(this).height);
};

/**
 * 
 * @param {*} side 
 * @returns 
 */
HTMLElement.prototype.getBorder = function(side){
  const r = window.getComputedStyle(this);
  const left   = (parseInt(r.borderLeftWidth)   || 0); 
  const right  = (parseInt(r.borderRightWidth)  || 0); 
  const top    = (parseInt(r.borderTopWidth)    || 0); 
  const bottom = (parseInt(r.borderBottomWidth) || 0);
  switch (side) {
    case _a.left: 
      return left;
      break;

    case _a.right:  
      return right;
      break;

    case _a.top: 
      return top;
      break;

    case _a.bottom:  
      return bottom;
      break;

    case _a.x: case _a.horizontal:  
      return left + right;  
      break;

    case _a.y: case _a.vertical:  
      return top + bottom;
      break;

    default:
      var a = { 
        top,
        right,
        bottom,
        left
      };
      return a;
  }
  return 0;
};

/**
 * 
 * @param {*} side 
 * @returns 
 */
HTMLElement.prototype.getPadding = function(side){
  const r = window.getComputedStyle(this);
  const left   = (parseInt(r.paddingLeft)   || 0);
  const right  = (parseInt(r.paddingRight)  || 0);
  const top    = (parseInt(r.paddingTop)    || 0);
  const bottom = (parseInt(r.paddingBottom) || 0);
  switch (side) {
    case _a.left: 
      return left;
      break;

    case _a.right:  
      return right;
      break;

    case _a.top: 
      return top;
      break;

    case _a.bottom:  
      return bottom;
      break;

    case _a.x: case _a.horizontal:  
      return left + right;  
      break;

    case _a.y: case _a.vertical:  
      return top + bottom;
      break;

    default:
      var a = { 
        top,
        right,
        bottom,
        left
      };
      return a;
  }
  return 0;
};


/**
 * 
 * @param {*} side 
 * @returns 
 */
HTMLElement.prototype.idleSpace = function(side){
  const r = window.getComputedStyle(this);
  const left   = (parseInt(r.borderLeftWidth)   || 0) + (parseInt(r.paddingLeft)   || 0);
  const right  = (parseInt(r.borderRightWidth)  || 0) + (parseInt(r.paddingRight)  || 0);
  const top    = (parseInt(r.borderTopWidth)    || 0) + (parseInt(r.paddingTop)    || 0);
  const bottom = (parseInt(r.borderBottomWidth) || 0) + (parseInt(r.paddingBottom) || 0);
  switch (side) {
    case _a.left: 
      return left;
      break;

    case _a.right:  
      return right;
      break;

    case _a.top: 
      return top;
      break;

    case _a.bottom:  
      return bottom;
      break;

    case _a.x: case _a.horizontal:  
      return left + right;  
      break;

    case _a.y: case _a.vertical:  
      return top + bottom;
      break;

    default:
      var a = { 
        top,
        right,
        bottom,
        left
      };
      return a;
  }
  return 0;
};


/**
 * 
 * @param {*} e 
 * @returns 
 */
HTMLElement.prototype.getService = function(e){
  e.stopImmediatePropagation();
  e.stopPropagation();
  const {
    target
  } = e;
  const {
    service
  } = target.dataset;
  if (target === this) { 
    return service; 
  }

  let p = target.parentNode;
  while (p != null) {
    if ((p.dataset != null ? p.dataset.service : undefined) != null) {
      return p.dataset.service;
    }
    p = p.parentNode;
  }
  return service;
};
