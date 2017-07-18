var tape = require('tape')
var ssbKeys = require('ssb-keys')

var seed = require('crypto').createHash('sha256').update('validation-test-seed').digest()
var keys = ssbKeys.generate('ed25519', seed)

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


  console.log(state)
  t.end()

})

