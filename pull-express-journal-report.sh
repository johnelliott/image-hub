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
report="$1$sincemessage-express_$d.html"
echo $report

ssh $1 "journalctl -u image-hub-www.service -o cat --no-pager $since" \
  | $goaccess - -a --html-report-title="$1 Express Logs" -o $report
open $report
