# ==================================================================== *
#   Copyright Xialia.com  2011-2018
#   FILE : ../src/drumee/behavior/overlappable
#   TYPE : 
# ==================================================================== *

const Rectangle = require('rectangle-node');

# ==================================================================== *
_borders =
  top   :
    dir  : [_a.top, _a.bottom]
  right :
    dir  : [_a.right, _a.left]
  bottom:
    dir  : [_a.top, _a.bottom]
  left  :
    dir  : [_a.right, _a.left]
_propsList = [_a.top, _a.right, _a.bottom, _a.left]
_px  = 'px'
_1px = "1px"
#BORDER_N = '.widget-border.north'
#BORDER_E = '.widget-border.est'
#BORDER_S = '.widget-border.south'
#BORDER_W = '.widget-border.west'
#########################################
#
#
#########################################
class __bhv_overlap extends Marionette.Behavior
# ======================================================
#
# ======================================================

# ===========================================================
# onDomRefresh
#
# @return [Object] 
#
# ===========================================================
  onDomRefresh: () =>
    @options.init  = 1
    @options.reset = 1
    for k,v of @options
      if v
        RADIO_BROADCAST.on _e.overlap[k], @["_#{k}"]
    #if not @options.align
    #  return
    #f =()=>
    #  @_border =
    #    top    : @$el.find(BORDER_N)[0]
    #    right  : @$el.find(BORDER_E)[0]
    #    bottom : @$el.find(BORDER_S)[0]
    #    left   : @$el.find(BORDER_W)[0]
    #this.waitElement @$el, f
# ======================================================
#
# ======================================================

# ===========================================================
# onDestroy
#
# ===========================================================
  onDestroy: () =>
    for k,v of @options
      if v
        RADIO_BROADCAST.off _e.overlap[k], @["_#{k}"]
# ======================================================
#
# ======================================================

# ===========================================================
# _reset
#
# @param [Object] e
# @param [Object] ui
# @param [Object] view
#
# ===========================================================
  _reset: (e, ui, view) =>
    @$el.attr _a.data.overlap, _a.off
#    @el.removePseudoStyle()
#    @view.triggerMethod(_e.multiSelect, _a.off)
# ======================================================
#
# ======================================================

# ===========================================================
# _init
#
# @param [Object] view
#
# ===========================================================
  _init: (view) =>
    #@_width  = @$el.width()
    #@_height = @$el.height()
    @_surface = 1 #@_width + @_height
    @_outerWidth = @$el.outerWidth()
    @_outerHeight = @$el.outerHeight()
    @_offset = @$el.offset()
    @_offset.right  = @_offset.left + @_outerWidth #@_width
    @_offset.bottom = @_offset.top + @_outerHeight #@_height
    @_movingId = view?.cid || 0
    @_box = new Rectangle(@_offset.left, @_offset.top, @_outerWidth, @_outerHeight)
# ======================================================
#
# ======================================================

# ===========================================================
# _overlapped
#
# @param [Object] ui
# @param [Object] opt
#
# @return [Object] 
#
# ===========================================================
  _overlapped: (ui, opt) =>
    #helper_width = ui.helper.width()
    #helper_height = ui.helper.height()
    helper_width  = ui.helper.outerWidth() #@ui_width
    helper_height = ui.helper.outerHeight() #@ui_height
    ui.offset.right = ui.offset.left + helper_width
    ui.offset.bottom = ui.offset.top + helper_height
    return @_box.overlaps(ui.offset.left - opt.width, ui.offset.top - opt.height, helper_width, helper_height)
# ======================================================
#
# ======================================================

# ===========================================================
# _seek
#
# @param [Object] e
# @param [Object] ui
# @param [Object] opt
# @param [Object] view
#
# @return [Object] 
#
# ===========================================================
  _seek: (e, ui, opt, view) =>
    #@debug "KKJJSJSJS", @view
    if @_movingId is @view.cid or @_movingId is @view.parent.cid or @$el.data(_a.state) is _a.closed
      return no
    if  @_overlapped(ui, opt)
      @view.$el.attr(_a.data.overlap, _a.on)
    else
      @view.$el.attr(_a.data.overlap, _a.off)
module.exports = __bhv_overlap
#-- # ======================================================
#-- #
#-- # ======================================================

# ===========================================================
# #--   _align
#
# @param [Object] e
# @param [Object] ui
# @param [Object] opt
# @param [Object] view
#
# @return [Object] 
#
# ===========================================================
#--   _align: (e, ui, opt, view) =>
#--     if @_movingId is @view.cid or @_movingId is @view.parent.cid or @$el.data(_a.state) is _a.closed
#--       return no
#--
#--     ui.offset.right = ui.offset.left + ui.helper.outerWidth()
#--     ui.offset.bottom = ui.offset.top + ui.helper.outerHeight()
#--     @_found = {}
#--     for k,v of _borders
#--       for i in v.dir
#--         d = Math.abs(@_offset[k] - ui.offset[i])
#--         if d < 1
#--           @_found["#{k}-#{i}"] =
#--             state : _a.align
#--             side  : k
#--         else if d < 10
#--           @_found["#{k}-#{i}"] =
#--             state : _a.near
#--             side  : k
#--
#--     for k in _propsList
#--       for i in _propsList
#--         key = "#{k}-#{i}"
#--         if @_found[key]?
#--           view.grid[key] = {}
#--           if @_found[key].state is _a.near
#--             view.grid[key][@_found[key].side] = @view
#--           else
#--             view.grid[key][@_found[key].side] = null
#--           @_border[k].setAttribute(_a.data.over, @_found[key].state)
#--         else
#--           #@debug "only CLEAR #{k}", @_found, @view.cid
#--           @_border[k].setAttribute(_a.data.over, _a.off)
#--       @_draw(k, ui)
#--     #tmp = _.clone @_found
#--     @debug "only ALLLI",@_found, view.grid
#--
#--
#-- # ======================================================
#-- #
#-- # ======================================================

