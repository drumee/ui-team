API
Sequences rquired to enter in a room:
1/ Get room information required to run the process through restful api (room.get). 

2/ To ensure that everything is properly set on the backend side, another service is sent.
**yp.bind_socket** makes the binding beetween **Visitor.get(_a.socket_id)** and **x-param-auth**. So that the server is happy to let socket connection come in.

3/ Once the room information is returned and permission is given, the room becomes reachable thought web socket service: The client must then send the message **{room_type}.upstream-request-access**

4/ If the service yp.bind_socket succeeded, the server knows that the websocket is OK. Then it replys the message **downstream-access-granted**. The meessage contains *peers*, which is the list of attendees that already have joined the room. The *peers* list conatins informations required to connect to the remote stream.

5/ Once room access granted, the client can send mew message **upstream-offer**, this step requires the client to be able to provide local video/audio stream. This is a oneway stream. 

6/ Once the message **upstream-offer** aknowledged by the server, the client can issue a new message **upstream-peer-enter**. This message shall be broadcasted to all the attendees in the room through the message **downstream-peers-lis**.

7/ The **downstream-peers-lis** message contains *peers*, each of them contain remote stream of each attendee already in the room.

8/ From information from the *peers* list, the client can send the message **downstream-offer** related to each *peer* from the list.

9/ The server shall reply with the message **downstream-response**, which contain information related to remote stream.



## room.get
  - Request
      - socket_id
      - hub_id
      - device_id
      - room_type
  - Example Request:
      - ```{"service":"room.get","socket_id":Visitor.get(_a.socket_id),"hub_id":"3df581953df581ad","device_id":Visitor.deviceId(),"room_type":"meeting","nid":"3f1fc48e3f1fc4a5"}```
  - Response
      - endpointAddress: "51.75.130.67:23011"
      - endpointRoute: "/_/surendar/"
  - Example Response:
      - ```{"__ack__":"room.get","__status__":"ok","__timestamp__":1631870092632,"data":{"id":"b7728605b7728619","room_id":"b7728605b7728619","user_id":"b19bcb20b19bcb3d","socket_id":"qpYihqBzzgUu39TIGx4vqA==","presenter_id":"qpYihqBzzgUu39TIGx4vqA==","ctime":1631870092,"hub_id":"3df581953df581ad","avatar_id":"b19bcb20b19bcb3d","guest_name":"Surendar","role":"presenter","screen_id":null,"permission":7,"email":"surendar28111989@gmail.com","firstname":"Surendar","lastname":"Ramasamy","fullname":"Surendar Ramasamy","type":"meeting","use_node":"51.75.130.67:23011","use_location":"/_/surendar/","pushNode":"51.75.130.67:23011","pushLocation":"/_/surendar/","endpointAddress":"51.75.130.67:23011","endpointRoute":"/_/surendar/","status":"started"}}```

## yp.bind_socket
  - Request
      - socket_id
      - hub_id
      - endpointAddress
      - endpointRoute
      - device_id
  - Example Request:
      - ```{"service":"yp.bind_socket","socket_id":Visitor.get(_a.socket_id),"hub_id":"b19bcb20b19bcb3d","endpointAddress":"51.75.130.67:23011","endpointRoute":"/_/surendar/","device_id":"vaCx5pIr6xEzUREBOvkv5Q00"}```

  - Example Response:
      - ```{"__ack__":"yp.bind_socket","__status__":"ok","__timestamp__":1631870093184,"data":{"user_id":"b19bcb20b19bcb3d","uid":"b19bcb20b19bcb3d","username":"surendar","ident":"surendar","connection":"ok","socket_id":"qpYihqBzzgUu39TIGx4vqA=="}}```


