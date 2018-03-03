#!/bin/bash

# Run this from macOS with ssh set up

goaccess="/usr/local/bin/goaccess"
command -v $goaccess >/dev/null 2>&1 || { echo >&2 "I require $goaccess but it's not installed"; exit 1; }

if [ -z "$1" ]
then
  echo 'Need an ssh host as $1'
  exit 0
fi

# ssh carbon 'journalctl -u nginx.service -f -o cat' | goaccess -
ssh $1 "journalctl -u nginx.service -f -o cat" | $goaccess - 
