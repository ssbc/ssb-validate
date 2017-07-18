var validate = require('./')
var pull = require('pull-stream')
var state = {
  queue: [],
  feeds: {},
  error: null
}
require('ssb-client')(function (err, sbot) {
  var c = 0, _c = 0, e = 0, d = 0, q = 0, ts = Date.now(), start = Date.now()

  function log () {
    if(Date.now() > ts + 1000) {
      var s = (ts - start)/1000
      console.log(c, c - _c, d, e, q, c / s, s)
      _c = c
      d = 0
      ts = Date.now()
    }
  }

  var author = null

  pull(
    sbot.createLogStream(),
    pull.drain(function (data) {
      if(author && data.value.author != author && state.feeds[author].queue.length > 20) {
        q -= state.feeds[author].queue.length
        state = validate.validate(state, author)
        state = validate.queue(state, data.value)
        q++
      }
      else {
        q++
        state = validate.queue(state, data.value)
      }

      author = data.value.author

      if(state.error) {
        e++
        console.log(state.error)
        state.error = null
      }
      else if(state.queue.length)
        d += JSON.stringify(state.queue.shift(), null, 2).length //can gc it
      log()
      c++
    }, function () {
      for(var k in state.feeds) {
        if(state.feeds[k].queue.length)
          validate.validate(state, k)
        log()
      }
    })
  )

})










