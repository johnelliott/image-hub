#!/bin/bash

# Run this from macOS with ssh set up

goaccess="/usr/local/bin/goaccess"
command -v $goaccess >/dev/null 2>&1 || { echo >&2 "I require $goaccess but it's not installed"; exit 1; }

if [ -z "$1" ]
then
  echo 'Need an ssh host as $1'
  exit 0
fi
d=$(date +%Y-%m-%d_%H.%M.%S)
report="www-logs_$1_$d.html"
echo creating log $report
####### journalctl -u nginx.service -u image-hub-www.service -o cat --no-pager -b
ssh $1 'journalctl -u image-hub-www.service -o cat --no-pager' | $goaccess - -a --html-report-title="Node.js www Stats $1" -o $report
open $report
