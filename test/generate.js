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

  state = v.append(state, msg = v.create(keys, null, null, {type: 'test'}, +new Date('2017-04-11 8:08 UTC')))

  t.equal(state.feeds[keys.id].id, v.id(msg))
  state = v.append(state, v.create(keys, null, state.feeds[keys.id], {type: 'test2'}, +new Date('2017-04-11 8:09 UTC')))
  console.log(state)
  t.end()

})


