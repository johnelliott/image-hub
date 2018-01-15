#!/bin/bash

# Run this from macOS with ssh set up

goaccess="/usr/local/bin/goaccess"
command -v $goaccess >/dev/null 2>&1 || { echo >&2 "I require $goaccess but it's not installed"; exit 1; }

if [ -z "$1" ]
then
  echo 'Need an ssh host as $1'
  exit 0
fi
report="access-log_$1_$(date +%Y-%m-%d_%H.%M.%S).html"
echo creating log $report
ssh $1 'zcat /var/log/nginx/access.log.*.gz && cat /var/log/nginx/access.log' | $goaccess - -a --html-report-title="$1 Nginx Stats" -o $report
open $report
