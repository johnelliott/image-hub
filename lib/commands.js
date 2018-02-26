const debug = require('debug')('hub:commands')
const cp = require('child_process')

const SERVICE_NAMES = [
  'nginx.service',
  'image-hub-www.service',
  'image-hub-etl.service'
]
const CPU = 'top -bn1 | grep load | awk \'{printf "%.2f", $(NF-2)}\''
// const MEMUSAGE = "free -m | awk 'NR==2{printf \"%s/%sMB %.2f%%\", $3,$2,$3*100/$2 }'"
const IP = 'hostname -I | cut -d\' \' -f1,2'
const DISK = "df -h | awk '$NF==\"/\"{printf \"%d/%dGB %s\", $3,$2,$5}'"
const SSID = 'iw dev|grep ssid|cut -d\' \' -f2'
const SERVICES = `sudo systemctl list-units -t service --no-legend --no-pager -a ${SERVICE_NAMES.join(' ')} | tr -s ' ' | cut -d' ' -f1,3`

function commandPromiseWrapper (command, options = {}) {
  return new Promise((resolve, reject) => {
    cp.exec(command, options, (err, result) => {
      if (err) {
        return reject(err)
      }
      resolve(result)
    })
  }).catch(debug)
}

exports.cpu = () => commandPromiseWrapper(CPU)
exports.disk = () => commandPromiseWrapper(DISK)
exports.ip = () => commandPromiseWrapper(IP)
exports.ssid = () => commandPromiseWrapper(SSID)
exports.services = () => {
  return commandPromiseWrapper(SERVICES, { encoding: 'utf8' })
    .then(services => {
      debug('services command closed', services)
      return services.trim()
      .split('\n').map(s => {
        const parts = s.split(' ')
        return {
          name: parts[0].toUpperCase(),
          status: parts[1]
        }
      })
      .filter(s => s.status !== 'active')
      .map(s => `${s.name.slice(0, -8).split('-').pop()} ${s.status}`)
      .join(', ')
    })
}
