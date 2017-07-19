var ref = require('ssb-ref')
var ssbKeys = require('ssb-keys')

exports.initial = function () {
  return {
    queue: [],
    feeds: {},
    error: null
  }
}

exports.checkInvalidCheap = function (state, msg) {
  //the message is just invalid
  if(!ref.isFeedId(msg.author))
    return new Error('invalid message: must have author')

  //state is id, sequence, timestamp
  if(state) {
    //the message is possibly a fork, but only if the signature is valid.
    if(msg.sequence != state.sequence + 1)
      return new Error('invalid message: expected sequence ' + (state.sequence + 1) + ' but got:'+ msg.sequence + 'in state:'+JSON.stringify(state))
    if(msg.timestamp <= state.ts)
      return new Error('invalid message: timestamp not increasing')
    if(msg.previous != state.id)
      return new Error('invalid message: expected different previous message')
    //and check type, and length, and some other stuff. finaly check the signature.
  }
  else {
    if(msg.previous !== null)
      return new Error('initial message must have previous: null')
    if(msg.sequence !== 1)
      return new Error('initial message must have sequence: 1')
    if('number' !== typeof msg.timestamp)
      return new Error('initial message must have timestamp')
  }
}

exports.checkInvalid = function (state, msg) {
  var err = exports.checkInvalidCheap(state, msg)
  if(err) return err
  if(!ssbKeys.verifyObj({public: msg.author.substring(1)}, msg))
    return new Error('invalid signature')
  return false //not invalid
}

/*
{
  //an array of messages which have been validated, but not written to the database yet.
  valid: [],
  //a map of information needed to know if something should be appeneded to the valid queue.
  feeds: {
    <feed>: {id, sequence, ts}
  },
  error: null
}
*/

exports.queue = function (state, msg) {
  var err
  if(state.error = exports.checkInvalidCheap(flatState(state.feeds[msg.author]), msg))
    return state
  state.feeds[msg.author] = state.feeds[msg.author] || {
    id: null, sequence: null, timestamp: null, queue: []
  }
  state.feeds[msg.author].queue.push(msg)
  return state
}

function flatState (fstate) {
  if(!fstate) return null
  if(fstate.queue.length) {
    var last = fstate.queue[fstate.queue.length - 1]
    return {
      id: exports.id(last),
      timestamp: last.timestamp,
      sequence: last.sequence
    }
  }
  else
    return fstate
}

exports.append = function (state, msg) {
  if(state.error = exports.checkInvalid(flatState(state.feeds[msg.author]), msg))
    return state

  else if(state.feeds[msg.author]) {
    var a = state.feeds[msg.author]
    a.id = exports.id(msg)
    a.sequence = msg.sequence
    a.timestamp = msg.timestamp
    var q = state.feeds[msg.author].queue
    while(q.length)
      state.queue.push(q.shift())
  }
  else
    state.feeds[msg.author] = {id: exports.id(msg), sequence: msg.sequence, timestamp: msg.timestamp, queue: []}

  state.queue.push(msg)
  return state
}

exports.validate = function (state, feed) {
  if(!state.feeds[feed] || !state.feeds[feed].queue.length) {
    return state
  }
  var msg = state.feeds[feed].queue.pop()
  return exports.append(state, msg)
}

//pass in your own timestamp, so it's completely deterministic
exports.create = function (keys, hmac_key, state, content, timestamp) {
  state = flatState(state)
  return ssbKeys.signObj(keys, hmac_key, {
    previous: state ? state.id : null,
    sequence: state ? state.sequence + 1 : 1,
    author: keys.id,
    timestamp: timestamp,
    hash: 'sha256',
    content: content,
  })
}

exports.id = function (msg) {
  return '%'+ssbKeys.hash(JSON.stringify(msg, null, 2))
}

exports.appendNew = function (state, hmac_key, keys, content, timestamp) {
  var msg = exports.create(keys, hmac_key, state.feeds[keys.id], content, timestamp)
  state = exports.append(state, msg)
  return state
}



