if (typeof define !== 'function') { var define = require('amdefine')(module) }

define([
  'common/geotemporalclustering'
], function(GeoTemporalClustering) {
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
      this._super(metric, MAX_DIST, MAX_TIME, CLUSTER_SIZE);
    }
  });

  return PhemeClustering;
});
