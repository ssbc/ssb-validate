var V = require('./')

module.exports = function (getLatest, append) {

  var waiting = {}, cbs = [], state = {queue: [], feeds: {}, error: null}, writing = false

  function _append () {
    if(!state.queue.length ||writing) return
    writing = true
    var _cbs = cbs
    cbs = []
    var queue = state.queue
    state.queue = []
    //these messages have all ready been validated,
    //so this only represents storing them in the log.
    //therefore, we only expect to see file system errors here
    append(queue, function (err) {
      writing = false
      while(_cbs.length) _cbs.shift()(err)

      //write again if there is more to write
      if(state.queue.length) _append()
    })
  }

  function queue(msg, cb) {
    //check if we can validate immediately
    function _queue () {
      state = V.append(state, msg)
      if(state.error) {
        return cb(state.error)
      }
      else {
        cb(null, msg)
      }
      if(state.queue.length)
        _append()
    }

    if(state.feeds[msg.author]) _queue()
    else if(waiting[msg.author])
      waiting.push(_queue)
    else {
      waiting[msg.author] = [_queue]
      getLatest(msg.author, function (err, value) {
        state.feeds[msg.author] = value
        _queue()
        while(waiting[msg.author].length)
          waiting[msg.author].shift()()
      })
    }
  }

  function add (msg, cb) {
    cbs.push(cb)
    if(Array.isArray(msg)) {
      msg.forEach(queue)
    }
    else
      queue(msg, function () {})

    _append()
  }

  return {
    queue: queue,
    add: add
  }
}


