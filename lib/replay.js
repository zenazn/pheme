"use strict";

var events      = require('events');
var fs          = require('fs');
var util        = require('util');
var JSONStream  = require('./jsonstream');
var sandbox     = require('./sandbox');

// We delay our recorded feeds by their created_at timestamp, so they appear as
// if they are appearing in real-time.
// This is sort of like a typed old-style stream. I *could* make it like a typed
// new-style stream, but this file is also the only consumer, so "meh."
var TimedEmitter = function(path) {
  var stream = fs.createReadStream(path).pipe(new JSONStream());

  var timer_set = false, most_recent = null, closed = false, that = this;
  var next = function() {
    var item = stream.read(), peek;
    if (item == null && closed) {
      that.emit('close');
      return;
    }
    that.emit('data', item);
    most_recent = new Date(item.created_at);

    while ((peek = stream.peek())) { // Intentional =
      var peek_date = new Date(peek.created_at);
      // Lots of tweets get published every second, and we should publish them
      // all at once (or rather, everything within a 50ms grace period)
      if (peek_date - most_recent < 50) {
        that.emit('data', stream.read());
      } else {
        timer_set = true;
        setTimeout(next, peek_date - most_recent);
        return;
      }
    }
    timer_set = false;
  };

  stream.on('data', function() {
    if (timer_set) return;
    var peek_date = new Date(stream.peek().created_at);
    if (most_recent == null || peek_date - most_recent < 50) {
      next();
    } else {
      timer_set = true;
      setTimeout(next, peek_date - most_recent);
    }
  });
  stream.on('close', function() {
    closed = true;
  });
};
util.inherits(TimedEmitter, events.EventEmitter);

var Replay = function(socket) {
  this.socket = socket;

  socket.on('load', this.load.bind(this));
  socket.on('stop', this.stop.bind(this));
};
Replay.root = fs.realpathSync(__dirname + '/../traces');

Replay.prototype.load = function(name) {
  var socket = this.socket;

  if (typeof name != 'string') {
    throw new TypeError('Function load_data expects a string argument');
  }
  // Security! We has it! (sort of)
  if (name.indexOf('/') != -1 || name.indexOf('..') != -1) {
    throw new TypeError('No funny business in the name please');
  }
  // I'm not quite sure what situations would bypass the case above but get
  // caught by this case, but I suppose it's better to be safe than sorry...
  fs.realpath(__dirname + '/../traces/' + name, function(err, path) {
    if (err) throw err;
    if (path.indexOf(Replay.root) != 0) {
      throw new TypeError('No haxxor plz');
    }
    var t = new TimedEmitter(path);
    t.on('data', function(item) {
      socket.emit('data', item);
    });
    t.on('close', function() {
      socket.emit('close');
    });

  }.bind(this));
};
Replay.prototype.stop = function() {
  // XXX: idk
};
Replay.prototype.disconnect = function() {
  // XXX: idk
};

module.exports = function(app, io) {
  app.get('/replay', function(req, res) {
    res.type('text/plain');
    fs.readdir(Replay.root, function(err, dir) {
      res.send(dir.join('\n'));
    });
  });
  io.of('/replay').on('connection', function(socket) {
    sandbox.io(socket, function() {
      return new Replay(socket);
    });
  });
};
