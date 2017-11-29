#!/bin/bash

# Executables
rsync="/usr/bin/rsync"
command -v $rsync >/dev/null 2>&1 || { echo >&2 "I require $rsync but it's not installed"; exit 1; }

CARD_DEV='sda1'
CARD_MOUNT_POINT='/media/card'
STORAGE_DIR='/media/storage'

echo start

# Set the ACT LED to heartbeat
sudo sh -c "echo heartbeat > /sys/class/leds/led0/trigger"
echo heartbeat

# Wait for a USB SD reader (ID 8564:4000 Transcend Information, Inc. RDF8)
while [ -z "$(lsusb -d 8564:4000)" ]
do
  echo wait reader
  sleep 1
done

# Handle cards as long as the reader is plugged in
while [ -n "$(lsusb -d 8564:4000)" ]
do
  if [ -n "$(ls /dev/* | grep $CARD_DEV | cut -d"/" -f3)" ]
  then
    echo found card
    mount /dev/$CARD_DEV $CARD_MOUNT_POINT
    # Log the output of the lsblk command for troubleshooting
    sudo lsblk > lsblk.log
    echo mounted card

    echo running tasks...
    # Set the ACT LED to blink at 1000ms to indicate that the storage device has been mounted
    sudo sh -c "echo timer > /sys/class/leds/led0/trigger"
    sudo sh -c "echo 1000 > /sys/class/leds/led0/delay_on"
    echo blinking

    echo start rsync
    shopt -s globstar
    JPEGS="$CARD_MOUNT_POINT/**/*JPG" 
    rsync -avh $JPEGS $STORAGE_DIR/
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
  echo wait card
  sleep 1
done

# reboot once the reader is ejected
echo reader removed
echo rebooting
sudo shutdown -h now
