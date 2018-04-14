#!/bin/bash

# Executables
rsync="/usr/bin/rsync"
command -v $rsync >/dev/null 2>&1 || { echo >&2 "I require $rsync but it's not installed"; exit 1; }
# TODO other commands like ls, lsusb, mount, etc

CARD_DEV='sda1'
CARD_MOUNT_POINT='/media/card'
STORAGE_DIR="$MEDIA_DIR/storage"

echo start

# Set the ACT LED to heartbeat
sudo sh -c "echo heartbeat > /sys/class/leds/led0/trigger"
echo heartbeat

# Wait for a USB SD reader (ID 8564:4000 Transcend Information, Inc. RDF8)
# Wait for a USB SD reader (ID 05e3:0749 Genesys Logic, Inc.)
echo wait reader
while [ -z "$(lsusb -d 8564:4000 )$(lsusb -d 05e3:0749)" ]
do
  sleep 1
done
echo wait card

# Handle cards as long as the reader is plugged in
while [ -n "$(lsusb -d 8564:4000 )$(lsusb -d 05e3:0749)" ]
do
  if [ -n "$(ls /dev/* | grep $CARD_DEV | cut -d"/" -f3)" ]
  then
    echo found card
    if [ -z "$(ls /media/card)" ]
    then
      mount /dev/$CARD_DEV $CARD_MOUNT_POINT
    fi
    echo mounted card

    echo running tasks...
    # Set the ACT LED to blink at 1000ms to indicate that the storage device has been mounted
    sudo sh -c "echo timer > /sys/class/leds/led0/trigger"
    sudo sh -c "echo 1000 > /sys/class/leds/led0/delay_on"
    echo blinking

    echo start rsync
    shopt -s globstar
    JPEGS="$CARD_MOUNT_POINT/**/*JPG" 
    rsync --bwlimit=5m -avh $JPEGS $STORAGE_DIR/
    echo end rsync

    # Unmount the SD card
    umount /dev/$CARD_DEV
    echo unmounted card
    # Set the ACT LED to heartbeat
    echo heartbeat
    sudo sh -c "echo heartbeat > /sys/class/leds/led0/trigger"

    echo waiting for card removal
    # Wait for SD card removal
    while [ -n "$(ls /dev/* | grep $CARD_DEV | cut -d"/" -f3)" ]
    do
      sleep 1
    done
    echo card removed

  fi
  sleep 1
done
# reboot once the reader is ejected
echo shutting down
sudo shutdown -h now
