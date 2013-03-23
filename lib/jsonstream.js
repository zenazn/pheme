"use strict";

var stream  = require('stream');
var util    = require('util');
var yajl    = require('yajl');

var JSONStream = function() {
  JSONStream.super_.call(this);

  this.handle = new yajl.Handle({
    'allowMultipleValues': true,
    'allowTrailingGarbage': true
  });
  this.stack = []; // For nested object/array creation
  this.queue = []; // Buffer for returned objects
  this.callback = null;

  var push = this.__push.bind(this), pop = this.__pop.bind(this);
  var callbacks = {
    'startMap': function() { push({}); },
    'endMap': pop,
    'startArray': function() { push([]); },
    'endArray': pop,
    'mapKey': push,
    'null': function() { push(null); },
    'boolean': push,
    'integer': function(el) { push(Number(el)); },
    'double': function(el) { push(Number(el)); },
    'number': function(el) { push(Number(el)); },
    'string': push
  };
  for (var event in callbacks) {
    this.handle.on(event, callbacks[event]);
  }

  this.on('finish', function() {
    this.handle.completeParse();
    this.handle = null;
    this.emit('close');
  }.bind(this));
};
util.inherits(JSONStream, stream.Writable);

// Transform methods
JSONStream.prototype._write = function(chunk, encoding, cb) {
  this.handle.parse(chunk);
  if (this.queue.length == 0) {
    cb();
  } else {
    this.callback = cb;
  }
};

JSONStream.prototype.__push = function(el) {
  var s = this.stack;
  if (s.length == 0) {
    if (typeof el == 'object' && el !== null) {
      s.push(el);
    } else {
      this.queue.push(el);
      this.emit('data', el);
    }
    return;
  }
  if (typeof s[s.length - 1] == 'string') {
    var key = s.pop();
    if (typeof s[s.length - 1] != 'object' || Array.isArray(s[s.length - 1])) {
      throw new Error('JSONStream stack invariant not met');
    }
    s[s.length - 1][key] = el;
  } else if (Array.isArray(s[s.length - 1])) {
    s[s.length - 1].push(el);
  } else if (typeof el == 'string') {
    s.push(el);
  } else {
    throw new Error('JSONStream stack invariant not met');
  }

  // Container types (both, helpfully, are 'object's) can have children.
  // Unfortunately, null is also an object. Because WTF.
  if (typeof el == 'object' && el !== null) {
    s.push(el);
  }
};
JSONStream.prototype.__pop = function() {
  var el = this.stack.pop();
  if (this.stack.length == 0) {
    this.queue.push(el);
    this.emit('data', el);
  }
};

JSONStream.prototype.read = function() {
  var el = this.queue.shift();
  if (this.queue.length <3 && this.callback != null) { // <3
    var cb = this.callback;
    this.callback = null;
    cb();
  }
  return el;
};
JSONStream.prototype.peek = function() {
  return this.queue[0];
};

module.exports = JSONStream;
