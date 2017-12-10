# Image Hub 👁
A helper to rapidly share images from your camera.
A launch pad for your images.

Image Hub is a computer that accepts your camera memory card, ingests any JPEG images, and creates a web gallery served over the local network. Image Hub formats images on demand with download links for publishing to Instagram stories, facebook or other social media.

The intended hardware is a Raspberry Pi 3 board, USB card reader, and USB power bank. It runs without a display and uses the onboard LED to communicate job progress.

## caveats
- ignore all the ansible stuff if developing node.js locally
- some of the ansible config is still hardcoded (deploy key, cron email)
- there is some extra config for developing on the raspberry pi in the ansbile configs
- ansible config may refer to another repository for SD card rsync loop cron job
- ssh key for pi to pull form github has assumed name
- mid way through pug -> choo transition, some unused pug files
- tested with jpegs created by a digital camera, this is easy way to avoid any missing data from jpegs from the web that may have EXIF stripped out
- the node.js server on port 3000 assume they will be proxied to by nginx on port 80, so they will do a lot of image creation when running locally without nginx
- the sd card reader I have has the usb hardware id is hard coded, but it's easier to run on mac and drag files into `storage` to add to the ETL/db

## install
- ignore all the ansible stuff if developing node.js locally
- get a machine that runs node, graphicsmagick, has SD card reader
- npm install the node application
- create the directories the node apps expect (see env below)

## .env example
```ini
EXIFTOOL_PATH=/bin/exiftool
MEDIA_PATH=/media
HOST=localhost
PORT=3000
OPTIMISTIC_SMALL=false
DISABLE_SERVER_RENDER=false
```

## run locally
- npm run etl in one terminal
- drag/drop a filename.JPG with exif data (an exif preview thumbnail is necessary, camera pictures work well for this) into the `storage` directory
- use `npm run db:images` orr sqlite3 CLI (`sqlite3 cam.db`) to check the `image` table has data
- npm run server in another terminal
- load up `localhost:3000/all` (all ignores image create dates) to see the server loads

## server.js feature flags
#### OPTIMISTIC_SMALL=true
Optionally create small size crops on disk for images created within 10 seconds of the requested image
#### SEVER_RENDER_OFF=true
turn off server rendering for debugging

## logging linux services
- `journalctl -x -b -e --user-unit image-hub*.service`
- `systemctl --user status image-hub-*.service`


## ansible deploys

Use with ansible 2.0+

- hosts must be configured by SSH
- host name must be put in inventory
- put `~/.ssh/raspi-deploy` key in place
- run `ansible-playbook image-hub.yml`
