# Commands

## Generator

### Generate Kind

Use this command to generate a new kind

```bash
#!/bin/bash
:> letc/builder.js # command
--fig=multi.email.input
      #- (Mandatory) to add the fig name
--dest=./src/path
      #- (Mandatory) location to generate the kind
--template=js
      #- (optional) to generate the js kind by default this will create a coffee script file  
```

```bash
#!/bin/bash
:> letc/builder.js --template=js --fig=multi.email.input --dest=./src/drumee/builtins/widget/multi-email-input
```

## Auto Update Files

## To Update the Seed file

This will update the seed files and updated the kind.md file

```bash
#!/bin/bash
:> seeds.sh
```

## To Update the list of service in the server

navigate to the `~/devel/server` and run the following command

```bash
#!/bin/bash
:> cd ~/devel/server
:>./src.js/utils/svc-gen.js
```

## Convert coffee script to Js

```bash
#!/bin/bash
:> decaffeinate index.coffee
```
## Build the ui code 

```bash
#!/bin/bash
:> sync-ui.sh --kill=yes
```
## Enable the debugging mode 

```console
:> localStorage.setItem('verbose', 1)
```

## Build the ui API code (export drumee to other website)

```bash
#!/bin/bash
:> sync-api.sh --kill=yes
```

## Build the Server code 

```bash
#!/bin/bash
:> sync-server.sh --kill=yes
```

## deploy the static repo in testing 

```bash
#!/bin/bash
:> cd /home/deploy/testing/static
:> git pull
:> /opt/drumee/utils/rsync-static.sh
```

## To Resolve the Deadlock issue 

```bash
#!/bin/bash
:> sudo fuser -k 24003/tcp
```

# DB Commands 
## To patch the script to all the DB 
> ~/utils/patch.sh { file } { common | yp | drumate | hub | DB_name }

Example 
```bash
#!/bin/bash
~/utils/patch.sh common/procedures/channel.sql common
~/utils/patch.sh common/procedures/mfs/get-attributes.sql common
~/utils/patch.sh common/procedures/mfs/show-node-by.sql common
~/utils/patch.sh drumate/procedures/desk/create-hub.sql drumate
~/utils/patch.sh hub/patches/share_alter.sql hub 
~/utils/patch.sh hub/procedures/dmz.sql hub
~/utils/patch.sh yellow_page/patches/share.sql

```

# Language Commands 
## To Update the language files in production 
1. navigate to `https://drumee.io/_/ranjith/#/admin/locale` Add or update your locale then build 
1. navigate to  devel/static in bash 
1. rsync local file from /srv/drumee/static/locale/*.json to  locale/
1. git commit + push 
1. Merge To master branch 

```bash
#!/bin/bash
> cd ~/devel/static
> rsync /srv/drumee/static/locale/*.json locale/
> git -am 'updated th locale'
```

## To Update the language files in production new Way  
There is a new way for generating locale: 

### On dev server
1. navigate to `https://drumee.io/_/ranjith/#/admin/locale` Add or update your locale then build
run the popup command based on your location , if you are updated UI then run the UI rsync command in the ui dir 
```bash
#!/bin/bash
rsync -av /srv/drumee/static/locale/ui/ locale/
rsync -av /srv/drumee/static/locale/server/ dataset/locale/
rsync -av /srv/drumee/static/locale/transfer/ store/transfer/locale/
rsync -av /srv/drumee/static/locale/electron-web/ src/drumee/widgets/electron/locale/
rsync -av /srv/drumee/static/locale/electron-main/ desktop/src/locale/
rsync -av /srv/drumee/static/dataset/files-formats.json dataset/configs/
```

### To add a new svg
  For both normalized and raw svg icons
  Add the svg to the respective folder and
```
> svg.sh
```
 Then commit the file named 'normalized.sprite.txt' or 'raw.sprite.txt' along with the svg file


### On live server:

```bash
#!/bin/bash
> cd /usr/src/drumee/schemas
> git pull
> /opt/drumee/utils/patch-db.sh yellow_page/patches/static/intl.sql yp
> /opt/drumee/utils/lexicon.sh
```

# Pm2 commands (Drumee)
## to list the running pm2 process
> sudo drumee list

## to start pm2 process
> sudo drumee start

# Deployment 
## To testing Server 
Login as root and run `testing-ui.sh`

```bash
#!/bin/bash
> sudo su
> /opt/drumee/utils/testing-ui.sh
```


