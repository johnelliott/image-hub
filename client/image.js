const debug = require('debug')('hub:views:image')
const html = require('choo/html')

module.exports = function image (i, emit) {
  function view (e) {
    debug('view event', e)
    emit('view', i.name)
  }
  return html`<li class="image-thumb" id="${i.name}">
    <a class="image-link" alt="small size" onclick=${view} href="/view/${i.name}"><img src="/thumb/${i.name}"/></a>
  </li>`
}
