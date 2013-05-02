if (typeof define !== 'function') { var define = require('amdefine')(module) }

define([
  'common/latlon',
  'common/geotemporalset',
  'common/geotemporalclustering',
  'common/clusterquality'
], function(LatLon, GeoTemporalSet, GeoTemporalClustering, Q) {
  "use strict";

  var MAX_TIME = 30 * 60 * 1000; // milliseconds
  var MAX_DIST = 250; // meters
  var CLUSTER_SIZE = 3;

  var metric = function(a, b) {
    // TODO: better metric
    if (Math.abs(a.time - b.time) > MAX_TIME) {
      return false;
    }
    if (a.pos.distance(b.pos) > MAX_DIST) {
      return false;
    }
    return true;
  };

  var PhemeClustering = GeoTemporalClustering.extend({
    init: function() {
      this._super(metric, 400 * MAX_DIST, MAX_TIME, CLUSTER_SIZE);
    },
    push: function(tweet) {
      if (!tweet.coordinates) return;
      var time = new Date(tweet.created_at);
      var coords = tweet.coordinates.coordinates;
      var pos = new LatLon(coords[1], coords[0]);

      var point = new GeoTemporalSet(time, pos, tweet);
      this._super(point);

      return point;
    },
    clusters: function() {
      return Q.filter(this._super());
    }
  });

  return PhemeClustering;
});
