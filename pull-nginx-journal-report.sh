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
if [ -n "$2" ]
then
  echo since: $2
  since="--since $2"
  sincemessage="-@$2"
else
  since=''
  sincemessage=''
fi
report="$1$sincemessage-nginx_$d.html"
echo $report

ssh $1 "journalctl -u nginx.service -o cat --no-pager -b $since" \
  | $goaccess - -a --html-report-title="$1 Nginx Logs" -o $report >/dev/null 2>&1
open $report
