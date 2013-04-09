"use strict";

var fs      = require('fs');
var express = require('express');
var twitter = require('./lib/twitter');
var replay  = require('./lib/replay');

var settings = JSON.parse(fs.readFileSync('secrets.json'));

var app = express();
app.use(express.logger());
app.use(express.static(__dirname + '/public'));
app.use(express.cookieParser(settings.cookie_secret));
app.get('/', function(req, res) {
  res.sendfile(__dirname + '/public/index.html');
});

var server  = require('http').createServer(app);
var io      = require('socket.io').listen(server);
server.listen(3000);
[twitter, replay].forEach(function(service) {
  service(app, io, settings);
});
