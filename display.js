const debug = require('debug')('hub:display')
const HOSTNAME = require('os').hostname()
const Oled = require('oled-ssd1306-i2c') // needs https://github.com/jaimehrubiks/oled_ssd1306_i2c/ master with setTimeout fix
const font = require('oled-font-5x7')
const commands = require('./lib/commands.js')

const oled = new Oled({
  width: 128,
  height: 32
})

function line (startY = 0, text) {
  oled.setCursor(0, startY)
  oled.writeString(font, 1, text, 1, false, 0, false)
}
function updateDisplay () {
  oled.update()
  oled.dimDisplay(true)
}

// Name promises so we can use them individually
// via block scope
const services = commands.services()
const ip = commands.ip()
const cpu = commands.cpu()
const ssid = commands.ssid()

// Services is the only thing that determines
// which path to take, so only wait on that
services.then(servicesResult => {
  if (servicesResult.length) {
    debug('service issue path')
    Promise.all([services, ip, ssid])
      .then(results => {
        const [services, ip, ssid] = results
        debug('results', results)
        oled.setCursor(0, 0)
        oled.writeString(font, 1, `Err ${services} ${ip} ${ssid} ${HOSTNAME}`, 1, true, 1, false)
        updateDisplay()
      })
  } else {
    debug('normal operation path')
    Promise.all([ssid, ip, cpu])
      .then(results => {
        const t = new Date()
        const time = t.toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true })
        const [ssid, ip, cpu] = results
        line(0, `wifi ${ssid}`)
        line(8, `${HOSTNAME}.local`)
        line(16, `${ip}`)
        line(25, `${cpu} avg ${time}`)
        updateDisplay()
      })
  }
})
