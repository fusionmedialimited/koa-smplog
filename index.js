var Log = require('smplog')
var assign = require('object-assign')
var Counter = require('passthrough-counter')
var humanize = require('humanize-number')
var bytes = require('bytes')
var chalk = require('chalk')
var uid = require('uid')
var flat = require('flat')
var path = require('path')

var colorCodes = {
  5: 'red',
  4: 'yellow',
  3: 'cyan',
  2: 'green',
  1: 'green'
}

module.exports = function (defaults, options) {
  return function * (next) {
    var start = Date.now()

    // Setup request trace id
    this.trace_id = this.trace_id ||
      this.get('x-request-trace') ||
      (Date.now() + uid(8))

    // Initialize log
    this.log = Log(assign({ trace: this.trace_id }, defaults), options)
    this.log._tags = {}
    this.log.tag = (data) => assign(this.log._tags, data)

    // Log request-start event
    var arrow = chalk.gray('<--')
    var method = chalk.bold(this.method)
    var url = chalk.gray(this.originalUrl)
    this.log.info(`  ${arrow} ${method} ${url}`, { event: 'request-start' })

    try {
      yield next
    } catch (err) {
      // Log uncaught downstream errors
      out(this, start, null, err)
      throw err
    }

    // calculate the length of a streaming response
    // by intercepting the stream with a counter.
    // only necessary if a content-length header is currently not set.
    var length = this.response.length
    var body = this.body
    var counter
    if (length == null && body && body.readable) {
      this.body = body
        .pipe(counter = Counter())
        .on('error', this.onerror)
    }

    // log when the response is finished or closed,
    // whichever happens first.
    var ctx = this
    var res = this.res

    var onfinish = done.bind(null, 'finish')
    var onclose = done.bind(null, 'close')

    res.once('finish', onfinish)
    res.once('close', onclose)

    function done (event) {
      res.removeListener('finish', onfinish)
      res.removeListener('close', onclose)
      out(ctx, start, counter ? counter.length : length, null, event)
    }
  }
}

function out (ctx, start, len, err, event) {
  var status = err
    ? (err.status || 500)
    : (ctx.status || 404)
  var s = status / 100 | 0
  var color = colorCodes[s]
  var length = format_length(len, status)

  var arrow = err ? chalk.red('xxx')
    : event === 'close' ? chalk.yellow('-x-')
    : chalk.gray('-->')
  var method = chalk.bold(ctx.method)
  var url = chalk.gray(ctx.originalUrl)
  var code = chalk[color](status)
  var duration = chalk.gray(format_time(start))
  var size = chalk.gray(length)

  var level = status < 400 ? 'info' : (status < 500 ? 'warn' : 'error')

  var log_info = {
    event: 'request-end',
    method: ctx.method,
    url: ctx.originalUrl,
    status_code: status,
    response_time_ms: Date.now() - start,
    response_size_bytes: len || 0
  }

  if (err) { log_info.error = format_error(err) }

  ctx.log[level](`  ${arrow} ${method} ${url} ${code} ${duration} ${size}`, assign(log_info, ctx.log._tags))
}

var format_time = module.exports.format_time = function (start) {
  var delta = Date.now() - start
  delta = delta < 10000
    ? delta + 'ms'
    : Math.round(delta / 1000) + 's'
  return humanize(delta)
}

var format_length = module.exports.format_length = function (len, status) {
  var length
  if (~[204, 205, 304].indexOf(status)) {
    length = ''
  } else if (len == null) {
    length = '-'
  } else {
    length = bytes(len)
  }
  return length
}

var format_error = module.exports.format_error = function (err) {
  var obj = flat(err)
  obj.name = err.name
  obj.message = err.message
  /* istanbul ignore else */
  if (err.stack) {
    var rootdir = __dirname.split(path.sep)
    var base = rootdir.indexOf('node_modules')
    rootdir = rootdir.slice(0, base >= 0 ? base : rootdir.length).join(path.sep)
    obj.stack = err.stack.replace(new RegExp(rootdir, 'g'), '.')
  }
  return obj
}
