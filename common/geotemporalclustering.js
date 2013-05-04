if (typeof define !== 'function') { var define = require('amdefine')(module) }

define([
  'common/clustering',
  'common/geotemporalneighborhood',
  'common/neighborhood',
  'common/geotemporalset'
], function(Clustering, GeoTemporalNeighborhood, Neighborhood, GeoTemporalSet) {
  "use strict";

  var GeoTemporalClustering = Clustering.extend({
    init: function(metric, max_distance, max_time, threshold) {
      var gtn = new GeoTemporalNeighborhood(metric, max_distance, max_time);
      this._super(gtn, threshold);
    },
    push: function(point) {
      if (!(point instanceof GeoTemporalSet)) {
        throw new TypeError("Expected a GeoTemporalSet");
      }
      return this._super(point);
    }
  });

  return GeoTemporalClustering;
});
