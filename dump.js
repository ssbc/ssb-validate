var validate = require('./')
var pull = require('pull-stream')
var state = {
  queue: [],
  feeds: {},
  error: null
}
require('ssb-client')(function (err, sbot) {
  var c = 0, _c = 0, e = 0, d = 0, ts = Date.now()
  pull(
    sbot.createLogStream(),
    pull.drain(function (data) {
      state = validate.append(state, data.value)
      if(state.error) {
        e++
        console.log(state.error)
        state.error = null
      }
      else
        d += JSON.stringify(state.queue.shift(), null, 2).length //can gc it
      c++
      if(Date.now() > ts + 1000) {
        console.log(c, c - _c, d, e)
        _c = c
        d = 0
        ts = Date.now()
      }
    })
  )

})
