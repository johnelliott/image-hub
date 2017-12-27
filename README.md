# Image Hub 👁
A helper to rapidly share images from your camera.
A launch pad for your images.

Image Hub is a computer that accepts your camera memory card, ingests any JPEG images, and creates a web gallery served over the local network. Image Hub formats images on demand with download links for publishing to Instagram stories, facebook or other social media.

The intended hardware is a Raspberry Pi 3 board, USB card reader, and USB power bank. It runs without a display and uses the onboard LED to communicate job progress.

## caveats
- deploy targets need github keys to clone the source
- tested with jpegs created by a digital camera, this is easy way to avoid any missing data from jpegs from the web that may have EXIF stripped out
- the node.js server on port 3000 assume they will be proxied to by nginx on port 80, so they will do a lot of image creation when running locally without nginx
- the sd card reader I have has the usb hardware id is hard coded, but it's easier to run on mac and drag files into `storage` to add to the ETL/db

## install
- npm install the node application
- create the directories the node apps expect (see env below)

## .env example
place a file named `.env` in the project directory:
```ini
EXIFTOOL_PATH=/bin/exiftool
MEDIA_PATH=/media
HOST=localhost
PORT=3000
OPTIMISTIC_SMALL=false
DISABLE_SERVER_RENDER=false
```

## /media directory structure
this is the directory structure on the root of the pi filesystem
```
media
├── small
├── storage
└── stories
```

### server.js feature flags
#### OPTIMISTIC_SMALL=true
Optionally create small size crops on disk for images created within 10 seconds of the requested image
#### SEVER_RENDER_OFF=true
turn off server rendering for debugging

## run locally
- npm run etl in one terminal
- drag/drop a filename.JPG with exif data (an exif preview thumbnail is necessary, camera pictures work well for this) into the `storage` directory
- use `npm run db:images` orr sqlite3 CLI (`sqlite3 cam.db`) to check the `image` table has data
- npm run server in another terminal
- load up `localhost:3000/all` (all ignores image create dates) to see the server loads


## logging the www and etl linux systemd services
- `journalctl -x -e --unit image-hub*.service`
- `systemctl status image-hub-*.service`

## deploy to a Raspberry Pi
- Used with ansible 2.4+
- get a host that runs node, graphicsmagick, has SD card reader (only two models are coded in)
- hosts must be configured by SSH
- host name must be put in the ansible inventory file
- cd into ansible-deploy directory
- put `~/.ssh/raspi-deploy` key in place
- run `ansible-playbook base.yml` for on-pi development tools
- run `ansible-playbook app.yml` for the main node.js apps
- run `ansible-playbook display.yml` for the OLED display
- run `ansible-playbook app.yml --start-at-task='clone app'` for git-only chanages
