

**Requirement for using micrro services**
- inherit from require('core/entity')
- use method @upstream(**service.name**, **arguments list**)
- Hub forum messaging

**MANDATORY**
_optionnal_

channel:
========
  
  ## _SVC.channel.messages   (Return the list of messages posted on the hub forum) 
     **hub_id** 
     _order_   ( either 'desc' or 'asc', defaulted to 'asc' )   
     _page_    ( defaulted to 1)

    OUTPUT : author_id, message_id, thread_id, attachment, `message`, ctime,
    firstname, lastname, c.status ,metadata
    is_readed ("1" means readed the logged user , 0 means yet to read by the logged user ),
    is_seen   ("1" means readed by all the members, '0' means one or more members are yet to read ) 

    key field(s) : message_id

   ## _SVC.channel.post   (To get the channel list based on the given entity_id. ) 
    **hub_id**     
    **message**    ( Text/HTML )     
     _thread_id_   ( id of thread discussion )   
    OUTPUT : author_id, message_id, thread_id, attachment, message, ctime,metadata,
    is_readed ("1" means readed the logged user , 0 means yet to read by the logged user ),
    is_seen   ("1" means readed by all the members, '0' means one or more members are yet to read ), 
    firstname, lastname, status
    key field(s) : message_id


  ## _WS.channel.read
    **hub_id**     
    **id**     ( id of the message to read )     
    OUTPUT : author_id, message, message_id, thread_id, attachment, status, ctime, metadata 
    is_readed ("1" means readed the logged user , 0 means yet to read by the logged user ),
    is_seen   ("1" means readed by all the members, '0' means one or more members are yet to read ) 
    key field(s) :  message_id

  ## _WS.channel.notify_chat
    **hub_id**     
    OUTPUT : read_cnt  ( Total number of message yet to read by the logged user )
    