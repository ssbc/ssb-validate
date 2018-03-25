var tape = require('tape')
var ssbKeys = require('ssb-keys')
var crypto = require('crypto')

function hash (seed) {
  return crypto.createHash('sha256').update(seed).digest()
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

  var ctxt = crypto.randomBytes(1024).toString('base64')+'.box'

  tape('create with invalid content', function (t) {
    t.throws(function () {
      var m = v.create(null, keys, hmac_key, null, Date.now())
    })
    t.throws(function () {
      var m = v.create(null, keys, hmac_key, true, Date.now())
    })
    t.throws(function () {
      var m = v.create(null, keys, hmac_key, false, Date.now())
    })
    t.throws(function () {
      var m = v.create(null, keys, hmac_key, 0, Date.now())
    })
    t.throws(function () {
      var m = v.create(null, keys, hmac_key, 100, Date.now())
    })
    t.throws(function () {
      var m = v.create(null, keys, hmac_key, [], Date.now())
    }, 'array as content')
    t.throws(function () {
      var m = v.create(null, keys, hmac_key, new Buffer('hello'), Date.now())
    }, 'buffer as content')
    t.throws(function () {
      var m = v.create(null, keys, hmac_key, new Date(), Date.now())
    }, 'date as content')

    t.throws(function () {
      var m = v.create(null, keys, hmac_key, {}, Date.now())
    })
    t.throws(function () {
      var m = v.create(null, keys, hmac_key, {tyfe:'not-okay' }, Date.now())
    })

    t.throws(function () {
      var m = v.create(null, keys, hmac_key, {tyfe:'not-okay' }, Date.now())
    })

    //type too long
    t.throws(function () {
      var m = v.create(null, keys, hmac_key, {type:ctxt }, Date.now())
    })

    //type too long
    t.throws(function () {
      var m = v.create(null, keys, hmac_key, {type:keys.id }, Date.now())
    })
    // type too short
    t.throws(function () {
      var m = v.create(null, keys, hmac_key, {type:'T' }, Date.now())
    })
    // type too short
    t.throws(function () {
      var m = v.create(null, keys, hmac_key, {type:'TT' }, Date.now())
    })
    // content too long
    t.throws(function () {
      var m = v.create(null, keys, hmac_key, crypto.randomBytes(8*1024).toString('base64')+'.box', Date.now())
    }, 'content too long')
    t.end()
  })
   
  tape('valid messages', function (t) {
    var msg

    //type must be 3 chars
    var msg = v.create(null, keys, hmac_key, {type:'TTT' }, Date.now())
    t.deepEqual(msg.content, {type: 'TTT'})

    //type can be msg id
    var msg_id = '%'+crypto.randomBytes(32).toString('base64')+'.sha256'
    msg = v.create(null, keys2, hmac_key, {type: msg_id}, +new Date('2017-04-11 9:09 UTC'))
    t.deepEqual(msg.content, {type: msg_id})

    //content can be encrypted.
    msg = v.create(null, keys2, hmac_key, ctxt, +new Date('2017-04-11 9:09 UTC'))
    t.equal(msg.content, ctxt)
    //content can be encrypted.

    //content encrypted with future private box version
    msg = v.create(null, keys2, hmac_key, ctxt+'2', +new Date('2017-04-11 9:09 UTC'))
    t.equal(msg.content, ctxt+'2')

    msg = v.create(null, keys, hmac_key, {type: 'okay'}, Date.now())
    t.deepEqual(msg.content, {type: 'okay'})

    //for backwards compatibilty reasons, we only count the
    //javascript string length of a message, so it may actually
    //be encoded as longer that 8k, if it uses unicode.

    //so a message with 7000 euro signs is valid, even though
    //it is technically longer than we intended.

    //at some point, we'll introduce a binary encoding for
    //messages and we'll fix this then.
    var text = ''
    for(var i = 0; i < 7000; i++)
      text += '\u20ac'
    t.ok(text.length < 8124)
    console.log(text.length)
    console.log(new Buffer(JSON.stringify({text: text}), 'utf8').length)
    t.ok(new Buffer(JSON.stringify({text: text}), 'utf8').length > 8000)
    msg = v.create(null, keys, hmac_key, {type: 'euros', text: text}, Date.now())
    t.deepEqual(msg.content, {type: 'euros', text: text})

    t.end()
  })

}

test()
test(hash('hmac_key'))
test(hash('hmac_key2'))