## hub.get_members_by_type
  - Request
      - socket_id
      - device_id
      - hub_id
      - type
  - Example Request:
      - ```{"service":"hub.get_members_by_type","socket_id":"qpYihqBzzgUu39TIGx4vqA==","device_id":"vaCx5pIr6xEzUREBOvkv5Q00","hub_id":"3df581953df581ad","type":"all","timer":500}```
  
  - Example Response:
      - ```{"__ack__":"hub.get_members_by_type","__status__":"ok","__timestamp__":1631870093156,"data":[{"page":1,"id":"c956c28dc956c2aa","privilege":7,"email":"arun300892@gmail.com","lastname":"Ranganathan","fullname":"Arunkumar Ranganathan","surname":"Arunkumar Ranganathan","online":"0","firstname":"Arunkumar","is_drumate":1,"status":"active","contact_id":"e101419be10141af"},{"page":1,"id":"42d21f1242d21f1a","privilege":63,"email":"somanossar@gmail.com","lastname":"Tano","fullname":"Asohka Tano","surname":"Asohka Tano","online":"1","firstname":"Asohka","is_drumate":1,"status":"active","contact_id":"17104e2617104e35"},{"page":1,"id":"f021966ff0219689","privilege":7,"email":"bakohe6519@prowerl.com","lastname":"bakohe","fullname":"bakohe bakohe","surname":"bakohe bakohe","online":"1","firstname":"bakohe","is_drumate":1,"status":null,"contact_id":null},{"page":1,"id":"0df1b0800df1b09b","privilege":7,"email":"bkb7zd5@provlst.com","lastname":"zd","fullname":"bkb zd","surname":"bkb zd","online":"0","firstname":"bkb","is_drumate":1,"status":null,"contact_id":null},{"page":1,"id":"46fb4fc946fb4fce","privilege":7,"email":"xxxxx@gmail.com","lastname":"Kandhasamy","fullname":"Gopinath Kandhasamy","surname":"Gopinath Kandhasamy","online":"0","firstname":"Gopinath","is_drumate":1,"status":"active","contact_id":"27322ffd2732300c"},{"page":1,"id":"e8c95317e8c95333","privilege":7,"email":"pumbaa@getnada.com","lastname":"View member","fullname":"pumbaa  View member","surname":"pumbaa  View member","online":"0","firstname":"pumbaa ","is_drumate":1,"status":null,"contact_id":null},{"page":1,"id":"554bf212554bf219","privilege":31,"email":"pranjithkumar86@gmail.com","lastname":"Punniyamurthy","fullname":"ranjithkumarp Punniyamurthy","surname":"ranjithkumarp Punniyamurthy","online":"1","firstname":"ranjithkumarp","is_drumate":1,"status":"active","contact_id":"64457a0664457a13"},{"page":1,"id":"a8220eb3a8220ecf","privilege":7,"email":"regis@drumee.net","lastname":"de Lassus","fullname":"Régis de Lassus","surname":"Régis de Lassus","online":"0","firstname":"Régis","is_drumate":1,"status":null,"contact_id":null},{"page":1,"id":"b19bcb20b19bcb3d","privilege":7,"email":"surendar28111989@gmail.com","lastname":"Ramasamy","fullname":"Surendar Ramasamy","surname":"Surendar Ramasamy","online":"2","firstname":"Surendar","is_drumate":1,"status":null,"contact_id":null},{"page":1,"id":"833062be833062d7","privilege":7,"email":"vinusysops@gmail.com","lastname":null,"fullname":"vinusysops ","surname":"vinusysops ","online":"0","firstname":"vinusysops","is_drumate":1,"status":"active","contact_id":"d127bf06d127bf2d"}]}```

## desk.set_online_status
  - Request
      - socket_id
      - hub_id
      - status
  - Example Request:
      - ```{"service":"desk.set_online_status","socket_id":"qpYihqBzzgUu39TIGx4vqA==","hub_id":"b19bcb20b19bcb3d","status":2}```
  
  - Example Response:
      - ```{"__ack__":"desk.set_online_status","__status__":"ok","__timestamp__":1631870093187,"data":{"hub_id":"b19bcb20b19bcb3d","user_id":"b19bcb20b19bcb3d","status":2}}```


# WS

## {Type}.upstream-request-access
  - ```["meeting.upstream-request-access",{"cid":"view3690","user_id":"b19bcb20b19bcb3d","ssid":"qpYihqBzzgUu39TIGx4vqA==","hub_id":"3df581953df581ad","room_id":"b7728605b7728619","deviceId":"vaCx5pIr6xEzUREBOvkv5Q00"}]```

## {Type}.upstream-offer
  - ```["meeting.upstream-offer",{"cid":"view3833","user_id":"b19bcb20b19bcb3d","ssid":"qpYihqBzzgUu39TIGx4vqA==","hub_id":"3df581953df581ad","room_id":"b7728605b7728619","outbound_id":"e820fb6f-a702-4569-a2d2-8dbc827ee109","inbound_id":null,"video":0,"audio":1,"sdpOffer":"}]```

## {Type}.upstream-icecandidate
  - ```["meeting.upstream-icecandidate",{"cid":"view3833","user_id":"b19bcb20b19bcb3d","ssid":"qpYihqBzzgUu39TIGx4vqA==","hub_id":"3df581953df581ad","room_id":"b7728605b7728619","outbound_id":"e820fb6f-a702-4569-a2d2-8dbc827ee109","inbound_id":null,"peer_id":"e820fb6f-a702-4569-a2d2-8dbc827ee109","candidate":{"candidate":"candidate:2026329132 1 udp 2122260223 192.168.0.129 57558 typ host generation 0 ufrag dZzI network-id 1 network-cost 10","sdpMid":"0","sdpMLineIndex":0}}]```

## {Type}.upstream-peer-enter
  - ```["meeting.upstream-peer-enter",{"cid":"view3833","user_id":"b19bcb20b19bcb3d","ssid":"qpYihqBzzgUu39TIGx4vqA==","hub_id":"3df581953df581ad","room_id":"b7728605b7728619","outbound_id":"e820fb6f-a702-4569-a2d2-8dbc827ee109","inbound_id":null}]```