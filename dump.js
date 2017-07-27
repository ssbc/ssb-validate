var validate = require('./')
var pull = require('pull-stream')
var state = validate.initial()

var Log = require('flumelog-offset')

var logfile = '/tmp/ssb-validate_dump-test'
try { require('fs').unlinkSync(logfile) } catch (_) {}

var log = Log(logfile, 1024, require('flumecodec/json'))

var async = require('./async')(state, log)

require('ssb-client')(function (err, sbot) {
  var c = 0, _c = 0, e = 0, d = 0, q = 0, v = 0, ts = Date.now(), start = Date.now()

  console.log('c, _c, d, e, q, v, c/s, mb, mb/s, s')

  function ConsoleLog () {
      var s = (ts - start)/1000
      var mb = log.since.value / (1024*1024)
      console.log(c, c - _c, d, e, q, v, c / s, mb, mb/s, s)
      _c = c
      d = 0

  }

  function maybeLog () {
    if(Date.now() > ts + 1000) {
      ConsoleLog()
      ts = Date.now()
    }
  }

  var author = null

  pull(
    sbot.createLogStream({}),
    function (read) {
      return function (abort, cb) {
        read(abort, function next (err, data) {
          q = async.queued()
          v = async.validated()
          c = q + v
          if(err) {
            ConsoleLog()
            return async.flush(true, function (_) {
              q = async.queued()
              v = async.validated()
              c = q + v
              ConsoleLog()
              cb(err)
            })
          }
          maybeLog()
          async.queue(data.value)
          if(state.queue.length > 100) {
            async.flush(null, function (err, data) {
              maybeLog()
              cb(err, data)
            })
          }
          else
            read(null, next)
        })
      }
  },
  pull.drain(null, function () {
      sbot.close()
    })
  )
})




