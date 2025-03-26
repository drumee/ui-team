// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : ../src/drumee/behavior/fx
//   TYPE : 
// ==================================================================== *

// ==================================================================== *
// MANDATORY INDENTATION -- shall be included in parent button module
//  #########################################
//  # CLASS : Behavior.Fx
//  # Behavior for visual effect animator
//  #########################################
//  class __exported__ extends Marionette.Behavior.Custom #Behavior.Marionette
//
//  # ==================== *
//  #
//  # ==================== *

// ===========================================================
// #    onRender
//
// @return [Object] 
//
// ===========================================================
//    onRender:()=>
//      fx = @view.model.get(_a.fx) || @view.getOption(_a.fx)
//      if not fx?
//        return
//      _dbg "onDomRefresh fx string", fx
//      fx = @_parse fx
//      @_exec fx
//
//
//  # ==================== *
//  #
//  # ==================== *

// ===========================================================
// #    _exec
//
// @param [Object] args
//
// ===========================================================
//    _exec:(args)=>
//      specials = _USING.regexp.specials
//      for a in args
//        try
//          a.at   = a.at.replace(specials, _K.string.empty)
//          a.exec = a.exec || a.do
//          a.exec = a.exec.replace(specials, _K.string.empty)
//        if _.isFinite(a.at)
//          a.at = a.at * 1000
//          if _.isFunction @[a.exec]
//            _.delay @[a.exec], a.at, a.args
//          else
//            this.warn WARNING.method.not_found, a.exec
//        else if not _.isEmpty a
//          this.warn WARNING.arguments.mal_formed, a
//
//  # ======================================================
//  #
//  # ======================================================

// ===========================================================
// #    userClass
//
// @param [Object] args
//
// ===========================================================
//    userClass:(args)=>
//      _dbg ">>aaaa userClass flow=#{@view.flow}", args
//      @$el.addClass args
//
//  # ======================================================
//  #
//  # ======================================================

// ===========================================================
// #    addClass
//
// @param [Object] args
//
// ===========================================================
//    addClass:(args)=>
//      @$el.addClass args
//
//  # ======================================================
//  #
//  # ======================================================

// ===========================================================
// #    removeClass
//
// @param [Object] args
//
// ===========================================================
//    removeClass:(args)=>
//      @$el.addClass args
//
//  # ======================================================
//  #
//  # ======================================================

// ===========================================================
// #    style
//
// @param [Object] args
//
// @return [Object] 
//
// ===========================================================
//    style:(args)=>
//      if _.isEmpty args
//        this.warn WARNING.arguments.empty
//        return
//      args = args.trim()
//      args = args.split(/\ *;\ */)
//      _dbg ">>aaaa AT args ", args
//      for i in args
//        k = i.split _USING.regexp.colon
//        if not _.isEmpty k[0]
//          _dbg ">>aaaa style", k[0], k[1]
//          @$el.css k[0], k[1]
module.exports = __exported__;
