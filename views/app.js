const choo = require('choo')
const main = require('./main.js')
const debug = require('debug')('hub:views:app')
debug('APP FILE')

// Choo app
const app = choo()
app.route('/', main)
app.route('/view/*', main)
app.use(function (state, emitter) {
  // initialize state
  state.images = []
  state.lightbox = { index: 0, open: false }

  emitter.on('next', function () {
    debug('next event')
    state.lightbox.index = Math.min(state.lightbox.index + 1, state.images.length)
    emitter.emit('render')
  })
  emitter.on('prev', function () {
    debug('prev event')
    state.lightbox.index = Math.max(state.lightbox.index - 1, 0)
    emitter.emit('render')
  })
  emitter.on('view', function (data) {
    debug('view event', data)
    state.lightbox.open = true
    state.lightbox.index = state.images.findIndex(i => i.name === data)
    emitter.emit('render')
  })
  emitter.on('close', function () {
    debug('close event')
    state.lightbox.open = false
    emitter.emit('render')
  })
  emitter.on('add', function () {
    debug('add event')
    global.fetch(`/all`, {
      headers: {
        Accept: 'application/json'
      }
    })
      .then(res => res.ok ? res : new Error('wtf'))
      .then(res => res.json())
      .then(json => {
        state.images = []
          .concat(state.images)
          .concat(json)
          .sort((p, c) => p.date > c.date)
        emitter.emit('render')
      })
    .catch(debug)
  })
  emitter.emit('add')
})

debug('mounting app')
console.log('mounting app')
app.mount('body')
