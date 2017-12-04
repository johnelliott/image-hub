const debug = require('debug')('hub:views:lightbox')
const html = require('choo/html')

module.exports = function lightbox (i, emit) {
  if (!i.name.length) {
    return html``
  }
  function nextSlide () {
    debug('nextSlide called')
    emit('next')
  }
  function previousSlide () {
    debug('previousSlide called')
    emit('prev')
  }
  function close () {
    debug('close called')
    emit('close')
  }
  return html`<div class="lightbox" onclick=${close}>
    <div class="lightbox-content" >
      <a alt="small size" href="/small/${i.name}">
        <img class="lightbox-image" src="/small/${i.name}"/>
      </a>
      <div class="image-thumb__crops">
        <div class="image-thumb__icon" onclick=${previousSlide}>⬅️</div>
        <a class="image-thumb__icon" alt="full size" href="/storage/${i.name}">💯</a>
        <a class="image-thumb__icon" alt="small size" href="/small/${i.name}">🖼</a>
        <a class="image-thumb__icon" alt="instagram story" href="/stories/${i.name}">↕️</a>
        <div class="image-thumb__icon" onclick=${nextSlide}>➡️</div>
      </div>
    </div>
  </div>`
}
