# Image Hub 👁
Helper hardware to rapidly share images from a digital camera

Image Hub is a computer that joins your Wifi and accepts your camera memory card. It ingests JPEG images, creates a gallery web-app, and serves the app over the local network. Image Hub provides image browsing and saving for publishing to Instagram stories, facebook or other social media.

The intended hardware is a Raspberry Pi 3 board, USB card reader, and USB power bank. A little OLED display is optional.

The display isn't covered here.

## caveats
- tested with jpegs created by a digital camera, this is easy way to avoid any missing data from jpegs from the web that may have EXIF stripped out
- two sd card readers are supported on Raspberry Pi, but it's easier to run on mac and drag files into `storage` to add to the ETL/db

## install
- npm install the node application
- create the `/media` directory structure the node apps expect
- create `.env` file

### /media directory structure
this is the directory structure on the root of the pi filesystem
```
media
├── small
├── storage
└── stories
```

### .env example
place a file named `.env` in the project directory:
```ini
DISABLE_SERVER_RENDER=false
EXIFTOOL_PATH=/bin/exiftool
HOST=localhost
MEDIA_PATH=/media
OPTIMISTIC_SMALL=false
PORT=3000
STORY_TREATMENT=story
```

## run locally
- npm run etl in one terminal
- drag/drop a filename.JPG with exif data (an exif preview thumbnail is necessary, camera pictures work well for this) into the `storage` directory
- use `npm run db:images` orr sqlite3 CLI (`sqlite3 cam.db`) to check the `image` table has data
- npm run server in another terminal
- load up `localhost:3000/all` (all ignores image create dates) to see the server loads

### server.js feature flags
#### OPTIMISTIC_SMALL=true
Optionally create small size crops on disk for images created within 10 seconds of the requested image
#### SEVER_RENDER_OFF=true
turn off server rendering for debugging
#### STORY_TREATMENT=story
set the visual treatment for story button output, see `lib/treatments/index.js` for the list

## logging the www and etl linux systemd services on the pi
- `journalctl -x -e --unit image-hub*.service`
- `systemctl status image-hub-*.service`
## remote logging
- `ssh hub1sshhost 'journalctl -u nginx.service -o cat --no-pager -f --no-tail' |goaccess -`
- `./www-logs.sh hub1sshhost` for node app access logs in journal
- `./nginx-logs.sh hub1sshhost` for nginx access logs in journal
- `./logs.sh hub1sshhost` for older logs

## hardware setup
- get a raspberry pi 3 with a large enough SD card to keep lots of JPEGS on (32gb+)
- install Raspbian Stretch lite or Stretch and expand the filesystem, set locales etc.
- set up the raspi with ssh key access i.e. `$ ssh mypi` lets you run commands via ssh
- connect some Raspberry Pis with ssh access via their ssh host name on your network
- get a UGREEN 20250 or Transcend TS-RDF5K card reader to use with the pi

## deploy setup
- connect prepared Raspberry Pis to the network
- install [Ansible](https://ansible.com) 2.4+ via [homebrew](https://brew.sh)
- create create ansible config file for deploys
- create create ansible inventory file for deploys
- create wpa_supplicant.conf
- put `~/.ssh/raspi-deploy` key in place that works to get this repository from github
- npm run deploy

### ansible.cfg example
located in project directory
```conf
[defaults]
inventory=inventory.ini
```
### inventory.ini example
located in project directory
this has the channel and psk variables set for specified hosts
```conf
[hubs]
hub1sshhost
hub2sshhostwithdisplay

[display-hubs]
hub2sshhostwithdisplay

[ap-hubs]
hub1sshhost channel=7
hub2sshhostwithdisplay channel=6

[ap-hubs:vars]
psk=mywifipassword
```
### wpa_supplicant.conf example
located in `this_project_directory/roles/base/files/wpa_supplicant.conf`
```
ctrl_interface=DIR=/var/run/wpa_supplicant GROUP=netdev
update_config=1
network={
	ssid="My iPhone Hotspot"
	key_mgmt=WPA-PSK
	psk=wpa_passphrase_result0000000000000000000000000000000000000000000
	priority=100
}
network={
	ssid="my-home-network"
	psk=wpa_passphrase_result0000000000000000000000000000000000000000000
	key_mgmt=WPA-PSK
	priority=99
}
```
