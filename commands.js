const cp = require('child_process')

const SERVICE_NAMES = [
  'nginx.service',
  'image-hub-www.service',
  'image-hub-etl.service',
]

const cpu = "top -bn1 | grep load | awk '{printf \"%.2f\", $(NF-2)}'"
const memUsage = "free -m | awk 'NR==2{printf \"%s/%sMB %.2f%%\", $3,$2,$3*100/$2 }'"
const ip = "hostname -I | cut -d\' \' -f1"
const bigDisk = "df -h | awk '$NF==\"/\"{printf \"%d/%dGB %s\", $3,$2,$5}'"
const disk = "df -h | awk '$NF==\"/\"{printf \"%s\", $5}'"
const ssid = "iwgetid -r"
const services = `sudo systemctl list-units -t service --no-legend --no-pager -a ${SERVICE_NAMES.join(' ')} | tr -s ' ' | cut -d' ' -f1,3`

module.exports = {
  cpuSync: () => cp.execSync(cpu),
  diskSync: () => cp.execSync(bigDisk),
  ipSync: () => cp.execSync(ip),
  ssidSync: () => cp.execSync(ssid),
  servicesSync: () => {
    return cp.execSync(services, { encoding: 'utf8' })
      .trim()
      .split('\n').map(s => {
        const parts = s.split(' ')
        return {
          name: parts[0],
          status: parts[1]
        }
      })
      .filter(s => s.status !== 'active')
      .map(s => `${s.name.slice(0, -8).split('-').pop()} ${s.status}`)
      .join(', ')
  },
  memUsageSync: () => cp.execSync(memUsage),
}