# ===========================================================
# #--   _nearby
#
# @param [Object] e
# @param [Object] ui
# @param [Object] opt
# @param [Object] view
#
# @return [Object] 
#
# ===========================================================
#--   _nearby: (e, ui, opt, view) =>
#--     if @_movingId is @view.cid or @_movingId is @view.parent.cid or @$el.data(_a.state) is _a.closed
#--       return no
#--
#--     if @view.model.get(_a.toolbox)
#--       if  @_overlapped(ui, opt) > @_surface
#--         @view.$el.attr(_a.data.overlap, _a.on)
#--       else
#--         @view.$el.attr(_a.data.overlap, _a.off)
#--       return
#--
#--     for k,v of _borders
#--       if @el.dataset[k] isnt _a.far
#--         @el.setAttribute("data-#{k}", _a.far)
#--       if ui.helper.data(k) isnt _a.far
#--         ui.helper.attr("data-#{k}", _a.far)
#--
#--       for i in v.dir
#--         d = Math.abs(ui.offset[k] - @_offset[i])
#--         if d < 2
#--           @debug "NEEEARARARA --> #{i}", @view.cid
#--           @el.setAttribute("data-#{i}", _a.over)
#--           j = v.excl
#--           c = ui.offset[j] - @_offset[j]
#--           if c <= 0
#--             switch j
#--               when _a.left
#--                 elmargin = ui.offset[j] - @_offset[j]
#--                 elwidth = @_outerWidth + @_offset[j] - ui.offset[j]
#--                 @el.pseudoStyle(_a.before, {
#--                   height : _1px
#--                   right  : _a.auto
#--                   left   : elmargin + _px
#--                   width  : elwidth + _px
#--                 })
#--               when _a.top
#--                 elmargin = ui.offset[j] - @_offset[j]
#--                 elheight = @_outerHeight + @_offset[j] - ui.offset[j]
#--                 @el.pseudoStyle(_a.before, {
#--                   width   : _1px
#--                   bottom  : _a.auto
#--                   top     : elmargin + _px
#--                   height  : elheight + _px
#--                 })
#--           else
#--             switch j
#--               when _a.left
#--                 elmargin = @_offset[j] + @_outerWidth - ui.offset[j] - ui.helper.outerWidth()
#--                 elwidth = ui.helper.outerWidth() + ui.offset[j] - @_offset[j]
#--                 @el.pseudoStyle(_a.before, {
#--                   height : _1px
#--                   left   : _a.auto
#--                   right  : elmargin + _px
#--                   width  : elwidth + _px
#--                 })
#--               when _a.top
#--                 elmargin = @_offset[j] + @_outerHeight - ui.offset[j] - ui.helper.outerHeight()
#--                 elheight = ui.helper.outerHeight() + ui.offset[j] - @_offset[j]
#--                 @el.pseudoStyle(_a.before, {
#--                   width   : _1px
#--                   top     : _a.auto
#--                   bottom  : elmargin + _px
#--                   height  : elheight + _px
#--                 })
#--         else
#--           if d < 30
#--             @el.setAttribute("data-#{i}", _a.near)
#--             j = v.excl
#--             c = ui.offset[j] - @_offset[j]
#--             if c <= 0
#--               switch j
#--                 when _a.left
#--                   elmargin = ui.offset[j] - @_offset[j]
#--                   elwidth = @_outerWidth + @_offset[j] - ui.offset[j]
#--                   @el.pseudoStyle(_a.before, {
#--                     height : _1px
#--                     right  : _a.auto
#--                     left   : elmargin + _px
#--                     width  : elwidth + _px
#--                   })
#--                 when _a.top
#--                   elmargin = ui.offset[j] - @_offset[j]
#--                   elheight = @_outerHeight + @_offset[j] - ui.offset[j]
#--                   @el.pseudoStyle(_a.before, {
#--                     width   : _1px
#--                     bottom  : _a.auto
#--                     top     : elmargin + _px
#--                     height  : elheight + _px
#--                   })
#--             else
#--               switch j
#--                 when _a.left
#--                   elmargin = @_offset[j] + @_outerWidth - ui.offset[j] - ui.helper.outerWidth()
#--                   elwidth = ui.helper.outerWidth() + ui.offset[j] - @_offset[j]
#--                   @el.pseudoStyle(_a.before, {
#--                     height : _1px
#--                     left   : _a.auto
#--                     right  : elmargin + _px
#--                     width  : elwidth + _px
#--                   })
#--                 when _a.top
#--                   elmargin = @_offset[j] + @_outerHeight - ui.offset[j] - ui.helper.outerHeight()
#--                   elheight = ui.helper.outerHeight() + ui.offset[j] - @_offset[j]
#--                   @el.pseudoStyle(_a.before, {
#--                     width   : _1px
#--                     top     : _a.auto
#--                     bottom  : elmargin + _px
#--                     height  : elheight + _px
#--                   })
#--
#--     if @_overlapped(ui, opt)
#--       @el.setAttribute _a.data.overlap, _a.on
#--     else
#--       @el.setAttribute _a.data.overlap, _a.off
