#!/bin/bash

dest_host=$UI_RUNTIME_HOST
if [ "$dest_host" != "" ]; then
  src_path=$UI_BUILD_PATH
  if [ "$REMOTE_USER" = "" ]; then
    dest_user=$USER
  else
    dest_user=$REMOTE_USER
  fi
  dest_path=$UI_RUNTIME_PATH

  OPT=""
  if [ -f "$IGNORE_FILE" ]; then
    OPT=--exclude-from="$IGNORE_FILE"
  fi

  if [ -z $src_path ]; then 
    echo UI_BUILD_PATH env variable must be set
    exit 1
  fi 

  target="${dest_user}@${dest_host}:${dest_path}"

  echo "*******************************************************"
  echo "*SYNCING files on remote location: $src_path -> $target " 
  echo "*******************************************************"	
  export banner_shown=shown
  echo OPTION: $OPT
  ssh -o ConnectTimeout=10 -o ServerAliveInterval=15 -o ServerAliveCountMax=3 ${dest_user}@${UI_RUNTIME_HOST} mkdir -p ${dest_path}
  rsync -az -e "ssh -o ConnectTimeout=10 -o ServerAliveInterval=15 -o ServerAliveCountMax=3" $OPT $src_path/ $target

  echo "Done!"
fi
