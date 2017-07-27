var Obv = require('obv')
var V = require('./')

module.exports = function (state, log) {

  var writing = Obv()
  writing.set(false)
  var author
  function queue (msg) {
    state = V.queue(state, msg)
    if(author && (msg.author !== author) && (state.feeds[author].queue.length > 20)) {
      state = V.validate(state, author)
      state = V.queue(state, msg)
    }
    else
      state = V.queue(state, msg)
    author = msg.author
  }

  function flush (id, cb) {
    if(!cb)
      cb = id, id = null

    if(writing.value)
      return writing.once(function () { flush(id, cb) }, false)
    else
      writing.set(true)

    if(id === true) { //flush everything
      for(var k in state.feeds)
        if(state.feeds[k].queue.length)
          state = V.validate(state, k)
    }
    else if(id)
      state = V.validate(state, id)

    if(state.queue.length) {
      state.writing = state.queue
      state.queue = []
      log.append(state.writing, function (err, value) {
        state.writing = []
        writing.set(false)
        cb(err, value)
      })
    }
    else
      cb()
  }

  return {
    writing: writing,
    append: function (msg, cb) {
      queue(msg)
      flush(msg.author, cb)
    },
    queue: queue,
    flush: flush,
    validated: function () {
      return state.validated
    },
    queued: function () {
      return state.queued
    }
  }
}

