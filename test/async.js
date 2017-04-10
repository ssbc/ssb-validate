var tape = require('tape')
var ssbKeys = require('ssb-keys')

var seed = require('crypto').createHash('sha256').update('validation-test-seed').digest()
var keys = ssbKeys.generate('ed25519', seed)

var Async = require('../async')
var V = require('../')

function createMock (log, async) {
  if(!async) async = function (e) { return e }
  function append (queue, cb) {
    async(function () {
      queue.forEach(function (msg) {
        log.push(msg)
      })
      async(cb)()
    })()
  }

  function getLatest(id, cb) {
    async(function () {
      for(var i = log.length; i> 0; --i) {
        if(log[i].author === id)
          return cb(null, {id: id, sequence: log[i].sequence, timestamp: log[i].timestamp})
      }
      async(cb)(null)
    })()
  }
  return Async(getLatest, append)
}

module.exports = function (async) {
  tape('simple', function (t) {
    var log = []
    var ssb = createMock(log)
    var msg1, msg2, msg3
    ssb.queue(msg1 = V.create(keys, null, null, {type: 'test', text: 'hello'}, +new Date('2017-04-11 10:48')), function (err, msg) {
      ssb.queue(msg2 = V.create(keys, null, {id: V.id(msg1), sequence: msg1.sequence}, {type: 'test', text: 'hello'}, +new Date('2017-04-11 10:49')), function (err, msg) {
        //not actually appended yet
        t.deepEqual(log, [])
        ssb.add(
          msg3 = V.create(keys, null, {id: V.id(msg2), sequence: msg2.sequence}, {type: 'test', text: 'hello'}, +new Date('2017-04-11 11:03')),
          function (err) {
            t.deepEqual(log, [msg1, msg2, msg3])
            t.end()
          }
        )
      })
    })
  })

  tape('para', function (t) {
    var log = []
    var ssb = createMock(log)
    var msg1, msg2, msg3
    ssb.queue(msg1 = V.create(keys, null, null, {type: 'test', text: 'hello'}, +new Date('2017-04-11 10:48')), function (err, msg) {
    })
    ssb.queue(msg2 = V.create(keys, null, {id: V.id(msg1), sequence: msg1.sequence}, {type: 'test', text: 'hello'}, +new Date('2017-04-11 10:49')), function (err, msg) {
    })
    ssb.add(
      msg3 = V.create(keys, null, {id: V.id(msg2), sequence: msg2.sequence}, {type: 'test', text: 'hello'}, +new Date('2017-04-11 11:03')),
      function (err) {
        t.deepEqual(log, [msg1, msg2, msg3])
        t.end()
      }
    )
  })
}

if(!module.parent) {
  module.exports()
  module.exports(function (fn) {
    return function () {
      setImmediate(fn)
    }
  })
  module.exports(function (fn) {
    return function () {
      setTimeout(fn, Math.random()*10)
    }
  })
}

