
var tape = require('tape')
var v = require('../')

var data = require('./data/test_messages.json')

data.forEach(function (e,i) {
  if(e.valid)
    tape('test valid message:'+i, function (t) {
      var state = {feeds: {}, queue: []}
      state.feeds[e.msg.author] = e.state
      v.validate(state, e.cap, e.msg)
      t.end()
    })
  else
    tape('test valid message:'+i, function (t) {
      var state = {feeds: {}, queue: []}
      state.feeds[e.msg.author] = e.state
      t.throws(function () {
        try {
          state = v.append(state, e.cap, e.msg)
          console.log(e)
        } catch(err) {
          throw err
        }
      })
      t.end()
    })

})


