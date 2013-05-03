"use strict";

var stream  = require('stream');
var util    = require('util');

// Note: this discards lines
function Lines() {
  Lines.super_.call(this);
  this.buf = "";
  this.first = true;
}
util.inherits(Lines, stream.Transform);

Lines.prototype._transform = function(chunk, encoding, cb) {
  this.buf += chunk;
  if (this.first && this.buf.indexOf('\n') >= 0) {
    this.buf = this.buf.slice(this.buf.indexOf('\n') + 1);
    this.first = false;
  }
  while (this.buf.indexOf('\n') >= 0) {
    this.push(this.buf.slice(0, this.buf.indexOf('\n')));
    this.buf = this.buf.slice(this.buf.indexOf('\n') + 1);
  }
  cb();
};

module.exports = Lines;
