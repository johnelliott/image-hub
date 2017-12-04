const debug = require('debug')('hub:views:image')
const html = require('choo/html')

module.exports = function image (i, emit) {
  function view (e) {
    debug('view event', e)
    emit('view', i.name)
  }
  return html`<li class="image-thumb">
    <a class="image-link" alt="small size" onclick=${view} href="/view/${i.name}"><img class="image-link" src="${i.b64i}"/></a>
    <div class="image-thumb__crops">
      <a class="image-thumb__icon" alt="full size" href="/storage/${i.name}">💯</a>
      <a class="image-thumb__icon" alt="small size" href="/small/${i.name}">🖼</a>
      <a class="image-thumb__icon" alt="instagram story" href="/stories/${i.name}">↕️</a>
    </div>
  </li>`
}
