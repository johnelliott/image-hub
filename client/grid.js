const html = require('choo/html')
const image = require('./image.js')
const debug = require('debug')('hub:views:grid')

module.exports = function grid (state, emit) {
  debug('grid render')
  return html`<body>
      <nav><h1><a href="/" title="share"><span>PHOTON</span></a></h1></nav>
      <div class="image-container">
        <ul>${state.images.map(i => image(i, emit))}</ul>
      </div>
      <footer class="footer">
        <span>📸</span>
      </footer>
    </body>`
}
