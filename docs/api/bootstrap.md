
## _SVC.team.create
  **name**  [T_NAME]
  **task** [TASK]
  **specs** [specs]
  **production** [production]
  **domain** [DOMAIN]
  **list of team members id** (json_array) [IDS]
  **hub_id**  [OWNER]

  __The drumate the calls the SP is the owner, the ones from the list shall be refered as "member"__

  __The service shall:__
  
  * create a folder [o_folder] in [OWNER]'s desk, name=[T_NAME]
  * in [o_folder]:
    ++ create a hub [room] (area=private), name=[specs], owner=[OWNER]
    ++ add as members [IDS], permission=3
  
  inside the hub [room]
  * for each [id] of [IDS]
    ++ create a folder [p_folder], dir_name = fullname([id])
    ++ grant privilege 3 on [p_folder] to [id]
    ++ grant privilege 1 on [p_folder] to !=id except [OWNER]



## _SVC.team.create(To create team)
    **name** ( name of the team )
    **specs**     ( secification of the team)
    **domain**       ( name of the domain ex: drumee.com)   
    **users**        ( List of drumate Ids for the team)  
  Sample
  Gateway.triggerMethod(_e.service.post,{"hub_id":"46fb4fc946fb4fce","service":"team.create",
  "users":["197e7e69197e7e72","a04bacc2a04bacc7"],
  "domain" :"drumee.com",
  "specs" : "Mar2020 spec",
  "name": "Mar2020 task"})