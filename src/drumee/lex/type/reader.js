// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : ../src/drumee/lex/type/reader
//   TYPE :
// ==================================================================== *

const a = {
  accordion         : 'accordion',
  album             : 'album',
  analytics         : 'analytics',
  avatar            : 'avatar',
  blog              : 'blog',
  box               : 'box',
  blank             : 'blank',
  button            : {
    _               : 'button',
    anchor          : 'button_anchor',
    blank           : 'button_blank',
    broadcast       : 'button_broadcast',
    icon            : 'button_icon',
    nested          : 'button_nested',
    switch          : 'button_switch',
    switcher        : 'button_switcher',
    rotate          : 'button_rotate',
    toggle          : 'button_toggle',
    trigger         : 'button_trigger'
  },
  calendar          : {
    month           : 'calendar_month',
    datepicker      : 'calender_datepicker'
  },
  card              : 'card',
  canvas            : {
    draw            : 'canvas_draw'
  },
  catalog           : 'catalog',
  channel           : 'channel',  // TV Channel
  chart             : {
    line            : 'chart_line',
    pie             : 'chart_pie',
    sline           : 'chart_sline'
  },
  chat              : 'chat',
  checkbox          : 'checkbox',
  colorPicker       : 'colorPicker',
  composite         : {
    box             : 'composite_box',
    pulldown        : 'composite_pulldown',
    site            : 'composite_site',
    visitor         : 'composite_visitor',
    tmp             : 'composite'
  },
  comment           : {
    panel           : 'comment:panel',
    panel           : 'comment:thread'
  },
  confirm           : 'confirm',
  container         : 'container',
  cop               : 'cop',
  kropper           : 'kropper',
  cvibes            : 'cvibes',
  datepicker        : 'datepicker',
  document          : 'document',
  dropdown          : 'dropdown',
  dropMenu          : 'dropMenu',
  drumThreads       : 'drumThreads',
  entry             : 'entry',
  entry_input       : 'entry_input',
  entry_reminder    : 'entry_reminder',
  entry_search      : 'entry_search',
  entry_text        : 'entry_text',
  exception_handler : 'exception_handler',
  film              : 'film',
  form              : 'form',
  forum             : 'forum',    // Same as blog ?
  helper            : {
    block           : 'helper_block',
    box             : 'helper_box',
    document        : 'helper_document',
    file            : 'helper_file',
    image           : 'helper_image',
    media           : 'helper_media',
    section         : 'helper_section',
    video           : 'helper_video',
    widget          : 'helper_widget'
  },
  creator           : {
    background      : 'creator_background',
    document        : 'creator_document',
    file            : 'creator_file',
    image           : 'creator_image',
    media           : 'creator_media',
    video           : 'creator_video',
    widget          : 'creator_widget'
  },
  hull              : 'hull',
  image             : {
    box             : 'image_box',
    canvas          : 'image_canvas',
    core            : 'image_core',
    cropper         : 'image_cropper',
    raw             : 'image_raw',
    reader          : 'image_reader',
    smart           : 'image_smart',
    svg             : 'image_svg'
  },
  hub               : {
    area            : 'hub_area',
    item            : 'hub_item',
    panel           : 'hub_panel'
  },
  iframe            : 'iframe',
  include           : 'include',
  input             : 'input',
  jumper            : 'jumper',
  layer             : {
    _               : 'layer',
    any             : 'layer_any',
    background      : 'layer_background',
    container       : 'layer_container',
    image           : 'layer_image',
    include         : 'layer_include',
    link            : 'layer_link',
    text            : 'layer_text',
    thumbnail       : 'layer_thumbnail',
    video           : 'layer_video'
  },
  listMenu          : 'listMenu',
  list              : {
    smart           : 'list_smart',
    table           : 'list_table'
  },
  login             : 'login',
  lookup            : 'lookup',
  map               : {
    leaflet         : 'map_leaflet'
  },
  media             : {
    audio           : 'media_image',
    document        : 'media_document',
    folder          : 'media_folder',
    helper          : 'media_helper',
    image           : 'media_image',
    preview         : 'media_preview',
    thread          : 'media_thread',
    ui              : 'media_ui',
    video           : 'media_video'
  },
  menu              : {
    base            : 'menu',
    topic           : 'menu_topic',
    wrapper         : 'menu_wrapper'
  },
  menubox           : 'menubox',
  messenger         : 'messenger',
  modal             : 'modal',
  msgbox            : 'msgbox',
  note              : 'note',
  notifier          : 'notifier',
  page              : 'page',
  palette           : 'palette',
  photo             : 'photo',
  player_video      : 'player_video',
  popup             : 'popup',
  progress          : 'progress',
  progress_bar      : 'progress_bar',
  profile           : 'profile',
  picture           : 'picture',
  pulldown          : {
    _               : 'pulldown',
    menu            : 'pulldown_menu',
    select          : 'pulldown_select'
  },
  qna               : 'qna',
  resource_bar      : 'resource_bar',
  rich_text         : 'rich_text',
  rss               : 'rss',
  search            : 'search',
  section           : 'section',
  slide             : {
    _               : 'slide',  // Backward compatibility
    background      : 'slide_background',
    layer           : 'slide_layer',
    link            : 'slide_link',
    text            : 'slide_image',
    thumbnail       : 'slide_thumbnail'
  },
  slidebar          : 'slidebar',
  slidebar_input    : 'slidebar_input',
  slider            : {
    _               : 'slider',
    vegas           : {
      _             : 'slider_vegas',
      layer         : 'slider_vegas_layer',
      slide         : 'slider_vegas_slide'
    },
    // drumee          :
    //   _             : 'slider_drumee'
    //   layer         : 'slider_drumee_layer'
    //   slide         : 'slider_drumee_slide'
    // kreatura        :
    //   _             : 'slider_kreatura'
    //   layer         : 'slider_kreatura_layer'
    //   slide         : 'slider_kreatura_slide'
    ribbon          : 'slider_ribbon'
  },
  slideshow         : 'slideshow',
  slurper           : 'slurper',
  spinner           : {
    jump            : "spinner_jump",
    lines           : "spinner_lines",
    domino          : "spinner_domino"
  },
  style            : {
    file            : 'style_file',
    item            : 'style_item',
    list            : 'style_list'
  },
  snippet           : 'snippet',
  svg               : {
    gradient_circle : 'svg_gradient_circle',
    circle_percent  : 'svg_circle_percent',
    line            : 'svg_line',
    path            : 'svg_path'
  },
  text              : 'text',
  ticker            : 'ticker',
  tickbox           : 'tickbox',
  trigger           : 'trigger',
  // twitter           :
  //   feed            : 'twitter:feed'
  uploader          : 'uploader',
  // userClass         : 'userClass'
  utils: {
    wrapper         : "blank",
    msgbox          : "utils:msgbox"
  },
  video             : {
    background      : 'video_background',
    box             : 'video_box',
    comment         : 'video_comment',
    jwplayer        : 'video_jwplayer',
    player          : 'video_player',
    thread          : 'video_thread'
  },
  template          : 'template',
  webrtc            : "webrtc",
  webrtc_endpoint   : "webrtc_endpoint",
  wrapper           : "blank",
  ws_channel        : "ws_channel"
};
module.exports = a;
