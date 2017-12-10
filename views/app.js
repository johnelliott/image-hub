const debug = require('debug')('hub:views:app')
debug('initialState', global.window.initialState)
const choo = require('choo')
const main = require('./main.js')
const detail = require('./detail.js')

// Choo app
const app = choo()
app.route('/view/:image', detail)
app.route('/', main)

app.use(function (state, emitter) {
  // initialize state
  state.images = []
  state.currentImage = {}

  emitter.on('navigate', function () {
    debug('navigate')
  })
  emitter.on('add', function () {
    debug('add event')
    debug('about to fetch')
    global.fetch(`/`, {
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
app.mount('body')
