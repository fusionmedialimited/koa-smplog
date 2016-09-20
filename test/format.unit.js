require('chai').should()
var test = require('ava').test

var log = require('..')

test('format_time should format times less than 10s as ms', function (t) {
  var start = Date.now() - 1000
  var time = log.format_time(start)
  time.should.contain('ms')
})

test('format_time should format times greater than 10s as s', function (t) {
  var start = Date.now() - 30000
  var time = log.format_time(start)
  time.should.contain('s')
  time.should.not.contain('ms')
})

test('format_length should return an empty string for statuses 204, 205, 304', function (t) {
  [ 204, 205, 304 ].forEach((status) => {
    log.format_length(10, status).should.equal('')
  })
})

test('format_length should return - for an empty length', function (t) {
  log.format_length(null, 500).should.equal('-')
})

test('format_length should format lengths as human-readable bytes', function (t) {
  log.format_length(1380542, 200).should.equal('1.32MB')
})

test('format_error should format errors as JSON objects', function (t) {
  var err = new Error('error test')
  err.name = 'TypedError'
  err.sub = 'value'

  var formatted = log.format_error(err)
  formatted.name.should.equal('TypedError')
  formatted.sub.should.equal('value')
  formatted.message.should.equal('error test')
})

test('format_error should resolve absolute paths in error stacks', function (t) {
  try {
    var err = new Error('error test')
    throw err
  } catch (e) {
    err = e
  }

  var formatted = log.format_error(err)
  formatted.stack.should.equal(`Error: error test
    at Test.fn (./test/format.unit.js:46:15)
    at Test._run (./node_modules/ava/lib/test.js:98:14)
    at Test.run (./node_modules/ava/lib/test.js:146:17)
    at Sequence.run (./node_modules/ava/lib/sequence.js:39:30)
    at Concurrent._runTest (./node_modules/ava/lib/concurrent.js:55:20)
    at Array.map (native)
    at Concurrent.run (./node_modules/ava/lib/concurrent.js:34:24)
    at Sequence.run (./node_modules/ava/lib/sequence.js:39:30)
    at Sequence.run (./node_modules/ava/lib/sequence.js:39:30)
    at Runner.run (./node_modules/ava/lib/runner.js:207:54)
    at process.<anonymous> (./node_modules/ava/index.js:88:10)
    at emitOne (events.js:90:13)
    at process.emit (events.js:182:7)
    at processEmit [as emit] (./node_modules/nyc/node_modules/signal-exit/index.js:146:32)
    at process.<anonymous> (./node_modules/ava/lib/test-worker.js:116:10)
    at emitTwo (events.js:100:13)
    at process.emit (events.js:185:7)
    at processEmit [as emit] (./node_modules/nyc/node_modules/signal-exit/index.js:146:32)
    at handleMessage (internal/child_process.js:718:10)
    at Pipe.channel.onread (internal/child_process.js:444:11)`)
})
