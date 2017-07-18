var tape = require('tape')
var ssbKeys = require('ssb-keys')

var seed = require('crypto').createHash('sha256').update('validation-test-seed').digest()
var seed2 = require('crypto').createHash('sha256').update('validation-test-seed2').digest()
var keys = ssbKeys.generate('ed25519', seed)
var keys2 = ssbKeys.generate('ed25519', seed2)

var state = {
  queue: [],
  feeds: {}
}

var v = require('../')

tape('simple', function (t) {

  var msg = v.create(keys, null, null, {type: 'test'}, +new Date('2017-04-11 8:08 UTC'))
  t.notOk(v.checkInvalidCheap(null, msg), 'cheap checks are valid')
  t.notOk(v.checkInvalid(null, msg), 'signature is valid')

  //append sets the state for this author,
  //as well as appends the message to the queue.
  state = v.append(state, msg)

  var fstate = state.feeds[keys.id]

  t.equal(fstate.id, v.id(msg))
  t.equal(fstate.timestamp, msg.timestamp)
  t.equal(fstate.sequence, msg.sequence)
  t.deepEqual(fstate.queue, [])
  t.deepEqual(state.queue, [msg])

  var msg_invalid = v.create(keys, null, null, {type: 'test'}, +new Date('2017-04-11 8:08 UTC'))
  t.ok(v.checkInvalidCheap(fstate, msg), 'cheap checks are invalid (on invalid message)')
  t.ok(v.checkInvalid(fstate, msg), 'signature is invalid (on invalid message)')

  t.equal(state.feeds[keys.id].id, v.id(msg))
  t.equal(state.queue.length, 1)

  //queue appends to a feed, but does not write check the signature
  //(because that is quite slow on javascript crypto)

  var msg2 = v.create(keys, null, fstate, {type: 'test2'}, +new Date('2017-04-11 8:09 UTC'))

  state = v.queue(state, msg2)

  //doesn't update the feed's state properties, except queue
  t.equal(fstate.id, v.id(msg))
  t.equal(fstate.timestamp, msg.timestamp)
  t.equal(fstate.sequence, msg.sequence)

  t.deepEqual(fstate.queue, [msg2])
  t.deepEqual(state.queue, [msg])

  var msg3 = v.create(keys, null, fstate, {type: 'test2'}, +new Date('2017-04-11 8:10 UTC'))
  t.equal(msg3.previous, v.id(msg2))

  state = v.append(state, msg3)

  t.deepEqual(state.queue, [msg, msg2, msg3])
  console.log(state)
  t.end()
})


tape('queue the first item', function (t) {
  var msg = v.create(keys2, null, null, {type: 'test'}, +new Date('2017-04-11 9:09 UTC'))
  state = v.queue(state, msg)
  var fstate = state.feeds[keys2.id]
  t.equal(fstate.id, null)
  t.equal(fstate.timestamp, null)
  t.equal(fstate.sequence, null)
  t.deepEqual(fstate.queue, [msg])

  var msg2 = v.create(keys2, null, fstate, {type: 'test'}, +new Date('2017-04-11 9:10 UTC'))
  state = v.queue(state, msg2)
  t.notOk(state.error)

  state = v.validate(state, keys2.id)

  t.end()
})

