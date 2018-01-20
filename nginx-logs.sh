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
report="$1-nginx-report_$d.html"
echo creating log $report
###### "journalctl -u nginx -o cat --no-pager |grep -i 'photon nginx'|cut -d' ' -f3-"
ssh $1 'journalctl -u nginx.service -o cat --no-pager --since today' | $goaccess - -a --html-report-title="$1 www Nginx report" -o $report
open $report
