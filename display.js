const HOSTNAME = require('os').hostname()
const Oled = require('oled-ssd1306-i2c') // needs https://github.com/jaimehrubiks/oled_ssd1306_i2c/ master with setTimeout fix
const font = require('oled-font-5x7')
const commands = require('./commands.js')

const oled = new Oled({
  width: 128,
  height: 32
})


function line(startY = 0, text) {
  oled.setCursor(0, startY)
  oled.writeString(font, 1, text, 1, false, 0, false)
}

const services = commands.servicesSync()
const ip = commands.ipSync()
const ssid = commands.ssidSync()

oled.clearDisplay()
if (services.length) {
  oled.setCursor(0, 0)
  oled.writeString(font, 1, `Err ${services} ${ip} ${ssid} ${HOSTNAME}`, 1, true, 1, false)
} else {
  var time = new Date();
  time = time.toLocaleString('en-US', { hour: 'numeric', minute:'numeric', hour12: true });
  const cpu = commands.cpuSync()

  line(0, `wifi ${ssid}`)
  line(8, `${HOSTNAME}.local`)
  line(16, `${ip}`)
  line(25, `${cpu} avg ${time}`)
}
oled.update()
oled.dimDisplay(true)
