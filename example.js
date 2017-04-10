var pull = require('pull-stream')
var v = require('./')
var state = {
  queue: [],
  feeds: {},
  error: null
}
var c = 0, e = 0, start = Date.now(), l = 0
require('ssb-client')(function (err, sbot) {
  if(err) throw err
  pull(
    sbot.createLogStream({keys: false}),
    pull.drain(function (msg) {
      state = v.append(state, msg)
      l += JSON.stringify(msg, null, 2).length
      if(state.error) {
    //    console.log(msg)
  //      console.log(state.feeds[msg.author])
        console.log(state.error.message)
        e++
      }
      state.queue.shift()
      var s = ((Date.now() - start)/1000)
      if(!(c++%100)) {
        console.log(s, e, c, c / s, l, l / s)
      }
    }, sbot.close)
  )
})




