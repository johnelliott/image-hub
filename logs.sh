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
report="$1-nginx_access_log-report_$d.html"
echo creating log $report
ssh $1 'zcat /var/log/nginx/access.log.*.gz && cat /var/log/nginx/access.log' | $goaccess - -a --html-report-title="$1 www Nginx report" -o $report
open $report
