"use strict";

var util    = require('util');
var events  = require('events');

var PhemeClustering = require('../common/phemeclustering');

function StreamClusterer(json) {
  this.json = json;

  this.clustering = new PhemeClustering();
  this.clusters = {};

  // Only cluster once every 10 seconds
  var t = setInterval(this.cluster.bind(this), 10000);

  json.on('data', this.addTweet.bind(this));
  json.on('close', function() {
    clearInterval(t);
  });
}
util.inherits(StreamClusterer, events.EventEmitter);

StreamClusterer.prototype.addTweet = function(tweet) {
  this.clustering.push(this.json.read());
};

StreamClusterer.prototype.cluster = function() {
  var oldc = this.clusters, newc = {};
  var clusters = this.clustering.clusters(), that = this;
  clusters.forEach(function(cluster) {
    newc[cluster.id] = cluster.points.length;
    if (cluster.id in oldc && oldc[cluster.id] != cluster.points.length) {
      that.emit('cluster_updated', cluster);
    } else if (!(cluster.id in oldc)) {
      that.emit('cluster_added', cluster);
    }
    delete oldc[cluster.id];
  });
  Object.keys(oldc).forEach(function(id) {
    that.emit('cluster_deleted', id);
  });
  this.clusters = newc;
};

module.exports = StreamClusterer;
