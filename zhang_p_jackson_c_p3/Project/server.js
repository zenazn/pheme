"use strict";

var fs          = require('fs');
var express     = require('express');
var twitter     = require('./lib/twitter');
var replay      = require('./lib/replay');
var JSONStream  = require('./lib/jsonstream');
var smaller     = require('./lib/smaller');

var settings = JSON.parse(fs.readFileSync('secrets.json'));

var app = express();
app.use(express.logger());
app.use(express.static(__dirname + '/public'));
app.use(express.cookieParser(settings.cookie_secret));
app.get('/', function(req, res) {
  res.sendfile(__dirname + '/public/index.html');
});

app.get('/traces', function(req, res) {
  fs.readdir(__dirname + '/traces', function(err, files) {
    res.send(files);
  });
});
app.get('/raw/:name.json', function(req, res) {
  var s = fs.createReadStream(__dirname + '/traces/' + req.params.name + '.json');
  var j = new JSONStream();
  s.pipe(j);
  j.on('data', function() {
    var tweet = j.read();
    smaller(tweet);
    res.write(JSON.stringify(tweet));
    res.write('\n');
  });
  j.on('close', function() {
    res.end();
  });
});
app.get('/traces/:name.json', function(req, res) {
  var s = fs.createReadStream(__dirname + '/traces/' + req.params.name + '.json');
  var j = new JSONStream();
  s.pipe(j);
  res.write('[');
  j.on('data', function() {
    var tweet = j.read();
    res.write(JSON.stringify(tweet));
    res.write(',\n');
  });
  j.on('close', function() {
    res.end('{}]');
  });
});

var server  = require('http').createServer(app);
var io      = require('socket.io').listen(server);
server.listen(3000);
[twitter, replay].forEach(function(service) {
  service(app, io, settings);
});
