

**Requirement for using websocket services**
- inherit from require('core/websocket')
- use method @upstream(**service.name**, **arguments list**)

**MANDATORY**
_optionnal_

chat:
========
   ## _SVC.chat.to_read   (To get the last readed page)
       **entity_id** ( drumate id of the active contact )

  ## _SVC.chat.delete   (To Delete a messages from a room) 
    **messages**  (List of message id to delete ) 
  
 ## _SVC.chat.forward   (to forwrd one or more seleted messages to one or more seleted drumates) 
    **entities** ( list select drumate id(s) to forward  )
                          EX : ["XXXX", "XXXXX"]
    **nodes**     ( message object   )   
                         EX :  { "hub_id":"46fb4fc946fb4fce", "messages":["006caae4006caaf3", "ddddWWWDeaswwewe3"]}                  
  
 ## _SVC.channel.post   (To get the channel list based on the given entity_id  ) 
    **entity_id** ( drumate id of the active contact )
    _message_     ( Text/HTML )     
    _attachment_  ( list of media id(s)) 
    _thread_id_   ( id of thread discussion )   
    
    NOTE :  Any one _message_ or _attachment_ should have the value. Both should not be empty.   
  
  ## _SVC.chat.contact_rooms   (To list/search the active contacts for chat ) 
     _tag_id_  ( id of the tag )
     _page_    ( defaulted to 1)
     _key_     ( search text)

  ## _SVC.chat.share_rooms  (To list the share rooms for chat ) 
     _page_    ( defaulted to 1)  
    
  ## _SVC.chat.messages  (To get the chat messages based the entity_id) 
    **entity_id** ( drumate id of the active contact )
      _page_      ( defaulted to 1)  
  



