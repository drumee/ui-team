/* ================================================================== *
#   Copyright Xialia.com  2011-2025
#   FILE : /src/drumee/core/kind/seeds/builtins.js
#   TYPE : Automatic generation - DO NOT EDIT 
# ===================================================================**/
// @ts-nocheck


// On demand Classes cannot be overloaded

const a = {
  drumee_api_popup:function(s,f){import('api/lib/popup').then(m=>{s(m.default)}).catch(f)},
  drumee_api_form:function(s,f){import('api/lib/form').then(m=>{s(m.default)}).catch(f)},
  drumee_api_signup:function(s,f){import('api/lib/signup').then(m=>{s(m.default)}).catch(f)},
  drumee_api_image_tag:function(s,f){import('api/lib/image-tag').then(m=>{s(m.default)}).catch(f)},
  DrumeeInteractPlayer:function(s,f){import('builtins/player/interact').then(m=>{s(m.default)}).catch(f)},
  DrumeeInteractWindow:function(s,f){import('builtins/window/interact').then(m=>{s(m.default)}).catch(f)},
  DrumeeWm:function(s,f){import('builtins/window/manager').then(m=>{s(m.default)}).catch(f)},
  editor_diagram:function(s,f){import('src/drumee/builtins/editor/diagram/index.js').then(m=>{s(m.default)}).catch(f)},
  diagram_state:function(s,f){import('src/drumee/builtins/editor/diagram/state.js').then(m=>{s(m.default)}).catch(f)},
  editor_markdown:function(s,f){import('src/drumee/builtins/editor/markdow/index.js').then(m=>{s(m.default)}).catch(f)},
  media_origin:function(s,f){import('src/drumee/builtins/media/notifications/origin').then(m=>{s(m.default)}).catch(f)},
  notification_file:function(s,f){import('src/drumee/builtins/media/notifications/origin/file').then(m=>{s(m.default)}).catch(f)},
  notification_message:function(s,f){import('src/drumee/builtins/media/notifications/origin/message').then(m=>{s(m.default)}).catch(f)},
  props_viewer:function(s,f){import('src/drumee/builtins/player/properties').then(m=>{s(m.default)}).catch(f)},
  text_viewer:function(s,f){import('src/drumee/builtins/player/text').then(m=>{s(m.default)}).catch(f)},
  audio_player:function(s,f){import('builtins/player/audio').then(m=>{s(m.default)}).catch(f)},
  devices_settings:function(s,f){import('builtins/widget/devices').then(m=>{s(m.default)}).catch(f)},
  document_page:function(s,f){import('builtins/player/document/page').then(m=>{s(m.default)}).catch(f)},
  document_reader:function(s,f){import('builtins/player/document').then(m=>{s(m.default)}).catch(f)},
  editor_note:function(s,f){import('builtins/editor/note').then(m=>{s(m.default)}).catch(f)},
  hub_administrator:function(s,f){import('builtins/window/hub/settings/administrator').then(m=>{s(m.default)}).catch(f)},
  hub_filename:function(s,f){import('builtins/window/hub/settings/filename').then(m=>{s(m.default)}).catch(f)},
  hub_hubname:function(s,f){import('builtins/window/hub/settings/hubname').then(m=>{s(m.default)}).catch(f)},
  hub_members:function(s,f){import('builtins/window/hub/settings/members').then(m=>{s(m.default)}).catch(f)},
  hub_owner:function(s,f){import('builtins/window/hub/settings/owner').then(m=>{s(m.default)}).catch(f)},
  hub_permission:function(s,f){import('builtins/window/hub/settings/permission').then(m=>{s(m.default)}).catch(f)},
  hub_settings:function(s,f){import('builtins/window/hub/settings').then(m=>{s(m.default)}).catch(f)},
  hub_sharebox:function(s,f){import('builtins/window/hub/sharebox').then(m=>{s(m.default)}).catch(f)},
  hub_team:function(s,f){import('builtins/window/hub/team').then(m=>{s(m.default)}).catch(f)},
  hub_website:function(s,f){import('builtins/window/hub/website').then(m=>{s(m.default)}).catch(f)},
  image_player:function(s,f){import('builtins/player/image').then(m=>{s(m.default)}).catch(f)},
  image_viewer:function(s,f){import('builtins/player/image').then(m=>{s(m.default)}).catch(f)},
  invitation_contact:function(s,f){import('builtins/widget/invitation/contact').then(m=>{s(m.default)}).catch(f)},
  invitation_recipient:function(s,f){import('builtins/widget/invitation/recipient').then(m=>{s(m.default)}).catch(f)},
  invitation_search:function(s,f){import('builtins/widget/invitation/searchbox').then(m=>{s(m.default)}).catch(f)},
  invitation:function(s,f){import('builtins/widget/invitation').then(m=>{s(m.default)}).catch(f)},
  media_device:function(s,f){import('builtins/widget/media-device').then(m=>{s(m.default)}).catch(f)},
  media_grid:function(s,f){import('builtins/media/grid').then(m=>{s(m.default)}).catch(f)},
  media_minifyer:function(s,f){import('builtins/media/minifyer').then(m=>{s(m.default)}).catch(f)},
  media_notifications:function(s,f){import('builtins/media/notifications').then(m=>{s(m.default)}).catch(f)},
  media_paste:function(s,f){import('builtins/media/paste').then(m=>{s(m.default)}).catch(f)},
  media_preview:function(s,f){import('builtins/media/preview').then(m=>{s(m.default)}).catch(f)},
  media_row:function(s,f){import('builtins/media/row').then(m=>{s(m.default)}).catch(f)},
  media_simple:function(s,f){import('builtins/media/simple').then(m=>{s(m.default)}).catch(f)},
  media_uploader:function(s,f){import('builtins/media/uploader').then(m=>{s(m.default)}).catch(f)},
  media:function(s,f){import('builtins/media/grid').then(m=>{s(m.default)}).catch(f)},
  public_link:function(s,f){import('builtins/widget/invitation/public-link').then(m=>{s(m.default)}).catch(f)},
  schedule_viewer:function(s,f){import('builtins/player/schedule').then(m=>{s(m.default)}).catch(f)},
  sound_analyzer:function(s,f){import('builtins/widget/sound-analyzer').then(m=>{s(m.default)}).catch(f)},
  thumbnail:function(s,f){import('builtins/media/thumbnail').then(m=>{s(m.default)}).catch(f)},
  tooltip:function(s,f){import('builtins/widget/notifier').then(m=>{s(m.default)}).catch(f)},
  vector_viewer:function(s,f){import('builtins/player/vector').then(m=>{s(m.default)}).catch(f)},
  video_player:function(s,f){import('builtins/player/video').then(m=>{s(m.default)}).catch(f)},
  video_viewer:function(s,f){import('builtins/player/video').then(m=>{s(m.default)}).catch(f)},
  webrtc_attendee:function(s,f){import('builtins/webrtc/attendee').then(m=>{s(m.default)}).catch(f)},
  webrtc_debug:function(s,f){import('builtins/webrtc/debug').then(m=>{s(m.default)}).catch(f)},
  webrtc_local_user:function(s,f){import('builtins/webrtc/endpoint/local/user').then(m=>{s(m.default)}).catch(f)},
  webrtc_participants:function(s,f){import('builtins/webrtc/participants').then(m=>{s(m.default)}).catch(f)},
  webrtc_remote_display:function(s,f){import('builtins/webrtc/endpoint/remote/display').then(m=>{s(m.default)}).catch(f)},
  webrtc_remote_user:function(s,f){import('builtins/webrtc/endpoint/remote/user').then(m=>{s(m.default)}).catch(f)},
  drumee_background:function(s,f){import('src/drumee/builtins/widget/background-image').then(m=>{s(m.default)}).catch(f)},
  countdown_timer:function(s,f){import('src/drumee/builtins/widget/countdown/index').then(m=>{s(m.default)}).catch(f)},
  invitation_message:function(s,f){import('invitation/message').then(m=>{s(m.default)}).catch(f)},
  invitation_permission:function(s,f){import('invitation/permission').then(m=>{s(m.default)}).catch(f)},
  invitation_sharee:function(s,f){import('invitation/sharee').then(m=>{s(m.default)}).catch(f)},
  invitation_shareeroll:function(s,f){import('invitation/sharee/roll').then(m=>{s(m.default)}).catch(f)},
  custom_logo:function(s,f){import('src/drumee/builtins/widget/logo').then(m=>{s(m.default)}).catch(f)},
  address_input_item:function(s,f){import('src/drumee/builtins/widget/address-input-item/index').then(m=>{s(m.default)}).catch(f)},
  contact_invitation_form:function(s,f){import('widget/contact-invitation-form').then(m=>{s(m.default)}).catch(f)},
  disk_usage:function(s,f){import('widget/disk-usage').then(m=>{s(m.default)}).catch(f)},
  email_input_item:function(s,f){import('src/drumee/builtins/widget/email-input-item/index').then(m=>{s(m.default)}).catch(f)},
  phoneno_input_item:function(s,f){import('src/drumee/builtins/widget/phoneno-input-item/index').then(m=>{s(m.default)}).catch(f)},
  widget_chat:function(s,f){import('widget/chat').then(m=>{s(m.default)}).catch(f)},
  widget_chat_item:function(s,f){import('widget/chat-item').then(m=>{s(m.default)}).catch(f)},
  account_avatar:function(s,f){import('window/account/profile/avatar').then(m=>{s(m.default)}).catch(f)},
  account_country:function(s,f){import('window/account/widget/country').then(m=>{s(m.default)}).catch(f)},
  account_data:function(s,f){import('window/account/data').then(m=>{s(m.default)}).catch(f)},
  account_input:function(s,f){import('window/account/widget/input').then(m=>{s(m.default)}).catch(f)},
  account_privacy:function(s,f){import('window/account/privacy').then(m=>{s(m.default)}).catch(f)},
  account_preferences:function(s,f){import('window/account/preferences').then(m=>{s(m.default)}).catch(f)},
  account_profile:function(s,f){import('window/account/profile').then(m=>{s(m.default)}).catch(f)},
  account_security:function(s,f){import('window/account/security').then(m=>{s(m.default)}).catch(f)},
  account_subscription:function(s,f){import('window/account/subscription').then(m=>{s(m.default)}).catch(f)},
  account_apps:function(s,f){import('window/account/apps').then(m=>{s(m.default)}).catch(f)},
  otp_sms:function(s,f){import('window/account/security/otp/sms').then(m=>{s(m.default)}).catch(f)},
  otp_email:function(s,f){import('window/account/security/otp/email').then(m=>{s(m.default)}).catch(f)},
  otp_passkey:function(s,f){import('window/account/security/otp/passkey').then(m=>{s(m.default)}).catch(f)},
  privacy_switcher:function(s,f){import('window/account/privacy/switcher').then(m=>{s(m.default)}).catch(f)},
  security_email:function(s,f){import('window/account/security/email').then(m=>{s(m.default)}).catch(f)},
  security_pass:function(s,f){import('window/account/security/pass').then(m=>{s(m.default)}).catch(f)},
  security_phone:function(s,f){import('window/account/security/phone').then(m=>{s(m.default)}).catch(f)},
  security_ident:function(s,f){import('window/account/security/ident').then(m=>{s(m.default)}).catch(f)},
  security_ip:function(s,f){import('window/account/security/ip').then(m=>{s(m.default)}).catch(f)},
  security_otp:function(s,f){import('window/account/security/otp').then(m=>{s(m.default)}).catch(f)},
  security_switcher:function(s,f){import('window/account/security/switcher').then(m=>{s(m.default)}).catch(f)},
  widget_tag:function(s,f){import('src/drumee/builtins/window/addressbook/widget/tag').then(m=>{s(m.default)}).catch(f)},
  widget_contacts:function(s,f){import('src/drumee/builtins/window/addressbook/widget/contacts').then(m=>{s(m.default)}).catch(f)},
  widget_contact_detail:function(s,f){import('src/drumee/builtins/window/addressbook/widget/contact-detail').then(m=>{s(m.default)}).catch(f)},
  widget_contact_form:function(s,f){import('src/drumee/builtins/window/addressbook/widget/contact-form').then(m=>{s(m.default)}).catch(f)},
  contact_item:function(s,f){import('src/drumee/builtins/window/addressbook/widget/contact-item').then(m=>{s(m.default)}).catch(f)},
  contact_form_items:function(s,f){import('src/drumee/builtins/window/addressbook/widget/contact-form-items').then(m=>{s(m.default)}).catch(f)},
  tag_item:function(s,f){import('src/drumee/builtins/window/addressbook/widget/tag-item').then(m=>{s(m.default)}).catch(f)},
  widget_search:function(s,f){import('src/drumee/builtins/window/addressbook/widget/search').then(m=>{s(m.default)}).catch(f)},
  widget_invite_notification:function(s,f){import('src/drumee/builtins/window/addressbook/widget/invite-notification').then(m=>{s(m.default)}).catch(f)},
  addressbook_widget_notification:function(s,f){import('src/drumee/builtins/window/addressbook/widget/notification').then(m=>{s(m.default)}).catch(f)},
  widget_tag_form_menu:function(s,f){import('src/drumee/builtins/window/addressbook/widget/tag-form-menu').then(m=>{s(m.default)}).catch(f)},
  members_room:function(s,f){import('src/drumee/builtins/window/adminpanel/pages/members/room/index').then(m=>{s(m.default)}).catch(f)},
  admin_security_page:function(s,f){import('src/drumee/builtins/window/adminpanel/pages/admin-security').then(m=>{s(m.default)}).catch(f)},
  broadcast_message_page:function(s,f){import('src/drumee/builtins/window/adminpanel/pages/broadcast-message').then(m=>{s(m.default)}).catch(f)},
  domain_page:function(s,f){import('src/drumee/builtins/window/adminpanel/pages/domain-page').then(m=>{s(m.default)}).catch(f)},
  members_page:function(s,f){import('src/drumee/builtins/window/adminpanel/pages/members/index').then(m=>{s(m.default)}).catch(f)},
  window_adminpanel:function(s,f){import('src/drumee/builtins/window/adminpanel/index').then(m=>{s(m.default)}).catch(f)},
  widget_dropdown_menu:function(s,f){import('src/drumee/builtins/window/adminpanel/widget/dropdown-menu/index').then(m=>{s(m.default)}).catch(f)},
  widget_member_choose_admins:function(s,f){import('src/drumee/builtins/window/adminpanel/widget/member-choose-admins/index').then(m=>{s(m.default)}).catch(f)},
  widget_member_roles_menu:function(s,f){import('src/drumee/builtins/window/adminpanel/widget/member-roles-menu/index').then(m=>{s(m.default)}).catch(f)},
  widget_member_roles_menu_items:function(s,f){import('src/drumee/builtins/window/adminpanel/widget/member-roles-menu-items/index').then(m=>{s(m.default)}).catch(f)},
  widget_member_who_can_see:function(s,f){import('src/drumee/builtins/window/adminpanel/widget/member-who-can-see/index').then(m=>{s(m.default)}).catch(f)},
  widget_member_detail:function(s,f){import('src/drumee/builtins/window/adminpanel/widget/member_detail/index').then(m=>{s(m.default)}).catch(f)},
  widget_member_form:function(s,f){import('src/drumee/builtins/window/adminpanel/widget/member_form/index').then(m=>{s(m.default)}).catch(f)},
  widget_member_tag_item:function(s,f){import('src/drumee/builtins/window/adminpanel/widget/member_tag_item/index').then(m=>{s(m.default)}).catch(f)},
  widget_member_tags:function(s,f){import('src/drumee/builtins/window/adminpanel/widget/member_tags/index').then(m=>{s(m.default)}).catch(f)},
  widget_members_list_item:function(s,f){import('src/drumee/builtins/window/adminpanel/widget/members-list-item/index').then(m=>{s(m.default)}).catch(f)},
  widget_members_search:function(s,f){import('src/drumee/builtins/window/adminpanel/widget/members-search/index').then(m=>{s(m.default)}).catch(f)},
  widget_members_list:function(s,f){import('src/drumee/builtins/window/adminpanel/widget/members_list/index').then(m=>{s(m.default)}).catch(f)},
  window_analytics_extractor:function(s,f){import('src/drumee/builtins/window/analytics/extractor').then(m=>{s(m.default)}).catch(f)},
  window_chart_bar:function(s,f){import('src/drumee/builtins/window/analytics/bar-graph').then(m=>{s(m.default)}).catch(f)},
  window_analytics_main_website:function(s,f){import('src/drumee/builtins/window/analytics/main-website').then(m=>{s(m.default)}).catch(f)},
  window_chart_timeseries:function(s,f){import('src/drumee/builtins/window/analytics/time-series').then(m=>{s(m.default)}).catch(f)},
  chat_contact_list:function(s,f){import('src/drumee/builtins/window/bigchat/widget/chatcontact-list').then(m=>{s(m.default)}).catch(f)},
  chat_contact_item:function(s,f){import('src/drumee/builtins/window/bigchat/widget/chatcontact-item').then(m=>{s(m.default)}).catch(f)},
  chat_room:function(s,f){import('src/drumee/builtins/window/bigchat/widget/chat-room').then(m=>{s(m.default)}).catch(f)},
  widget_chat_forward_list_item:function(s,f){import('src/drumee/builtins/window/bigchat/widget/chat-forward-list-item').then(m=>{s(m.default)}).catch(f)},
  widget_chat_item_forward:function(s,f){import('src/drumee/builtins/window/bigchat/widget/chat-item-forward').then(m=>{s(m.default)}).catch(f)},
  widget_shareroom_detail:function(s,f){import('src/drumee/builtins/window/bigchat/widget/shareroom-userdetails').then(m=>{s(m.default)}).catch(f)},
  widget_shareroom_user_item:function(s,f){import('src/drumee/builtins/window/bigchat/widget/shareroom-user-item').then(m=>{s(m.default)}).catch(f)},
  bigchat_widget_notification:function(s,f){import('src/drumee/builtins/window/bigchat/widget/notification').then(m=>{s(m.default)}).catch(f)},
  media_wrapper:function(s,f){import('src/drumee/builtins/window/channel/media-wrapper').then(m=>{s(m.default)}).catch(f)},
  widget_helpdesk_category:function(s,f){import('src/drumee/builtins/window/helpdesk/widget/help-category/index').then(m=>{s(m.default)}).catch(f)},
  widget_helpdesk_item:function(s,f){import('src/drumee/builtins/window/helpdesk/widget/help-item/index').then(m=>{s(m.default)}).catch(f)},
  widget_simple_invitation:function(s,f){import('src/drumee/builtins/window/schedule/widget/simple-invitation/index').then(m=>{s(m.default)}).catch(f)},
  media_efs:function(s,f){import('src/drumee/builtins/window/serverexplorer/widget/efs').then(m=>{s(m.default)}).catch(f)},
  widget_efs_list:function(s,f){import('src/drumee/builtins/window/serverexplorer/widget/efs_list').then(m=>{s(m.default)}).catch(f)},
  widget_sv_new_folder:function(s,f){import('src/drumee/builtins/window/serverexplorer/widget/sv-new-folder').then(m=>{s(m.default)}).catch(f)},
  widget_sharebox_members_list_item:function(s,f){import('src/drumee/builtins/window/sharebox/widget/invitation-email-item/index').then(m=>{s(m.default)}).catch(f)},
  widget_email_notification:function(s,f){import('src/drumee/builtins/window/sharebox/widget/email-notification').then(m=>{s(m.default)}).catch(f)},
  widget_invitation_email:function(s,f){import('src/drumee/builtins/window/sharebox/widget/invitation-email').then(m=>{s(m.default)}).catch(f)},
  widget_invitation_email_item:function(s,f){import('src/drumee/builtins/window/sharebox/widget/invitation-email-item').then(m=>{s(m.default)}).catch(f)},
  widget_sharebox_setting:function(s,f){import('src/drumee/builtins/window/sharebox/widget/sharebox-setting').then(m=>{s(m.default)}).catch(f)},
  widget_suggest_contact_item:function(s,f){import('src/drumee/builtins/window/sharebox/widget/suggest-contact-item').then(m=>{s(m.default)}).catch(f)},
  support_ticket_list:function(s,f){import('src/drumee/builtins/window/supportticket/widget/support-tickets').then(m=>{s(m.default)}).catch(f)},
  support_ticket_item:function(s,f){import('src/drumee/builtins/window/supportticket/widget/support-ticket-item').then(m=>{s(m.default)}).catch(f)},
  create_support_ticket:function(s,f){import('src/drumee/builtins/window/supportticket/widget/create-support-ticket').then(m=>{s(m.default)}).catch(f)},
  status_pill:function(s,f){import('src/drumee/builtins/window/supportticket/widget/status-pill').then(m=>{s(m.default)}).catch(f)},
  support_ticket_widget_notification:function(s,f){import('src/drumee/builtins/window/supportticket/widget/notification').then(m=>{s(m.default)}).catch(f)},
  avatar:function(s,f){import('libs/reader/avatar').then(m=>{s(m.default)}).catch(f)},
  button_anchor:function(s,f){import('libs/reader/ui/button/anchor').then(m=>{s(m.default)}).catch(f)},
  button_blank:function(s,f){import('libs/reader/ui/button/blank').then(m=>{s(m.default)}).catch(f)},
  button_icon:function(s,f){import('libs/reader/button').then(m=>{s(m.default)}).catch(f)},
  button_nested:function(s,f){import('libs/reader/ui/button/nested').then(m=>{s(m.default)}).catch(f)},
  button_rotate:function(s,f){import('libs/reader/ui/button/rotate').then(m=>{s(m.default)}).catch(f)},
  button_switch:function(s,f){import('libs/reader/ui/button/switch').then(m=>{s(m.default)}).catch(f)},
  button_switcher:function(s,f){import('libs/reader/ui/button/switcher').then(m=>{s(m.default)}).catch(f)},
  button_toggle:function(s,f){import('libs/reader/ui/button/toggle').then(m=>{s(m.default)}).catch(f)},
  button_trigger:function(s,f){import('libs/reader/ui/button/trigger').then(m=>{s(m.default)}).catch(f)},
  button:function(s,f){import('libs/reader/ui/button').then(m=>{s(m.default)}).catch(f)},
  chart_bar:function(s,f){import('libs/reader/chart/bar').then(m=>{s(m.default)}).catch(f)},
  chart_line:function(s,f){import('libs/reader/chart/line').then(m=>{s(m.default)}).catch(f)},
  chart_pie:function(s,f){import('libs/reader/chart/pie').then(m=>{s(m.default)}).catch(f)},
  chart_sline:function(s,f){import('libs/reader/chart/sline').then(m=>{s(m.default)}).catch(f)},
  chart_time_series:function(s,f){import('libs/reader/chart/time-series').then(m=>{s(m.default)}).catch(f)},
  editor_json:function(s,f){import('editor/json').then(m=>{s(m.default)}).catch(f)},
  entry_input:function(s,f){import('libs/reader/entry/input').then(m=>{s(m.default)}).catch(f)},
  entry_reminder:function(s,f){import('libs/reader/entry/reminder').then(m=>{s(m.default)}).catch(f)},
  entry_search:function(s,f){import('libs/reader/entry/search').then(m=>{s(m.default)}).catch(f)},
  entry_text:function(s,f){import('libs/reader/entry/text').then(m=>{s(m.default)}).catch(f)},
  entry:function(s,f){import('libs/reader/entry/input').then(m=>{s(m.default)}).catch(f)},
  fileselector:function(s,f){import('libs/reader/file-selector').then(m=>{s(m.default)}).catch(f)},
  form:function(s,f){import('libs/reader/form').then(m=>{s(m.default)}).catch(f)},
  image_smart:function(s,f){import('libs/reader/image/smart').then(m=>{s(m.default)}).catch(f)},
  image_svg:function(s,f){import('libs/reader/image/svg').then(m=>{s(m.default)}).catch(f)},
  list_smart:function(s,f){import('libs/reader/list/smart').then(m=>{s(m.default)}).catch(f)},
  list_table:function(s,f){import('libs/reader/list/table').then(m=>{s(m.default)}).catch(f)},
  list_table_row:function(s,f){import('libs/reader/list/table/row').then(m=>{s(m.default)}).catch(f)},
  menubox:function(s,f){import('libs/reader/menu').then(m=>{s(m.default)}).catch(f)},
  menu_topic:function(s,f){import('libs/reader/menu').then(m=>{s(m.default)}).catch(f)},
  menu_wrapper:function(s,f){import('libs/reader/menu').then(m=>{s(m.default)}).catch(f)},
  messenger:function(s,f){import('libs/reader/messenger').then(m=>{s(m.default)}).catch(f)},
  profile:function(s,f){import('libs/reader/profile').then(m=>{s(m.default)}).catch(f)},
  progress:function(s,f){import('libs/reader/progress/media').then(m=>{s(m.default)}).catch(f)},
  progress_bar:function(s,f){import('libs/reader/progress/bar').then(m=>{s(m.default)}).catch(f)},
  rich_text:function(s,f){import('libs/reader/text/editable').then(m=>{s(m.default)}).catch(f)},
  search:function(s,f){import('libs/reader/entry/search').then(m=>{s(m.default)}).catch(f)},
  slidebar:function(s,f){import('libs/reader/slidebar').then(m=>{s(m.default)}).catch(f)},
  slidebar_input:function(s,f){import('libs/reader/slidebar-input/slidebar-input').then(m=>{s(m.default)}).catch(f)},
  svg:function(s,f){import('libs/reader/image/svg').then(m=>{s(m.default)}).catch(f)},
  svg_circle_percent:function(s,f){import('libs/reader/svg/circle-percent').then(m=>{s(m.default)}).catch(f)},
  svg_gradient_circle:function(s,f){import('libs/reader/svg/gradient-circle').then(m=>{s(m.default)}).catch(f)},
  svg_line:function(s,f){import('libs/reader/svg/line').then(m=>{s(m.default)}).catch(f)},
  svg_path:function(s,f){import('libs/reader/svg/path').then(m=>{s(m.default)}).catch(f)},
  dock:function(s,f){import('modules/desk/wm/dock').then(m=>{s(m.default)}).catch(f)},
  litechat_message:function(s,f){import('window/litechat/message').then(m=>{s(m.default)}).catch(f)},
  notifier_generic:function(s,f){import('desk/notifier/generic').then(m=>{s(m.default)}).catch(f)},
  notifier_network:function(s,f){import('desk/notifier/network').then(m=>{s(m.default)}).catch(f)},
  schedule_invitation:function(s,f){import('window/schedule/widget/invitation').then(m=>{s(m.default)}).catch(f)},
  schedule_recipient:function(s,f){import('window/schedule/widget/recipient').then(m=>{s(m.default)}).catch(f)},
  selection:function(s,f){import('window/selection').then(m=>{s(m.default)}).catch(f)},
  user:function(s,f){import('desk/user').then(m=>{s(m.default)}).catch(f)},
  window_account:function(s,f){import('window/account').then(m=>{s(m.default)}).catch(f)},
  window_addressbook:function(s,f){import('window/addressbook').then(m=>{s(m.default)}).catch(f)},
  window_bigchat:function(s,f){import('window/bigchat').then(m=>{s(m.default)}).catch(f)},
  window_server_explorer:function(s,f){import('window/serverexplorer').then(m=>{s(m.default)}).catch(f)},
  window_channel:function(s,f){import('window/channel').then(m=>{s(m.default)}).catch(f)},
  window_confirm:function(s,f){import('window/confirm').then(m=>{s(m.default)}).catch(f)},
  window_connect:function(s,f){import('window/connect').then(m=>{s(m.default)}).catch(f)},
  window_contact:function(s,f){import('window/contact').then(m=>{s(m.default)}).catch(f)},
  window_downloader:function(s,f){import('window/downloader').then(m=>{s(m.default)}).catch(f)},
  window_filter:function(s,f){import('window/filter').then(m=>{s(m.default)}).catch(f)},
  window_folder:function(s,f){import('window/folder').then(m=>{s(m.default)}).catch(f)},
  window_helpdesk:function(s,f){import('window/helpdesk').then(m=>{s(m.default)}).catch(f)},
  window_info:function(s,f){import('window/info').then(m=>{s(m.default)}).catch(f)},
  window_launcher:function(s,f){import('window/launcher').then(m=>{s(m.default)}).catch(f)},
  window_litechat:function(s,f){import('window/litechat').then(m=>{s(m.default)}).catch(f)},
  window_manager:function(s,f){import('desk/wm').then(m=>{s(m.default)}).catch(f)},
  window_meeting:function(s,f){import('window/meeting').then(m=>{s(m.default)}).catch(f)},
  window_schedule:function(s,f){import('window/schedule').then(m=>{s(m.default)}).catch(f)},
  window_search:function(s,f){import('window/search').then(m=>{s(m.default)}).catch(f)},
  window_sharebox:function(s,f){import('window/sharebox').then(m=>{s(m.default)}).catch(f)},
  window_supportticket:function(s,f){import('window/supportticket').then(m=>{s(m.default)}).catch(f)},
  window_switchcall:function(s,f){import('window/switchcall').then(m=>{s(m.default)}).catch(f)},
  window_team:function(s,f){import('window/team').then(m=>{s(m.default)}).catch(f)},
  window_trash:function(s,f){import('window/trash').then(m=>{s(m.default)}).catch(f)},
  window_website:function(s,f){import('window/website').then(m=>{s(m.default)}).catch(f)},
  dock_minifier:function(s,f){import('src/drumee/modules/desk/wm/dock/widget/dock-minifier').then(m=>{s(m.default)}).catch(f)},
  notification_panel:function(s,f){import('modules/desk/wm/notification').then(m=>{s(m.default)}).catch(f)},
  notification_window:function(s,f){import('modules/desk/wm/notification/widget/notification-window').then(m=>{s(m.default)}).catch(f)},
  notification_list_item:function(s,f){import('modules/desk/wm/notification/widget/notification-list-item').then(m=>{s(m.default)}).catch(f)},
  devel_icons:function(s,f){import('src/drumee/modules/devel/icons').then(m=>{s(m.default)}).catch(f)},
  locale_language:function(s,f){import('src/drumee/modules/devel/locale/language').then(m=>{s(m.default)}).catch(f)},
  locale:function(s,f){import('src/drumee/modules/devel/locale/index').then(m=>{s(m.default)}).catch(f)},
  dmz_window_manager:function(s,f){import('dmz/wm').then(m=>{s(m.default)}).catch(f)},
  dmz_sharebox:function(s,f){import('dmz/sharebox').then(m=>{s(m.default)}).catch(f)},
  dmz_meeting:function(s,f){import('dmz/meeting').then(m=>{s(m.default)}).catch(f)},
  setup_window:function(s,f){import('src/drumee/modules/setup').then(m=>{s(m.default)}).catch(f)},
  test_result:function(s,f){import('modules/test/widget/result').then(m=>{s(m.default)}).catch(f)},
  welcome_invitation:function(s,f){import('welcome/invitation').then(m=>{s(m.default)}).catch(f)},
  welcome_feedback:function(s,f){import('welcome/feedback').then(m=>{s(m.default)}).catch(f)},
  welcome_reset:function(s,f){import('welcome/reset').then(m=>{s(m.default)}).catch(f)},
  welcome_signin:function(s,f){import('welcome/signin').then(m=>{s(m.default)}).catch(f)},
  welcome_signup:function(s,f){import('welcome/signup').then(m=>{s(m.default)}).catch(f)},
  butler:function(s,f){import('router/butler').then(m=>{s(m.default)}).catch(f)},
  ws_channel:function(s,f){import('router/websocket').then(m=>{s(m.default)}).catch(f)},
  module_desk:function(s,f){import('modules/desk').then(m=>{s(m.default)}).catch(f)},
  module_devel:function(s,f){import('modules/devel').then(m=>{s(m.default)}).catch(f)},
  module_dmz:function(s,f){import('modules/dmz').then(m=>{s(m.default)}).catch(f)},
  module_sandbox:function(s,f){import('modules/sandbox').then(m=>{s(m.default)}).catch(f)},
  module_welcome:function(s,f){import('modules/welcome').then(m=>{s(m.default)}).catch(f)},
}


function get (name) {
  if(a[name]) return new Promise(a[name]);
  return null;
};
  
module.exports = {get};