// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : ../src/drumee/lex/type/designer
//   TYPE :   
// ==================================================================== *
   
const a = {   
  analytics          : 'analytics',
  audio              : { 
    player           : 'designer_audio_player'
  },
  bit                : {
    list             : 'designer_bit_list',
    radio            : 'designer_bit_radio'
  },
  banner             : 'designer_banner',
  box                : 'designer_box',
  button             : {
    _                : 'designer_button',
    anchor           : 'designer_button_anchor',
    blank            : 'designer_button_blank',
    broadcast        : 'designer_button_broadcast',
    icon             : 'designer_button_icon',
    nested           : 'designer_button_nested',
    rotate           : 'designer_button_rotate',
    toggle           : 'designer_button_toggle',
    trigger          : 'designer_button_trigger'
  },
  card               : 'designer_card',
  canvas             : {
    draw             : 'designer_canvas_draw'
  },
  chart              : {
    line             : 'designer_chart_line',
    pie              : 'designer_chart_pie'
  },
  chat               : 'designer_chat',
  composite          : {
    box              : 'designer_composite_box',
    pulldown         : 'designer_composite_pulldown',
    visitor          : 'designer_composite_visitor',
    tmp              : 'designer_composite'
  },
  container          : 'designer_container',
  checkbox           : 'designer_checkbox',
  document           : 'designer_document',
  dropMenu           : 'designer_dropMenu',
  drumThreads        : 'designer_drumThreads',
  entry              : 'designer_entry',
    // available        : 'designer_entry_available'
    // blank            : 'designer_entry_blank'
    // hidden           : 'designer_entry_hidden'
    // lookup           : 'designer_entry_lookup'
    // password         : 'designer_entry_password'
    // search           : 'designer_entry_search'
    // text             : 'designer_entry_text'
    // textarea         : 'designer_entry_textarea'
  film               : 'designer_film',
  form               : 'designer_form',
  gallery            : {
    layer            : 'designer_gallery_layer',
    slide            : 'designer_gallery_slide',
    slider           : 'designer_gallery_slider'
  },
//  helper             :
//    file             : 'designer_helper_file'
//    media            : 'designer_helper_media'
//    video            : 'designer_helper_video'
//    widget           : 'designer_helper_widget'
  hub                : {
    area             : 'designer_hub_area',
    item             : 'designer_hub_item',
    panel            : 'designer_hub_panel'
  },
  hull               : 'designer_hull',
  iframe             : 'designer_iframe',
  image              : {
    box              : 'designer_image_box',
//    cropper          : 'designer_image_cropper'
//    kropper          : 'designer_image_kropper'
    player           : 'designer_image_player',
    raw              : 'designer_image_raw',
    slider           : 'designer_image_slider',
    svg              : 'designer_image_svg'
  },
//    v2               : 'designer_image_v2'
//    viewer           : 'designer_image_viewer'
  include            : 'designer_include',
  input              : 'designer_input',
  layout             : {
    item             : 'designer_layout_item',
    list             : 'designer_layout_list'
  },
  jumper             : 'designer_jumper',
  listMenu           : 'designer_listMenu',
  list               : {
    composite        : 'designer_list_composite',
    note             : 'designer_list_note',
    scroll           : 'designer_list_scroll',
    text             : 'designer_list_text'
  },
  login              : 'designer_login',
  lookup             : 'designer_lookup',
  media              : {
    audio            : 'designer_media_audio',
    folder           : 'designer_media_folder',
    item             : 'designer_media_item',
    thread           : 'designer_media_threada',
    ui               : 'designer_media_ui'
  },
  menu               : {
    topic            : 'designer_menu_topic',
    wrapper          : 'designer_menu_wrapper'
  },
  menubox            : 'designer_menubox',
  modal              : 'designer_modal',
  msgbox             : 'designer_msgbox',
  note               : 'designer_note',
  notifier           : 'notifier',
  photo              : 'designer_photo',
  player_video       : 'designer_player_video',
  profile            : 'designer_profile',
  progresse          : 'designer_progresse',
  progresse          : 'designer_progresse',
  progress_bar       : 'designer_progress_bar',
  pulldown           : {
    _                : 'designer_pulldown',
    menu             : 'designer_pulldown_menu',
    select           : 'designer_pulldown_select'
  },
  qna                : 'designer_qna',
  raw                : 'designer_raw',
  resource_bar       : 'designer_resource_bar',
  rss                : 'designer_rss',
  search             : 'designer_search',
  section            : 'designer_section',
  slide              : 'designer_slide',
  slideBarre         : 'designer_slideBarre',
  slider             : {
    drumee           : {
      _              : 'designer_slider_drumee',
      layer          : 'designer_slider_drumee_layer',
      slide          : 'designer_slider_drumee_slide'
    },
    kreatura         : {
      _              : 'designer_slider_kreatura',
      layer          : 'designer_slider_kreatura_layer',
      slide          : 'designer_slider_kreatura_slide'
    },
    vegas            : {
      _              : 'designer_slider_vegas',
      layer          : 'designer_slider_vegas_layer',
      slide          : 'designer_slider_vegas_slide'
    }
  },
  slurper            : 'designer_slurper',
  // svg                : 'designer_svg'
  svg                : { 
    gradient_circle  : 'designer_svg_gradient_circle',
    line             : 'designer_svg_line',
    path             : 'designer_svg_path'
  },
  templateName: 'designer_template',
  text               : 'designer_text',
  tickbox            : 'tickbox',
  trigger            : 'designer_trigger',
  twit               : {
    thread           : 'designer_twit_thread'
  },
  twitter            : {
    feed             : 'designer_twitter_feed'
  },
  uploader           : 'designer_uploader',
  use                : {
    page             : 'designer_use_page',
    slider           : 'designer_use_slider'
  },
  video              : {
    background       : 'designer_video_background',
    box              : 'designer_video_box',
    comment          : 'designer_video_comment',
    jwplayer         : 'designer_video_jwplayer',
    player           : 'designer_video_player',
    thread           : 'designer_video_thread'
  },
  wrapper            : "designer_wrapper"
};
module.exports = a;
