var ref = require('ssb-ref')
var ssbKeys = require('ssb-keys')

exports.checkInvalid = function (state, msg) {
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

exports.append = function (state, msg) {
  if(state.error = exports.checkInvalid(state.feeds[msg.author], msg)) {
    return state
  }

  if(state.feeds[msg.author]) {
    var a = state.feeds[msg.author]
    a.id = exports.id(msg)
    a.sequence = msg.sequence
    a.timestamp = msg.timestamp
  }
  else
    state.feeds[msg.author] = {id: exports.id(msg), sequence: msg.sequence, timestamp: msg.timestamp}
  state.queue.push(msg)
  return state
}

//pass in your own timestamp, so it's completely deterministic
exports.create = function (keys, hmac_key, state, content, timestamp) {
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




