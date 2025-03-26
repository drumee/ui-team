#!/bin/bash
if [ ! -z $1 ]; then
  cd $1;
else
  cd normalized
fi
for i in `ls`; do 
  p=$(echo $i | sed -e "s/\.svg//")
  in_use=$(grep $i ../in-use.txt)
  found=$(grep -r -m 1 -l --exclude-dir={creator,creator.mig,editor.mig,builder} $p ../../src/drumee)
  if [ -z "$found" ]; then
    if [ -z "$in_use" ]; then 
      echo $i seems not used. Removing
      rm -f $i 
    fi 
  else 
    if [ -z "$in_use" ]; then 
      echo $i >> ../in-use.txt
    fi 
  fi
done
