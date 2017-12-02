# Image Hub 👁
A helper to rapidly share images from your camera.

Image Hub is a computer that accepts your camera memory card, ingests any JPEG images, and creates a web gallery served over the local network. Image Hub formats images on demand with download links for publishing to Instagram stories, facebook or other social media.

The intended hardware is a Raspberry Pi 3 board, USB card reader, and USB power bank. It runs without a display and uses the onboard LED to communicate job progress.

## logging
journalctl -x -b -e --user-unit image-hub*.service
systemctl --user status image-hub-*.service

## feature flags
OPTIMISTIC_SMALL=true
