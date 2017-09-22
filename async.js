var V = require('./')
var AsyncWrite = require('async-write')

module.exports = function (state, log, hmac_key) {
  var queue = AsyncWrite(function (_, cb) {
    var batch = state.queue
    state.queue =  []
    log.append(batch, cb)
  }, function reduce(_, msg) {
    return V.append(state, msg)
  }, function (_state) {
    return state.queue.length < 1000
  }, 200)

  return {
    add: queue,
    createFeed: function (keys) {
      function add (msg, cb) {
        queue(
          V.create(state, hmac_key, keys, content, timestamp()),
          cb
        )
      }
      return {
        add: add, publish: add,
        keys: keys, id: keys.id
      }
    }
  }
}

