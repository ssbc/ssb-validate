var tape = require('tape')
var ssbKeys = require('ssb-keys')
var crypto = require('crypto')
var path = require('path')
var fs = require('fs')

function hash (seed) {
  return crypto.createHash('sha256').update(seed).digest()
}

var keys = ssbKeys.generate('ed25519', hash('validation-test-seed1'))
var keys2 = ssbKeys.generate('ed25519', hash('validation-test-seed2'))


//generate randomish but deterministic test data.
//this is not intended for security use.
//use a proper key stream (etc) instead.
function pseudorandom (seed, length) {
  var a = []
  for(var l = 0; l < length; l += 32)
    a.push(hash(''+seed+l))
  return Buffer.concat(a).slice(0, length)
}

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
      timestamp: last.timestamp-(7*60*60*1000), queue: []
    }, keys, hmac_key, {type: 'invalid'}, last.timestamp-(7*60*60*1000)+1)
    console.log(m, last)

    try {
      state = v.append(state, hmac_key, m)
      t.fail('should have thrown')
    } catch (err) {
      t.equal(err.fatal, true)
      t.end()
    }

  })

  tape('invalid - rewind but within margin', function (t) {

    var last = state.queue[9]
    var m = v.create({
      id: state.feeds[keys.id].id,
      sequence: 10,
      timestamp: last.timestamp-(5*60*60*1000), queue: []
    }, keys, hmac_key, {type: 'invalid'}, last.timestamp-(5*60*60*1000)+1)
    console.log(m, last)

    try {
      state = v.append(state, hmac_key, m)
    } catch (err) {
      console.log(err)
      t.fail('should not throw')
    }

    t.end()
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

  var ctxt =
        pseudorandom('test', 1024).toString('base64')+'.box'

  //create a purposefully invalid message (for testing)
  function create_invalid (state, keys, hmac_key, content, timestamp) {
    invalid.push(ssbKeys.signObj(keys, hmac_key, {
      previous: state ? state.id : null,
      sequence: state ? state.sequence + 1 : 1,
      author: keys.id,
      timestamp: +timestamp,
      hash: 'sha256',
      content: content,
    }))
    return v.create(state, keys, hmac_key, null, timestamp)
  }

  var invalid = []

  tape('create with invalid content', function (t) {
    var date = +new Date('2017-04-11 9:09 UTC')
    t.throws(function () {
      var m = create_invalid(null, keys, hmac_key, null, date)
    })
    t.throws(function () {
      var m = create_invalid(null, keys, hmac_key, date)
    })
    t.throws(function () {
      var m = create_invalid(null, keys, hmac_key, false, date)
    })
    t.throws(function () {
      var m = create_invalid(null, keys, hmac_key, 0, date)
    })
    t.throws(function () {
      var m = create_invalid(null, keys, hmac_key, 100, date)
    })
    t.throws(function () {
      var m = create_invalid(null, keys, hmac_key, [], date)
    }, 'array as content')
    t.throws(function () {
      var m = create_invalid(null, keys, hmac_key, new Buffer('hello'), date)
    }, 'buffer as content')
    t.throws(function () {
      var m = create_invalid(null, keys, hmac_key, new Date(date), date)
    }, 'date as content')

    t.throws(function () {
      var m = create_invalid(null, keys, hmac_key, {}, date)
    })
    t.throws(function () {
      var m = create_invalid(null, keys, hmac_key, {tyfe:'not-okay' }, date)
    })

    t.throws(function () {
      var m = create_invalid(null, keys, hmac_key, {tyfe:'not-okay' }, date)
    })

    t.throws(function () {
      var m = create_invalid(null, keys, hmac_key, {
        type: //too long!
          pseudorandom('test', 100).toString('base64')
      }, date)
    })

    //type too long
    t.throws(function () {
      var m = create_invalid(null, keys, hmac_key, {type:keys.id }, date)
    })
    // type too short
    t.throws(function () {
      var m = create_invalid(null, keys, hmac_key, {type:'T' }, date)
    })
    // type too short
    t.throws(function () {
      var m = create_invalid(null, keys, hmac_key, {type:'TT' }, date)
    })
    // content too long
    t.throws(function () {
      var m = create_invalid(
        null, keys, hmac_key,
        pseudorandom('test', 8*1024).toString('base64')+'.box',
        date
      )
    }, 'content too long')

    if(!hmac_key)
      fs.writeFileSync(path.join(__dirname, 'data', 'invalid_messages.json'), JSON.stringify(invalid, null, 2))
    t.end()
  })

  tape('valid messages', function (t) {
    var msg

    //type must be 3 chars
    var msg = v.create(null, keys, hmac_key, {type:'TTT' }, +new Date('2017-04-11 9:09 UTC'))
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


