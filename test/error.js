var tape = require('tape')
var ssbKeys = require('ssb-keys')

function hash (seed) {
  return require('crypto').createHash('sha256').update(seed).digest()
}

var keys = ssbKeys.generate('ed25519', hash('validation-test-seed1'))
var keys2 = ssbKeys.generate('ed25519', hash('validation-test-seed2'))


var v = require('..')

function test (hmac_key) { 
  var state = v.initial()

  tape('simple', function (t) {

    for(var i = 0; i < 10; i++) {
      var msg = v.create(state.feeds[keys.id], keys, hmac_key, {type: 'test', i: i}, +new Date('2017-04-11 8:08 UTC')+i)

      //append sets the state for this author,
      //as well as appends the message to the queue.
      state = v.append(state, hmac_key, msg)

    }
    console.log(state)
    t.end()
  })

  tape('rerun', function (t) {

    for(var i = 0; i < state.queue.length; i++) {
      try {
        state = v.append(state, hmac_key, state.queue[i])
        t.fail('should have thrown')
      } catch (err) {
        t.equal(err.fatal, undefined)
      }
    }

    t.end()
  })

  tape('invalid - fork', function (t) {

    var last = state.queue[9]
      var m = v.create({
        id: last.previous,
        sequence: 10,
        timestamp: last.timestamp,
        queue: []
      }, keys, hmac_key, {type: 'invalid'}, last.timestamp+1)
      console.log(m)
    try {
      state = v.append(state, hmac_key, m)
      t.fail('should have thrown')
    } catch (err) {
      console.log(err)
      t.equal(err.fatal, true)
      t.end()
    }

  })


  tape('invalid - rewind', function (t) {

    var last = state.queue[9]
      var m = v.create({
        id: state.feeds[keys.id].id,
        sequence: 10,
        timestamp: last.timestamp-2, queue: []
      }, keys, hmac_key, {type: 'invalid'}, last.timestamp-1)
      console.log(m, last)

    try {
      state = v.append(state, hmac_key, m)
      t.fail('should have thrown')
    } catch (err) {
      t.equal(err.fatal, true)
      t.end()
    }

  })

  tape('create with invalid date', function (t) {
    t.throws(function () {
      var m = v.create(null, keys, hmac_key, {type: 'invalid'}, new Date('foo'))
    })
    t.end()
  })

  tape('create with invalid date', function (t) {
    t.throws(function () {
      var m = v.create(null, keys, hmac_key, null, Date.now())
    })
    t.end()
  })

}

test()
test(hash('hmac_key'))
test(hash('hmac_key2'))




