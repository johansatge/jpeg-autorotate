
'use strict'

var m = function(code, message)
{
    this.code = code
    this.message = message
    this.stack = (new Error()).stack
}
m.prototype = Object.create(Error.prototype)
m.prototype.constructor = m

module.exports = m
