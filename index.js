var Log = require('smplog')
var assign = require('object-assign')
var Counter = require('passthrough-counter')
var humanize = require('humanize-number')
var bytes = require('bytes')
var chalk = require('chalk')
var uid = require('uid')
var flat = require('flat')
var path = require('path')
var parse = require('url').parse
var request_intercept = require('request-middleware-framework')
var request = require('request')
var Promise = require('bluebird')
var pkg = require('./package.json')

var colorCodes = {
  5: 'red',
  4: 'yellow',
  3: 'cyan',
  2: 'green',
  1: 'green'
}

module.exports = function (defaults, options) {
  defaults = defaults || {}
  options = options || {}

  return function * (next) {
    var start = Date.now()
    var ctx = this
    var res = this.res

    if (this.log) {
      var parent = this.log

      // Patch log for subsequent middleware with blackhole logger if request should be filtered
      if (options.filter && !options.filter(ctx)) {
        this.log = Log({}, { log: () => {} })
      } else {
        this.log.tag(defaults)
      }
      yield next

      // Unpatch log
      this.log = parent
    } else {
      // Setup trace id
      this.smplog_trace = this.smplog_trace ||
        this.get('x-smplog-trace') ||
        (Date.now() + uid(8))

      // Initialize log with blackhole logger if request should be filtered
      if (options.filter && !options.filter(ctx)) {
        this.log = Log({}, { log: () => {} })
      } else {
        this.log = Log(assign({ smplog_trace: this.smplog_trace }, defaults), options)
      }

      // Attach request client to log
      var client = request_intercept(request)
      client.use(request_interceptor(this.log))
      this.log.request = client.getMiddlewareEnabledRequest().defaults({
        json: true,
        headers: {
          'x-smplog-trace': this.smplog_trace,
          'user-agent': `smplog client v${pkg.version} - ${JSON.stringify(defaults)}`
        }
      })
      Promise.promisifyAll(this.log.request)

      // Add tags functionality
      this.log._tags = {}
      this.log.tag = (data) => assign(this.log._tags, data)

      // Log request-start event
      var arrow = chalk.gray('<--')
      var method = chalk.bold(this.method)
      var url = this.originalUrl.split('?')[0]
      var ip = this.ip.split(':').filter((i) => ~i.indexOf('.')).join('')
      var user_agent = this.get('user-agent')
      var referrer = this.get('referer') || this.get('referrer')

      var log_info = { event: 'request-start', method: this.method, url }
      if (ip) log_info.ip = ip
      if (user_agent) log_info.user_agent = user_agent
      if (referrer) log_info.referrer = referrer

      if (options.incoming) {
        this.log.info(`  ${arrow} ${method} ${url}`, log_info)
      }

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
      var onfinish = done.bind(null, 'finish')
      var onclose = done.bind(null, 'close')

      res.once('finish', onfinish)
      res.once('close', onclose)
    }

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
  var url = ctx.originalUrl.split('?')[0]
  var code = chalk[color](status)
  var duration = chalk.dim(format_time(start))
  var size = chalk.dim(length)
  var ip = ctx.ip.split(':').filter((i) => ~i.indexOf('.')).join('')
  var user_agent = ctx.get('user-agent')
  var referrer = ctx.get('referer') || ctx.get('referrer')

  var level = status < 400 ? 'info' : (status < 500 ? 'warn' : 'error')

  var log_info = {
    event: 'request-end',
    method: ctx.method,
    url: url,
    status_code: status,
    response_time_ms: Date.now() - start,
    response_size_bytes: len || 0
  }
  if (referrer) log_info.referrer = referrer
  if (user_agent) log_info.user_agent = user_agent
  if (ip) log_info.ip = ip

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

// Log outgoing requests
var request_interceptor = module.exports.request_interceptor = (log) => function (options, callback, next) {
  var start = Date.now()
  var trace = options.headers['x-smplog-trace']
  var parsed = parse(options.uri)
  var queryless = `${parsed.protocol}//${parsed.host}${parsed.pathname}`

  var _callback = function (err, response, body) {
    var status = err
      ? (err.status || 500)
      : (response.statusCode || 404)
    var s = status / 100 | 0
    var color = colorCodes[s]
    var len = response && response.headers ? (response.headers['content-length'] || 0) : 0
    var length = format_length(+len, status)
    var arrow = err ? chalk.red('xxx') : chalk.gray('<->')
    var method = chalk.bold.dim(options.method)
    var code = chalk[color].dim(status)
    var duration = chalk.dim(format_time(start))
    var size = chalk.dim(length)

    var msg = `      ${arrow} ${method} ${chalk.dim(queryless)} ${code} ${duration} ${size}`
    var meta = {
      event: 'nested-request',
      smplog_trace: trace,
      method: options.method,
      url: queryless,
      status_code: status,
      response_time_ms: Date.now() - start,
      response_size_bytes: +len || 0
    }
    log.info(msg, meta)

    callback(err, response, body)
  }
  next(options, _callback)
}
