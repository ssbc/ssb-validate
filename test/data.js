
var tape = require('tape')
var v = require('../')

var data = require('./data/test_messages.json')
data.forEach(function (e,i) {
  if(e.valid)
    tape('test valid message:'+i, function (t) {
      var state = {feeds: {}, queue: []}
      state.feeds[e.msg.author] = e.state
      t.equal(v.id(e.msg), e.id)
      v.append(state, e.cap, e.msg)
      t.end()
    })
  else
    tape('test valid message:'+i, function (t) {
      var state = {feeds: {}, queue: []}
      state.feeds[e.msg.author] = e.state
      t.throws(function () {
          state = v.append(state, e.cap, e.msg)
          console.log(e)
      })
      t.end()
    })
})


var invalid = require('./data/invalid_messages.json')
invalid.forEach((message, messageIndex) => {
  tape(`test invalid message (${messageIndex})`, (t) => {
    t.plan(1)
    console.log(message)
    var state = {feeds: {}, queue: []}
    t.throws(function () {
      v.append(state, null, message)
    })
    t.end()
  })
})
