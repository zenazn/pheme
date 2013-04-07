"use strict";

var fs          = require('fs');
var OAuth       = require('oauth').OAuth;
var JSONStream  = require('lib/jsonstream');
var sandbox     = require('lib/sandbox');

var TwitterStream = function(twitter, socket) {
  this.twitter = twitter;
  this.socket = socket;

  socket.on('request_token', this.request_token.bind(this));
  socket.on('verify', this.verify.bind(this));
  socket.on('authenticate', this.authenticate.bind(this));
  socket.on('stream', this.stream.bind(this));
  socket.on('close', this.close.bind(this));
};

TwitterStream.prototype.request_token = function() {
  var socket = this.socket;
  this.twitter.getOAuthRequestToken(function(err, token, secret, results) {
    if (err) throw err;
    socket.emit('token', {
      token: token,
      secret: secret,
      url: 'https://api.twitter.com/oauth/authorize?oauth_token=' + token
    });
  });
};
TwitterStream.prototype.verify = function(req_token, req_secret, verifier) {
  var that = this;

  if (typeof req_token != 'string' || typeof req_secret != 'string' ||
      typeof verifier != 'string') {
    throw new TypeError('You must supply a token, secret, and verifier');
  }
  this.twitter.getOAuthAccessToken(
    req_token,
    req_secret,
    verifier,
    function(err, token, secret) {
      if (err) throw err;
      that.socket.emit('credentials', {
        token: token,
        secret: secret
      });
      that.token = token;
      that.secret = secret;
    }
  );
};
TwitterStream.prototype.authenticate = function(token, secret) {
  if (typeof token != 'string' || typeof secret != 'string') {
    throw new TypeError('You must supply both a token and a secret!');
  }
  this.token = token;
  this.secret = secret;
};

TwitterStream.prototype.stream = function(options) {
  if (typeof this.token != 'string') {
    throw new Error('You need to authenticate first!');
  }
  var that = this;
  for (var key in options) {
    if (['follow', 'track', 'locations'].indexOf(key) == -1) {
      delete options[key];
    }
  }
  if (Object.keys(options).length == 0) {
    throw new TypeError('You must provide one of follow, track, and locations');
  }

  this.close();
  this.tweets = this.twitter.post(
    'https://stream.twitter.com/1.1/statuses/filter.json',
    this.token,
    this.secret,
    options
  );

  this.tweets.on('response', function(response) {
    if (response.statusCode != 200) {
      throw new Error("What's going on?");
      that.close();
    }
    var json = response.pipe(new JSONStream());
    json.on('data', function(item) {
      that.socket.emit('data', json.read());
    });
    json.on('close', function() {
      that.socket.emit('close');
    });
  });

  // This signals that the request is ready to send, not that the stream has
  // or should be ended
  this.tweets.end();
};

TwitterStream.prototype.close = function() {
  if (this.tweets != null) {
    this.tweets.abort();
    this.tweets = null;
  }
}
TwitterStream.prototype.disconnect = function() {
  this.close();
};

module.exports = function(app, io, settings) {
  var twitter = new OAuth(
    'https://twitter.com/oauth/request_token',
    'https://twitter.com/oauth/access_token',
    settings.consumer_key,
    settings.consumer_secret,
    '1.0A',
    settings.callback_url,
    'HMAC-SHA1'
  );

  // We want to make the server completely stateless, so we end up doing quite a
  // bit of the oauth flow on the client side.
  app.get('/twitter/callback', function(req, res) {
    var verifier = {
      token: req.query.oauth_token,
      verifier: req.query.oauth_verifier
    };
    // This is an abomination.
    res.send([
      "<script>",
      "localStorage.verifier = JSON.stringify(" + JSON.stringify(verifier) + ");",
      "window.close()",
      "</script>"
    ].join('\n'));
  });

  io.of('/twitter').on('connection', function(socket) {
    sandbox.io(socket, function() {
      return new TwitterStream(twitter, socket);
    });
  });
};
