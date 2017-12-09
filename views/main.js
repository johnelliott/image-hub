const html = require('choo/html')
const image = require('./image.js')
const debug = require('debug')('hub:views:main')

module.exports = function main (state, emit) {
  debug('main render')
  return html`<body>
      <nav><h1><a href="/" title="share"><span>📷 ${state.images ? state.images.length : 0}</span></a></h1></nav>
      <div class="image-container">
        <ul>${state.images.map(i => image(i, emit))}</ul>
      </div>
      <footer class="footer">
        <a href="/">🏠</a>
        <a href="#">🔝</a>
        <a href="/all">📅</a>
      </footer>
    </body>`
}