# ==================================================================== *
#   Copyright Xialia.com  2011-2018
#   FILE : ../src/drumee/libs/reader/ui/tickbox
#   TYPE : 
# ==================================================================== *

#####################################
# Media UI
# ===============
#####################################
class __tickbox extends Marionette.View # Marionette.View
#   templateName: "#--tickbox"
#   className : "widget tickbox"
# 
# 
#   behaviorSet
#     socket:1 _K.dummyArgs
#     bhv_renderer : _K.char.empty
# 
#   events:
#     click   : '_click'
# 
#   regions:
#     regionStatus : _REGION.status
# 
  className : "widget tickbox"
  behaviorSet
    socket:1 _K.dummyArgs
    bhv_renderer : _K.char.empty
  events:
    click   : '_click'
  regions:
    regionStatus : _REGION.status


# ===========================================================
# initialize
#
# @param [Object] opt
#
# ===========================================================
  initialize: (opt) ->
    @model.atLeast
      state    : 0
      justify  : _a.center
      innerClass : _C.margin.auto
      errorClass : _K.char.empty
# ======================================================
#
# ======================================================

# ===========================================================
# onDomRefresh
#
# ===========================================================
  onDomRefresh: () =>
    @debug "STATE = #{@model.get(_a.state)}"
    @$el.attr _a.data.state, @model.get(_a.state)
# ============================
#
# ============================

# ===========================================================
# getData
#
# @return [Object] 
#
# ===========================================================
  getData: ()=>
    if @get(_a.require)?
      @$el.attr _a.data.status, _a.error
      msg = _I.PLEASE_CONFIRM
      if @model.get(_a.state) isnt parseInt(@get(_a.require))
        err = new WPP.Note {content : LOCALE[msg], className : _a.error + " " + @get('errorClass')}
        @regionStatus.show err
        @_handler?.ui?.triggerMethod _e.reject, LOCALE[msg]
        @trigger _e.error
    return {name:@model.get(_a.name), value:@model.get(_a.state)}
# ============================================
#
# ============================================

# ===========================================================
# _click
#
# @param [Object] e
#
# ===========================================================
  _click:(e) =>
    state = @model.get(_a.state) ^ 1
    @model.set _a.state, state
    @$el.attr _a.data.state, state
    @regionStatus.empty()
    signal = @get(_a.signal) || _e.reset
    @_handler?.ui?.triggerMethod signal, @
module.exports = __tickbox
